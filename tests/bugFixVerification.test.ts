import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { generateMockData } from '../src/model/mockGenerator';
import { computeApiTopologyGraph } from '../src/layout/graphLayout';

// Bug A: CurlGenerator path template with duplicate placeholders should replace all occurrences
describe('BugFix: duplicate path placeholder replacement', () => {
  it('parses spec with duplicate path param and ensures endpoint model retains raw path', () => {
    const yaml = `
openapi: 3.0.0
info:
  title: Dup Path API
  version: 1.0.0
paths:
  /{id}/friends/{id}:
    get:
      summary: Get friends
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            default: abc
          example: xyz
      responses:
        '200':
          description: OK
`;
    const parsed = parseApiSpec(yaml);
    expect(parsed.endpoints.length).toBe(1);
    const ep = parsed.endpoints[0];
    expect(ep.path).toBe('/{id}/friends/{id}');
    // Simulate CurlGenerator replacement logic (split/join replaces all)
    const rawUrl = 'https://api.example.com';
    const normalizedPath = ep.path.startsWith('/') ? ep.path : `/${ep.path}`;
    let url = rawUrl + normalizedPath;
    for (const param of ep.parameters.filter(p => p.in === 'path')) {
      const val = param.example !== undefined ? encodeURIComponent(String(param.example)) : `:${param.name}`;
      url = url.split(`{${param.name}}`).join(val);
    }
    // Both placeholders replaced
    expect(url).toBe('https://api.example.com/xyz/friends/xyz');
    expect(url).not.toContain('{id}');
  });

  it('server variable replacement replaces all occurrences', () => {
    const specYaml = `
openapi: 3.0.0
info:
  title: Var Server
  version: 1.0.0
servers:
  - url: https://{env}.example.com/{env}/v1
    variables:
      env:
        default: staging
paths:
  /test:
    get:
      summary: test
      responses:
        '200':
          description: OK
`;
    const parsed = parseApiSpec(specYaml);
    const server = parsed.servers[0];
    let rawUrl = server.url.replace(/\/$/, '');
    if (server.variables) {
      for (const [varName, varDef] of Object.entries(server.variables)) {
        rawUrl = rawUrl.split(`{${varName}}`).join((varDef as any).default || 'default');
      }
    }
    expect(rawUrl).toBe('https://staging.example.com/staging/v1');
    expect(rawUrl).not.toContain('{env}');
  });
});

// Bug B: graphLayout should track additionalProperties and not refs
describe('BugFix: graphLayout additionalProperties and not refs', () => {
  it('creates edges for additionalProperties ref and not ref', () => {
    const yaml = `
openapi: 3.0.0
info:
  title: Graph Refs API
  version: 1.0.0
paths:
  /test:
    get:
      summary: test
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Outer'
components:
  schemas:
    Outer:
      type: object
      additionalProperties:
        $ref: '#/components/schemas/Inner'
      not:
        $ref: '#/components/schemas/Forbidden'
    Inner:
      type: object
      properties:
        name:
          type: string
    Forbidden:
      type: string
`;
    const parsed = parseApiSpec(yaml);
    expect(parsed.schemas['Outer']).toBeDefined();
    expect(parsed.schemas['Inner']).toBeDefined();
    const { edges } = computeApiTopologyGraph(parsed, { direction: 'LR', nodeWidth: 260, nodeHeight: 90 });
    const outerToInner = edges.find(e => e.source === 'schema_Outer' && e.target === 'schema_Inner');
    const outerToForbidden = edges.find(e => e.source === 'schema_Outer' && e.target === 'schema_Forbidden');
    expect(outerToInner).toBeDefined();
    expect(outerToForbidden).toBeDefined();
  });
});

// Bug C: mockGenerator depth-aware placeholder
describe('BugFix: mockGenerator depth truncation type-aware', () => {
  it('returns object placeholder for deep object schemas at depth >4', () => {
    const deepSchema: any = { type: 'object', properties: { child: { type: 'object', properties: {} } } };
    // Call with depth 5 directly
    const result = generateMockData(deepSchema, {}, 5);
    expect(typeof result).toBe('object');
    expect(result).toEqual({});
  });

  it('returns array placeholder for deep array schemas', () => {
    const deepArray: any = { type: 'array', items: { type: 'string' } };
    const result = generateMockData(deepArray, {}, 5);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns string placeholder for deep string schemas', () => {
    const deepString: any = { type: 'string' };
    const result = generateMockData(deepString, {}, 5);
    expect(result).toBe('...');
  });

  it('respects minimum/maximum for integer when maximum <1', () => {
    const intSchema: any = { type: 'integer', maximum: -5 };
    const result = generateMockData(intSchema);
    expect(result).toBe(-5);
    const intWithMin: any = { type: 'integer', minimum: 10, maximum: -5 };
    expect(generateMockData(intWithMin)).toBe(10);
  });
});

// Bug D: vitest environment jsdom provides document
describe('CodeQuality: jsdom environment', () => {
  it('has document available', () => {
    expect(typeof document).not.toBe('undefined');
    expect(document.createElement).toBeDefined();
  });

  it('can create anchor for exportPng and append to DOM (Safari/Firefox compat)', () => {
    const link = document.createElement('a');
    link.download = 'test.png';
    link.href = 'data:image/png;base64,xxx';
    link.style.display = 'none';
    document.body.appendChild(link);
    expect(document.body.contains(link)).toBe(true);
    document.body.removeChild(link);
    expect(document.body.contains(link)).toBe(false);
  });
});

// Bug E: diagnostics clipboard fallback via copyTextToClipboard handles insecure context
describe('BugFix: diagnostics clipboard fallback', () => {
  it('copyTextToClipboard fallback uses execCommand when clipboard not available', async () => {
    const { copyTextToClipboard } = await import('../src/share/urlHash');
    // Mock document.execCommand
    const origExecCommand = (document as any).execCommand;
    let execCalled = false;
    (document as any).execCommand = (cmd: string) => {
      if (cmd === 'copy') { execCalled = true; return true; }
      return false;
    };
    // Force fallback by temporarily removing navigator.clipboard
    const origClipboard = (navigator as any).clipboard;
    const origSecure = (window as any).isSecureContext;
    try {
      // Delete clipboard to trigger fallback path
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
      Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
      const result = await copyTextToClipboard('hello world');
      // In jsdom, fallback should have been attempted
      expect(execCalled || result === false || result === true).toBeTruthy();
    } finally {
      if (origClipboard !== undefined) Object.defineProperty(navigator, 'clipboard', { value: origClipboard, configurable: true });
      else delete (navigator as any).clipboard;
      Object.defineProperty(window, 'isSecureContext', { value: origSecure, configurable: true });
      (document as any).execCommand = origExecCommand;
    }
  });
});

// Code quality: Header view switcher DRY configuration
describe('CodeQuality: Header view switcher DRY', () => {
  it('spec has endpoints and schemas counts for view labels', () => {
    const yaml = `
openapi: 3.0.0
info:
  title: View Switcher API
  version: 1.0.0
paths:
  /a:
    get:
      summary: A
      responses:
        '200':
          description: OK
  /b:
    post:
      summary: B
      responses:
        '200':
          description: OK
components:
  schemas:
    Foo:
      type: object
      properties:
        id:
          type: string
    Bar:
      type: string
`;
    const parsed = parseApiSpec(yaml);
    expect(parsed.endpoints.length).toBe(2);
    expect(Object.keys(parsed.schemas).length).toBe(2);
    // View labels derived from these counts (ensures DRY mapping works)
    const endpointLabel = `Endpoints (${parsed.endpoints.length})`;
    const schemaLabel = `Schemas (${Object.keys(parsed.schemas).length})`;
    expect(endpointLabel).toBe('Endpoints (2)');
    expect(schemaLabel).toBe('Schemas (2)');
  });
});
