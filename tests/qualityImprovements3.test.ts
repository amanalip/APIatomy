import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { generateMockData } from '../src/model/mockGenerator';
import { getStatusCategory } from '../src/model/httpMethods';
import { computeApiTopologyGraph } from '../src/layout/graphLayout';
import { collectSchemaRefs } from '../src/parser/refResolver';

describe('Quality: validator collectSubRefs handles additionalProperties and not', () => {
  it('does not mark map-referenced schema as unused', () => {
    const yaml = `
openapi: 3.0.0
info: { title: T, version: 1.0.0 }
paths:
  /test:
    get:
      responses: { '200': { description: ok, content: { 'application/json': { schema: { $ref: '#/components/schemas/Outer' } } } } }
components:
  schemas:
    Outer:
      type: object
      additionalProperties: { $ref: '#/components/schemas/Inner' }
    Inner:
      type: object
      properties: { id: { type: string } }
`;
    const parsed = parseApiSpec(yaml);
    const unusedInner = parsed.diagnostics.find(d => d.id === 'unused-schema-Inner');
    expect(unusedInner).toBeUndefined();
  });

  it('does not mark not-referenced schema as unused', () => {
    const yaml = `
openapi: 3.0.0
info: { title: T, version: 1.0.0 }
paths: {}
components:
  schemas:
    Outer:
      not: { $ref: '#/components/schemas/Forbidden' }
    Forbidden:
      type: string
`;
    const parsed = parseApiSpec(yaml);
    const unused = parsed.diagnostics.find(d => d.id === 'unused-schema-Forbidden');
    // Outer itself may be unused but Forbidden should be considered referenced via not
    expect(unused).toBeUndefined();
  });
});

describe('Quality: getStatusCategory handles default as success', () => {
  it('maps default to emerald success style', () => {
    const cat = getStatusCategory('default');
    expect(cat.color).toContain('emerald');
    expect(cat.label).toBe('Default');
  });
  it('still maps 2xx case-insensitively', () => {
    expect(getStatusCategory('2XX').label).toBe('Success');
  });
});

describe('Quality: mockGenerator handles not composition', () => {
  it('generates non-matching mock for not:string', () => {
    const schema: any = { not: { type: 'string' } };
    const mock = generateMockData(schema, {}, 0);
    expect(typeof mock).not.toBe('string');
  });
  it('generates array-violating mock for not:array', () => {
    const schema: any = { not: { type: 'array', items: { type: 'string' } } };
    const mock = generateMockData(schema, {}, 0);
    expect(Array.isArray(mock)).toBe(false);
  });
});

describe('Quality: graph layout reuse counts include nested schema refs', () => {
  it('counts nested additionalProperties refs in reuse', () => {
    const yaml = `
openapi: 3.0.0
info: { title: T, version: 1.0.0 }
paths:
  /pets:
    get:
      responses: { '200': { description: ok, content: { 'application/json': { schema: { $ref: '#/components/schemas/Outer' } } } } }
components:
  schemas:
    Outer:
      type: object
      additionalProperties: { $ref: '#/components/schemas/Inner' }
    Inner:
      type: object
      properties: { id: { type: string } }
`;
    const spec = parseApiSpec(yaml);
    const { nodes } = computeApiTopologyGraph(spec, { direction: 'LR', nodeWidth: 280, nodeHeight: 90 });
    const innerNode = nodes.find(n => n.id === 'schema_Inner');
    expect(innerNode).toBeDefined();
    expect((innerNode!.data as any).reuseCount).toBeGreaterThan(0);
  });
});

describe('Quality: collectSchemaRefs additionalProperties/not parity with validator', () => {
  it('collects both map and negation refs', () => {
    const schema: any = {
      type: 'object',
      properties: { a: { $ref: '#/components/schemas/A' } },
      additionalProperties: { $ref: '#/components/schemas/B' },
      not: { $ref: '#/components/schemas/C' },
      allOf: [{ $ref: '#/components/schemas/D' }]
    };
    const refs = collectSchemaRefs(schema);
    expect(refs.has('A')).toBe(true);
    expect(refs.has('B')).toBe(true);
    expect(refs.has('C')).toBe(true);
    expect(refs.has('D')).toBe(true);
  });
});
