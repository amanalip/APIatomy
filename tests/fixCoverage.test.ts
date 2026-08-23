import { describe, it, expect } from 'vitest';
import { parseRawText } from '../src/parser/yamlJson';
import { isSwagger2, convertSwagger2ToOpenApi3 } from '../src/parser/swaggerConverter';
import { validateSpec } from '../src/parser/validator';
import { generateMockData } from '../src/model/mockGenerator';
import { resolveSchema } from '../src/parser/refResolver';
import { buildCurlCommand } from '../src/ui/CurlGenerator';
import { computeApiTopologyGraph } from '../src/layout/graphLayout';
import { ApiSpecModel } from '../src/model';

describe('Fix coverage verification batch 157-172', () => {
  it('yamlJson returns yaml format when JSON-like content parsed via YAML fallback', () => {
    // Invalid JSON like "{ a: 1, b: 2 }" is valid YAML but not strict JSON
    const result = parseRawText('{ a: 1, b: } \nopenapi: 3.0.0\ninfo:\n  title: T\n  version: 1.0.0\npaths: {}');
    expect(result.data).not.toBeNull();
    expect(result.format).toBe('yaml');
  });

  it('isSwagger2 handles numeric 2 and 2.x strings', () => {
    expect(isSwagger2({ swagger: '2.0' } as any)).toBe(true);
    expect(isSwagger2({ swagger: '2.0.0' } as any)).toBe(true);
    expect(isSwagger2({ swagger: '2.1' } as any)).toBe(true);
    expect(isSwagger2({ swagger: 2 } as any)).toBe(true);
    expect(isSwagger2({ swagger: 2.0 } as any)).toBe(true);
    expect(isSwagger2({ swagger: '3.0.0' } as any)).toBe(false);
    expect(isSwagger2({ openapi: '3.0.0' } as any)).toBe(false);
  });

  it('swagger rewrite handles circular-like duplicate without stack overflow', () => {
    const obj: any = { swagger: '2.0', info: { title: 'T', version: '1' }, paths: {}, definitions: { A: { type: 'object', properties: { self: { $ref: '#/definitions/A' } } } } };
    const converted = convertSwagger2ToOpenApi3(obj);
    expect((converted.components as any).schemas.A).toBeDefined();
  });

  it('validator does not flag x- extensions as invalid methods', () => {
    const rawDoc: any = { paths: { '/test': { 'x-custom': {}, get: { responses: { '200': { description: 'ok' } } } } } };
    const result = validateSpec({ endpoints: [{ id: 'get_/test', method: 'get', path: '/test', tags: [], responses: [{ statusCode: '200', description: 'ok', content: [] }], parameters: [], consumedSchemaRefs: [], producedSchemaRefs: [] } as any], schemas: {}, rawText: 'paths:\n  /test:\n    get: {}', rawDoc });
    const invalid = result.filter(d => d.id.startsWith('invalid-http-method') && d.message.includes('x-custom'));
    expect(invalid.length).toBe(0);
  });

  it('validator does not treat default as success for missing-2xx', () => {
    const ep: any = { id: 'get_/test', method: 'get', path: '/test', tags: [], responses: [{ statusCode: 'default', description: 'err', content: [] }], parameters: [], consumedSchemaRefs: [], producedSchemaRefs: [] };
    const result = validateSpec({ endpoints: [ep], schemas: {}, rawText: 'paths:\n  /test:\n    get: {}', rawDoc: { paths: { '/test': { get: {} } } } as any });
    const missing2xx = result.filter(d => d.id.startsWith('missing-2xx'));
    expect(missing2xx.length).toBe(1);
  });

  it('mockGenerator creates distinct objects for minItems arrays', () => {
    const schema: any = { type: 'array', minItems: 3, items: { type: 'object', properties: { id: { type: 'integer' } } } };
    const result = generateMockData(schema, {}, 0) as any[];
    expect(result.length).toBe(3);
    expect(result[0]).not.toBe(result[1]);
    result[0].id = 999;
    expect(result[1].id).not.toBe(999);
  });

  it('mockGenerator handles OAS 3.1 array type ["string","null"]', () => {
    const schema: any = { type: ['string', 'null'], name: 'foo' };
    const result = generateMockData(schema, {}, 0);
    expect(result).toBe('foo');
    const deep: any = { type: ['object', 'null'], properties: { a: { type: 'string' } } };
    const deepData = generateMockData(deep, {}, 5);
    expect(deepData).toEqual({});
  });

  it('curl sanitizes quotes, backslashes, and encodes cookies', () => {
    const ep: any = {
      method: 'get', path: '/test',
      parameters: [
        { name: 'X-Custom', in: 'header', schema: { type: 'string' }, example: 'a"b\\c$d`e' },
        { name: 'my cookie', in: 'cookie', schema: { type: 'string' }, example: 'hello world' }
      ],
      security: [{ name: 'apiKey', scopes: [] }, { name: 'basic', scopes: [] }],
      requestBody: undefined, responses: [], servers: []
    };
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('\\"');
    expect(cmd).toContain('\\\\');
    // cookies encoded
    expect(cmd).toContain('my%20cookie=hello%20world');
    // multiple security schemes included
    expect(cmd).toContain('X-API-Key');
    expect(cmd).toContain('-u "username:password"');
  });

  it('curl prefers json content type', () => {
    const ep: any = {
      method: 'post', path: '/test', parameters: [], security: [],
      requestBody: { content: [{ contentType: 'application/xml', schema: { type: 'string' } }, { contentType: 'application/json', schema: { type: 'object', properties: { a: { type: 'string' } } } }] },
      responses: []
    };
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('Content-Type: application/json');
  });

  it('graphLayout handles multigraph edges without overwrite and empty limit', () => {
    const spec = {
      endpoints: [{ id: 'get_users', method: 'get', path: '/users', tags: [], consumedSchemaRefs: ['User'], producedSchemaRefs: ['User'], summary: '' } as any],
      schemas: { User: { id: 'User', name: 'User', type: 'object', properties: {} } as any }
    } as ApiSpecModel as any;
    // Add minimal fields to avoid crash
    (spec as any).title = 'Test';
    const result = computeApiTopologyGraph(spec as any, { direction: 'LR', nodeWidth: 280, nodeHeight: 90 });
    // should have 2 edges (consumes + produces) for same pair due to multigraph
    const edgesBetween = result.edges.filter(e => e.source.includes('get_users') && e.target.includes('User'));
    expect(edgesBetween.length).toBe(2);
  });

  it('validator empty-schema not triggered for $ref resolved schemas', () => {
    const schemas: any = { MyModel: { id: 'MyModel', name: 'MyModel', refTarget: 'Other', type: undefined } };
    const result = validateSpec({ endpoints: [], schemas, rawText: 'components:\n  schemas:\n    MyModel:\n      $ref: "#/components/schemas/Other"', rawDoc: { paths: {}, components: { schemas } } as any });
    const empty = result.filter(d => d.id === 'empty-schema-MyModel');
    expect(empty.length).toBe(0);
  });
});
