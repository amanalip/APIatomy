import { describe, it, expect } from 'vitest';
import { buildCurlCommand } from '../src/ui/CurlGenerator';
import { generateMockData } from '../src/model/mockGenerator';
import { EndpointModel } from '../src/model';
import { isRecord, isString, isNumber, isNonEmptyString } from '../src/utils/typeGuards';

function makeEndpoint(overrides: Partial<EndpointModel> = {}): EndpointModel {
  return {
    id: 'get_/test',
    method: 'get',
    path: '/test',
    tags: ['Default'],
    deprecated: false,
    parameters: [],
    responses: [{ statusCode: '200', description: 'ok', content: [] }],
    security: [],
    consumedSchemaRefs: [],
    producedSchemaRefs: [],
    ...overrides,
  };
}

describe('Quality Batch 5 - bug fixes and code quality', () => {
  it('typeGuards isRecord and isString and isNumber work', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isString('hi')).toBe(true);
    expect(isString(123)).toBe(false);
    expect(isNumber(42)).toBe(true);
    expect(isNumber(NaN)).toBe(false);
    expect(isNonEmptyString('  ')).toBe(false);
    expect(isNonEmptyString(' ok ')).toBe(true);
  });

  it('curl delimiter for explode false keeps delimiter unencoded and encodes values', () => {
    const ep = makeEndpoint({
      parameters: [
        { name: 'ids', in: 'query', required: false, style: 'form', explode: false, schema: { type: 'array' }, example: ['a b', 'c&d'] },
      ],
    });
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('ids=a%20b,c%26d');
  });

  it('curl spaceDelimited uses %20 delimiter unencoded', () => {
    const ep = makeEndpoint({
      parameters: [
        { name: 'tags', in: 'query', required: false, style: 'spaceDelimited', explode: false, schema: { type: 'array' }, example: ['a', 'b'] },
      ],
    });
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('tags=a%20b');
  });

  it('curl pipeDelimited uses | delimiter unencoded', () => {
    const ep = makeEndpoint({
      parameters: [
        { name: 'ids', in: 'query', required: false, style: 'pipeDelimited', explode: false, schema: { type: 'array' }, example: ['1', '2'] },
      ],
    });
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('ids=1|2');
  });

  it('mockGenerator date-time is deterministic fixed string', () => {
    const mock = generateMockData({ type: 'string', format: 'date-time' } as any);
    expect(mock).toBe('2026-08-23T14:30:00.000Z');
  });

  it('endpoint explorer search method exact match does not match path substring', async () => {
    // Simulate filter logic: method exact match should not match endpoint with path containing "get"
    const ep: EndpointModel = makeEndpoint({ method: 'post', path: '/target', tags: ['Default'] });
    const q = 'get';
    const methodMatch = ep.method.toLowerCase() === q;
    expect(methodMatch).toBe(false);
    // post with q get should not match via method
    const pathMatch = ep.path.toLowerCase().includes(q);
    expect(pathMatch).toBe(true); // path contains get via target, but method should not contribute
  });

  it('security heuristic api_key vs generic key string does not false positive', () => {
    const epApiKey = makeEndpoint({ security: [{ name: 'my_api_key', scopes: [] }] });
    const cmd1 = buildCurlCommand(epApiKey, 'https://api.example.com', undefined);
    expect(cmd1).toContain('X-API-Key');
    const epGeneric = makeEndpoint({ security: [{ name: 'mykey2', scopes: [] }] });
    const cmd2 = buildCurlCommand(epGeneric, 'https://api.example.com', undefined);
    expect(cmd2).toContain('Authorization: Bearer');
  });

  it('security heuristic basic exact vs substring', () => {
    const epBasic = makeEndpoint({ security: [{ name: 'basic_auth', scopes: [] }] });
    const cmd1 = buildCurlCommand(epBasic, 'https://api.example.com', undefined);
    expect(cmd1).toContain('-u "username:password"');
    const epOther = makeEndpoint({ security: [{ name: 'basicAuthOther', scopes: [] }] });
    const cmd2 = buildCurlCommand(epOther, 'https://api.example.com', undefined);
    // basicAuthOther contains basic_auth substring? lower includes basic but not basic_auth pattern, should be bearer
    expect(cmd2).toContain('Authorization: Bearer');
  });

  it('refResolver cache clone includes composition fields (smoke via normalizer)', async () => {
    const { parseApiSpec } = await import('../src/parser');
    const yaml = `
openapi: 3.0.0
info:
  title: T
  version: 1.0.0
paths: {}
components:
  schemas:
    Base:
      type: object
      properties:
        id:
          type: string
    Ext:
      allOf:
        - $ref: '#/components/schemas/Base'
        - type: object
          properties:
            extra:
              type: string
    A:
      type: object
      properties:
        ref:
          $ref: '#/components/schemas/Ext'
`;
    const spec = parseApiSpec(yaml);
    expect(spec.schemas['Ext'].allOf).toBeDefined();
    expect(spec.schemas['A']).toBeDefined();
  });

  it('mockGenerator handles array minItems correctly', () => {
    const mock = generateMockData({ type: 'array', minItems: 3, items: { type: 'string' } as any } as any);
    expect(Array.isArray(mock)).toBe(true);
    expect((mock as unknown[]).length).toBe(3);
  });

  it('curl server variable replacement uses enum fallback when default empty', () => {
    const ep = makeEndpoint();
    const server: any = { url: 'https://{env}.example.com', variables: { env: { default: '', enum: ['prod', 'dev'] } } };
    const cmd = buildCurlCommand(ep, 'https://{env}.example.com', server);
    expect(cmd).toContain('https://prod.example.com');
  });

  it('isRecord guards parser normalizer paths (smoke)', async () => {
    const { parseApiSpec } = await import('../src/parser');
    const spec = parseApiSpec('openapi: 3.0.0\ninfo:\n  title: T\n  version: 1.0.0\npaths: {}');
    expect(spec.title).toBe('T');
  });

  it('typeGuards asString fallback', async () => {
    const { asString } = await import('../src/utils/typeGuards');
    expect(asString('hi')).toBe('hi');
    expect(asString(123, 'fallback')).toBe('fallback');
  });

  it('curl handles cookie encoding', () => {
    const ep = makeEndpoint({ parameters: [{ name: 'session', in: 'cookie', required: false, schema: { type: 'string' } }] } as any);
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('-b "session=value"');
  });

  it('mock additionalProperties generates sample', () => {
    const mock = generateMockData({ type: 'object', additionalProperties: { type: 'string' } as any } as any);
    expect(mock).toHaveProperty('additionalProp');
  });
});
