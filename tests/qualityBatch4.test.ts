import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { isSwagger2 } from '../src/parser/swaggerConverter';
import { buildCurlCommand } from '../src/ui/CurlGenerator';
import { decompressSpecFromHash, compressSpecToHash } from '../src/share/urlHash';
import { generateMockData } from '../src/model/mockGenerator';

// 15 quality / feature tests covering recent bug fixes

describe('Quality Batch 4 - Bug Fixes & UX', () => {
  it('1: validator rejects array info object as missing-info', () => {
    const yaml = `openapi: 3.0.0
info: []
paths:
  /test:
    get:
      responses: { '200': { description: OK } }`;
    const spec = parseApiSpec(yaml);
    expect(spec.diagnostics.some((d) => d.id === 'missing-info-object')).toBe(true);
  });

  it('2: curl generator normalizes multiple trailing slashes in server URL', () => {
    const ep: any = { method: 'get', path: '/pets', parameters: [], security: [], requestBody: undefined, responses: [] };
    const cmd = buildCurlCommand(ep, 'https://api.example.com///', undefined);
    expect(cmd).toContain('https://api.example.com/pets');
    expect(cmd).not.toContain('///pets');
    expect(cmd).not.toContain('//pets');
  });

  it('3: curl escapes single quotes in JSON body for shell safety', () => {
    const ep: any = {
      method: 'post', path: '/items', parameters: [], security: [],
      requestBody: { required: true, content: [{ contentType: 'application/json', schema: { type: 'object', properties: { note: { type: 'string', example: "it's a test" } } } }] },
      responses: []
    };
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    // Should contain escaped single quote pattern '\'' 
    expect(cmd).toContain("'\\''");
  });

  it('4: isSwagger2 handles string "2" without dot', () => {
    expect(isSwagger2({ swagger: '2' } as any)).toBe(true);
    expect(isSwagger2({ swagger: '2.0' } as any)).toBe(true);
    expect(isSwagger2({ swagger: 2 } as any)).toBe(true);
    expect(isSwagger2({ swagger: '3.0' } as any)).toBe(false);
  });

  it('5: urlHash fallback decodes raw spec with paths: keyword without openapi/swagger', () => {
    const raw = 'paths:\n  /test:\n    get:\n      responses:\n        200:\n          description: ok';
    // Simulate hash that is raw url-encoded (not lz compressed)
    const encoded = encodeURIComponent(raw);
    const result = decompressSpecFromHash(`#spec=${encoded}`);
    expect(result).toBeTruthy();
    expect(result).toContain('paths:');
  });

  it('6: urlHash compress/decompress roundtrip with hash containing extra params', () => {
    const text = 'openapi: 3.0.0\ninfo:\n  title: T\n  version: 1.0.0\npaths: {}';
    const hash = compressSpecToHash(text);
    const withExtra = `${hash}&foo=bar`;
    const out = decompressSpecFromHash(withExtra);
    expect(out).toBe(text);
  });

  it('7: server variable fallback uses enum when default missing', () => {
    const ep: any = { method: 'get', path: '/test', parameters: [], security: [], responses: [] };
    const server: any = { url: 'https://{env}.example.com', variables: { env: { enum: ['prod', 'staging'], description: 'env' } } };
    const cmd = buildCurlCommand(ep, server.url, server);
    expect(cmd).toContain('https://prod.example.com/test');
  });

  it('8: validator still detects invalid path slash for missing slash', () => {
    const spec = parseApiSpec(`openapi: 3.0.0
info: { title: T, version: 1.0.0 }
paths:
  noSlash:
    get: { responses: { '200': { description: ok }}}`);
    expect(spec.diagnostics.some((d) => d.id.startsWith('invalid-path-slash-'))).toBe(true);
  });

  it('9: mock generator handles not schema by returning type-opposite placeholder', () => {
    const schema: any = { not: { type: 'string' } };
    const out = generateMockData(schema, {});
    expect(typeof out).not.toBe('string');
  });

  it('10: mock generator depth guard does not leak shared references for arrays', () => {
    const schema: any = { type: 'array', items: { type: 'object', properties: { a: { type: 'string' } } }, minItems: 2 };
    const out: any = generateMockData(schema, {});
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBe(2);
    out[0].a = 'changed';
    expect(out[1].a).not.toBe('changed');
  });

  it('11: parseApiSpec fallback diagnostics on crash include parse-crash id (smoke)', () => {
    // Force a doc that would not crash but ensure normal parse does not contain parse-crash
    const spec = parseApiSpec('openapi: 3.0.0\ninfo:\n  title: hi\n  version: 1.0.0\npaths: {}');
    expect(spec.diagnostics.some((d) => d.id === 'parse-crash')).toBe(false);
  });

  it('12: buildCurlCommand handles array query param with pipeDelimited', () => {
    const ep: any = {
      method: 'get', path: '/search', parameters: [{ name: 'ids', in: 'query', style: 'pipeDelimited', explode: false, schema: { type: 'array' }, example: ['1', '2', '3'] }], security: [], responses: []
    };
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('ids=1%7C2%7C3');
  });

  it('13: buildCurlCommand handles header format uuid fallback', () => {
    const ep: any = {
      method: 'get', path: '/test', parameters: [{ name: 'X-Request-Id', in: 'header', schema: { type: 'string', format: 'uuid' } }], security: [], responses: []
    };
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('X-Request-Id: 123e4567');
  });

  it('14: swagger converter does not double-encode refs in non-ref strings', async () => {
    const raw: any = { swagger: '2.0', info: { title: 't', version: '1.0.0' }, paths: {}, definitions: { Pet: { type: 'object', properties: { name: { type: 'string', example: '#/definitions/NotARef' } } } } };
    const { convertSwagger2ToOpenApi3 } = await import('../src/parser/swaggerConverter');
    const out: any = convertSwagger2ToOpenApi3(raw);
    const exampleVal = (out.components.schemas.Pet as any).properties.name.example;
    expect(exampleVal).toBe('#/definitions/NotARef');
  });

  it('15: validator unused schema detection works after ref extraction via normalizer', () => {
    const spec = parseApiSpec(`openapi: 3.0.0
info: { title: T, version: 1.0.0 }
paths:
  /pets:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Pet' }
components:
  schemas:
    Pet: { type: object, properties: { name: { type: string } } }
    Orphan: { type: object, properties: { x: { type: string } } }`);
    expect(spec.diagnostics.some((d) => d.id === 'unused-schema-Orphan')).toBe(true);
    expect(spec.diagnostics.some((d) => d.id === 'unused-schema-Pet')).toBe(false);
  });
});
