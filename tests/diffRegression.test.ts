import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';

function getSecurityDiff(oldText: string, newText: string) {
  const oldSpec = parseApiSpec(oldText);
  const newSpec = parseApiSpec(newText);
  const oldKeys = Object.keys(oldSpec.securitySchemes);
  const newKeys = Object.keys(newSpec.securitySchemes);
  const added = newKeys.filter((k) => !(k in oldSpec.securitySchemes));
  const removed = oldKeys.filter((k) => !(k in newSpec.securitySchemes));
  const changed = newKeys.filter(
    (k) =>
      k in oldSpec.securitySchemes &&
      JSON.stringify(oldSpec.securitySchemes[k]) !== JSON.stringify(newSpec.securitySchemes[k])
  );
  return { added, removed, changed, oldSpec, newSpec };
}

function getSchemaDiff(oldText: string, newText: string) {
  const oldSpec = parseApiSpec(oldText);
  const newSpec = parseApiSpec(newText);
  const oldKeys = Object.keys(oldSpec.schemas);
  const newKeys = Object.keys(newSpec.schemas);
  const added = newKeys.filter((k) => !(k in oldSpec.schemas));
  const removed = oldKeys.filter((k) => !(k in newSpec.schemas));
  const changed = newKeys.filter(
    (k) =>
      k in oldSpec.schemas &&
      JSON.stringify(oldSpec.schemas[k]) !== JSON.stringify(newSpec.schemas[k])
  );
  return { added, removed, changed };
}

function getServerDiff(oldText: string, newText: string) {
  const oldSpec = parseApiSpec(oldText);
  const newSpec = parseApiSpec(newText);
  const oldStr = new Set(oldSpec.servers.map((s) => JSON.stringify(s)));
  const newStr = new Set(newSpec.servers.map((s) => JSON.stringify(s)));
  const added = newSpec.servers.filter((s) => !oldStr.has(JSON.stringify(s)));
  const removed = oldSpec.servers.filter((s) => !newStr.has(JSON.stringify(s)));
  return { added, removed };
}

function getGlobalDiff(oldText: string, newText: string) {
  const oldSpec = parseApiSpec(oldText);
  const newSpec = parseApiSpec(newText);
  const changes: string[] = [];
  if (oldSpec.title !== newSpec.title) changes.push('title');
  if (oldSpec.version !== newSpec.version) changes.push('version');
  if (JSON.stringify(oldSpec.tags) !== JSON.stringify(newSpec.tags)) changes.push('tags');
  if (oldSpec.description !== newSpec.description) changes.push('description');
  return changes;
}

function hasParseError(spec: ReturnType<typeof parseApiSpec> | null, raw: string) {
  if (!raw.trim()) return false;
  if (!spec) return true;
  if (spec.title === 'Invalid Spec' || spec.title === 'Parse Error') return true;
  return spec.diagnostics.some(
    (d) => d.severity === 'error' && (d.source === 'syntax' || d.id === 'parse-crash')
  );
}

const baseSpec = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
servers:
  - url: https://old.api.com
tags:
  - name: test
paths:
  /test:
    get:
      responses:
        '200':
          description: ok
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
        age:
          type: integer
      required: [name]
  securitySchemes:
    api_key:
      type: apiKey
      in: header
      name: X-API-Key
`;

describe('Diff regression', () => {
  it('detects security scheme changes', () => {
    const oldSpec = baseSpec;
    const newSpec = baseSpec
      .replace('name: X-API-Key', 'name: X-New-Key')
      .replace('type: apiKey', 'type: http');
    const { changed } = getSecurityDiff(oldSpec, newSpec);
    expect(changed).toContain('api_key');
  });

  it('detects api_key header name change', () => {
    const newSpec = baseSpec.replace('X-API-Key', 'X-Changed-Key');
    const { changed } = getSecurityDiff(baseSpec, newSpec);
    expect(changed.length).toBe(1);
  });

  it('detects Bearer OAuth scopes change', () => {
    const oldBearer = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: ok
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
`;
    const newBearer = oldBearer.replace('bearerFormat: JWT', 'bearerFormat: Opaque');
    const { changed } = getSecurityDiff(oldBearer, newBearer);
    expect(changed).toContain('bearerAuth');
  });

  it('detects schema content changes even when count same', () => {
    const newSpec = baseSpec.replace('type: string', 'type: integer');
    const { changed, added, removed } = getSchemaDiff(baseSpec, newSpec);
    expect(added.length).toBe(0);
    expect(removed.length).toBe(0);
    expect(changed).toContain('User');
  });

  it('detects required field change in schema', () => {
    const newSpec = baseSpec.replace('required: [name]', 'required: [name, age]');
    const { changed } = getSchemaDiff(baseSpec, newSpec);
    expect(changed).toContain('User');
  });

  it('detects server URL change', () => {
    const newSpec = baseSpec.replace('https://old.api.com', 'https://new.api.com');
    const { added, removed } = getServerDiff(baseSpec, newSpec);
    expect(added.length).toBe(1);
    expect(added[0].url).toBe('https://new.api.com');
    expect(removed.length).toBe(1);
    expect(removed[0].url).toBe('https://old.api.com');
  });

  it('detects global metadata title and version changes', () => {
    const newSpec = baseSpec
      .replace('title: Test API', 'title: New Title')
      .replace('version: 1.0.0', 'version: 2.0.0');
    const changes = getGlobalDiff(baseSpec, newSpec);
    expect(changes).toContain('title');
    expect(changes).toContain('version');
  });

  it('detects tags change', () => {
    const newSpec = baseSpec.replace('- name: test', '- name: test\n  - name: extra');
    const changes = getGlobalDiff(baseSpec, newSpec);
    expect(changes).toContain('tags');
  });

  it('shows parse errors instead of zero changes', () => {
    const invalid = 'openapi: 3.0.0\ninfo:\n  title: Broken\n  version: 1.0.0\npaths: [invalid';
    const valid = baseSpec;
    const oldSpec = parseApiSpec(invalid);
    const newSpec = parseApiSpec(valid);
    expect(hasParseError(oldSpec, invalid)).toBe(true);
    expect(hasParseError(newSpec, valid)).toBe(false);
    const oldHasError = hasParseError(oldSpec, invalid);
    const newHasError = hasParseError(newSpec, valid);
    expect(oldHasError || newHasError).toBe(true);
  });

  it('detects no parse error for valid specs with % in operationId', () => {
    const specWithPercent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      operationId: get%test%id
      responses:
        '200':
          description: ok
`;
    const parsed = parseApiSpec(specWithPercent);
    expect(hasParseError(parsed, specWithPercent)).toBe(false);
    expect(parsed.endpoints[0].operationId).toBe('get%test%id');
  });
});
