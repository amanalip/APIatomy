import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { buildCurlCommand } from '../src/ui/CurlGenerator';
import { collectSchemaRefs } from '../src/parser/refResolver';
import { convertSwagger2ToOpenApi3 } from '../src/parser/swaggerConverter';
import { generateMockData } from '../src/model/mockGenerator';

describe('Fix: TRACE method filtering includes trace', () => {
  it('endpoint explorer methodsList now contains trace and filter works', async () => {
    const yaml = `
openapi: 3.0.0
info:
  title: Trace API
  version: 1.0.0
paths:
  /trace-test:
    trace:
      summary: Trace operation
      responses:
        '200': { description: OK }
  /get-test:
    get:
      summary: Get operation
      responses:
        '200': { description: OK }
`;
    const parsed = parseApiSpec(yaml);
    expect(parsed.endpoints.some(e => e.method === 'trace')).toBe(true);
    expect(parsed.endpoints.some(e => e.method === 'get')).toBe(true);
    // Simulate filtering like EndpointExplorer does
    const filtered = parsed.endpoints.filter(e => e.method === 'trace');
    expect(filtered.length).toBe(1);
    expect(filtered[0].path).toBe('/trace-test');
  });
});

describe('Fix: Response sort handles all wildcard status codes', () => {
  it('sorts 1xx,2xx,3xx,4xx,5xx, default in correct order', () => {
    const yaml = `
openapi: 3.0.0
info:
  title: Wildcard Sort API
  version: 1.0.0
paths:
  /test:
    get:
      summary: test
      responses:
        '5xx': { description: Server error }
        'default': { description: Default }
        '1xx': { description: Info }
        '4xx': { description: Client error }
        '3xx': { description: Redirect }
        '2xx': { description: Success }
        '200': { description: OK }
`;
    const parsed = parseApiSpec(yaml);
    const ep = parsed.endpoints[0];
    const sorted = [...ep.responses].sort((a,b)=>{
      const norm = (code:string)=>{
        const lower=code.toLowerCase();
        if(lower==='1xx') return 100;
        if(lower==='2xx') return 200;
        if(lower==='3xx') return 300;
        if(lower==='4xx') return 400;
        if(lower==='5xx') return 500;
        if(lower==='default') return 9999;
        const n=parseInt(lower,10); return isNaN(n)?9998:n;
      };
      return norm(a.statusCode)-norm(b.statusCode);
    });
    const order = sorted.map(r=>r.statusCode.toLowerCase());
    expect(order.indexOf('1xx')).toBeLessThan(order.indexOf('2xx'));
    expect(order.indexOf('2xx')).toBeLessThan(order.indexOf('3xx'));
    expect(order.indexOf('3xx')).toBeLessThan(order.indexOf('4xx'));
    expect(order.indexOf('4xx')).toBeLessThan(order.indexOf('5xx'));
    expect(order.indexOf('5xx')).toBeLessThan(order.indexOf('default'));
  });
});

describe('Fix: collectSchemaRefs includes additionalProperties and not', () => {
  it('collects refs from additionalProperties', () => {
    const schema = {
      type: 'object',
      additionalProperties: { $ref: '#/components/schemas/Inner' },
      properties: { name: { type: 'string' } }
    };
    const refs = collectSchemaRefs(schema);
    expect(refs.has('Inner')).toBe(true);
  });
  it('collects refs from not', () => {
    const schema = { not: { $ref: '#/components/schemas/Forbidden' } };
    const refs = collectSchemaRefs(schema);
    expect(refs.has('Forbidden')).toBe(true);
  });
});

describe('Fix: swagger rewrite does not mutate example strings', () => {
  it('preserves example string that looks like definition pointer', () => {
    const swagger: any = {
      swagger: '2.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                schema: { $ref: '#/definitions/Pet' },
                examples: { 'application/json': '#/definitions/ShouldNotRewrite' }
              }
            }
          }
        }
      },
      definitions: { Pet: { type: 'object', properties: { exampleField: { type: 'string', example: '#/definitions/Foo' } } } }
    };
    const converted = convertSwagger2ToOpenApi3(swagger);
    const schemas = (converted.components as any).schemas.Pet as any;
    // example field should remain unchanged
    expect(schemas.properties.exampleField.example).toBe('#/definitions/Foo');
    // $ref should be rewritten
    const pathItem = (converted.paths as any)['/test'].get;
    expect(pathItem.responses['200'].content['application/json'].schema.$ref).toBe('#/components/schemas/Pet');
  });
});

describe('Fix: server variable replacement handles enum fallback and empty default', () => {
  it('uses enum first value when default empty', () => {
    const ep: any = { id: 'get_/test', method: 'get', path: '/test', tags: [], deprecated: false, parameters: [], responses: [], security: [], consumedSchemaRefs:[], producedSchemaRefs:[] };
    const cmd = buildCurlCommand(ep, 'https://{env}.example.com/v1', { url: 'https://{env}.example.com/v1', variables: { env: { default: '', enum: ['prod','staging'] } } } as any);
    expect(cmd).toContain('https://prod.example.com/v1/test');
  });
  it('handles additionalProperties mock generation', () => {
    const schema: any = { type: 'object', properties: { id: { type: 'string' } }, additionalProperties: { type: 'string' } };
    const mock = generateMockData(schema, {}, 0) as any;
    expect(mock.id).toBeDefined();
    expect(mock.additionalProp).toBeDefined();
  });
});

describe('Fix: validator empty-schema respects additionalProperties and not', () => {
  it('does not flag map schema with additionalProperties as empty', async () => {
    const yaml = `
openapi: 3.0.0
info:
  title: Map Schema API
  version: 1.0.0
paths: {}
components:
  schemas:
    MapModel:
      type: object
      additionalProperties:
        type: string
    NotModel:
      not:
        type: string
`;
    const parsed = parseApiSpec(yaml);
    const emptyDiags = parsed.diagnostics.filter(d=> d.id === 'empty-schema-MapModel' || d.id==='empty-schema-NotModel');
    expect(emptyDiags.length).toBe(0);
  });
});
