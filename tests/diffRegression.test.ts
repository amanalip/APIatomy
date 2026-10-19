import { describe, it, expect } from 'vitest';
import { compareSpecTexts } from '../src/model/specDiff';
import { parseApiSpec } from '../src/parser';

function getSecurityDiff(oldText: string, newText: string) {
  const diff = compareSpecTexts(oldText, newText);
  return {
    ...diff,
    changed: diff.changedSecurity,
    added: diff.addedSecurity,
    removed: diff.removedSecurity,
  };
}
function getSchemaDiff(oldText: string, newText: string) {
  const diff = compareSpecTexts(oldText, newText);
  return { changed: diff.changedSchemas, added: diff.addedSchemas, removed: diff.removedSchemas };
}
function getServerDiff(oldText: string, newText: string) {
  const diff = compareSpecTexts(oldText, newText);
  return { added: diff.addedServers, removed: diff.removedServers };
}
function getGlobalDiff(oldText: string, newText: string) {
  return compareSpecTexts(oldText, newText).globalChanges;
}
function hasParseError(_spec: ReturnType<typeof parseApiSpec> | null, raw: string) {
  return compareSpecTexts(raw, raw).oldParseError;
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
    expect(changes).toContainEqual(expect.stringContaining('title:'));
    expect(changes).toContainEqual(expect.stringContaining('version:'));
  });

  it('detects tags change', () => {
    const newSpec = baseSpec.replace('- name: test', '- name: test\n  - name: extra');
    const changes = getGlobalDiff(baseSpec, newSpec);
    expect(changes).toContain('tags changed');
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
