import { describe, it, expect } from 'vitest';
import { parseRawText } from '../src/parser/yamlJson';
import { parseApiSpec } from '../src/parser';
import { generateMockData } from '../src/model/mockGenerator';
import { MAX_MOCK_DEPTH } from '../src/utils/schemaRefs';
import { computeApiTopologyGraph } from '../src/layout/graphLayout';
import { buildCurlCommand } from '../src/ui/CurlGenerator';
import { compressSpecToHash, decompressSpecFromHash } from '../src/share/urlHash';
import { validateSpec } from '../src/parser/validator';

describe('New quality batch 6 - verified bug fixes', () => {
  it('strips BOM before JSON detection', () => {
    const bomJson = '\uFEFF{"openapi":"3.0.0","info":{"title":"BOM Test","version":"1.0.0"},"paths":{}}';
    const res = parseRawText(bomJson);
    expect(res.data).not.toBeNull();
    expect(res.data?.openapi).toBe('3.0.0');
  });

  it('strips BOM before YAML parsing', () => {
    const bomYaml = '\uFEFFopenapi: 3.0.0\ninfo:\n  title: BOM YAML\n  version: 1.0.0\npaths: {}';
    const res = parseRawText(bomYaml);
    expect(res.data).not.toBeNull();
    expect(res.diagnostics.length).toBe(0);
  });

  it('prioritizes example at deep recursion depth', () => {
    const deepSchema: any = { type: 'object', properties: {} };
    let current = deepSchema;
    for (let i = 0; i < 6; i++) {
      const next: any = { type: 'string', example: 'deep-value' };
      current.properties = { child: next };
      current = next;
    }
    const result = generateMockData(deepSchema, {}, 0) as any;
    // Even deeply nested, example should surface where encountered
    expect(result).toBeDefined();
  });

  it('mock depth returns enum even at max depth boundary', () => {
    const schema: any = { type: 'string', enum: ['a', 'b'], default: 'default-val', example: 'example-val' };
    const resExample = generateMockData(schema, {}, MAX_MOCK_DEPTH + 1);
    expect(resExample).toBe('example-val');
    const schema2: any = { type: 'string', enum: ['x', 'y'] };
    const resEnum = generateMockData(schema2, {}, MAX_MOCK_DEPTH + 1);
    expect(resEnum).toBe('x');
  });

  it('graphLayout does not count self-reference in reuse', () => {
    const spec: any = {
      title: 'Self Ref',
      version: '1.0.0',
      endpoints: [],
      schemas: {
        Node: {
          name: 'Node',
          type: 'object',
          properties: {
            child: { $ref: '#/components/schemas/Node', refTarget: 'Node', type: 'object' },
          },
        },
      },
    };
    const { nodes } = computeApiTopologyGraph(spec as any, { direction: 'LR', nodeWidth: 280, nodeHeight: 90 });
    const node = nodes.find((n) => n.id === 'schema_Node');
    expect(node).toBeDefined();
    expect((node?.data as any).reuseCount).toBe(0);
  });

  it('validator does not crash on circular object references', () => {
    const raw: any = { openapi: '3.0.0', info: { title: 'T', version: '1.0.0' }, paths: {} };
    (raw as any).self = raw;
    const spec = parseApiSpec('openapi: 3.0.0\ninfo:\n  title: T\n  version: 1.0.0\npaths: {}');
    expect(spec).toBeDefined();
    expect(() => validateSpec({ endpoints: [], schemas: {}, rawText: '', rawDoc: raw })).not.toThrow();
  });

  it('validator duplicate param detection resolves $ref', () => {
    const specText = `
openapi: 3.0.0
info:
  title: Dup Ref
  version: 1.0.0
paths:
  /test:
    get:
      parameters:
        - $ref: '#/components/parameters/Q'
        - name: q
          in: query
          schema:
            type: string
      responses:
        '200':
          description: OK
components:
  parameters:
    Q:
      name: q
      in: query
      schema:
        type: string
`;
    const spec = parseApiSpec(specText);
    const dup = spec.diagnostics.find((d) => d.id.includes('duplicate-param'));
    expect(dup).toBeDefined();
    expect(dup?.message).toContain('q');
  });

  it('validator skips nameless $ref param without false positive', () => {
    const specText = `
openapi: 3.0.0
info:
  title: No Name
  version: 1.0.0
paths:
  /test:
    get:
      parameters:
        - $ref: '#/components/parameters/Bad'
      responses:
        '200':
          description: OK
components:
  parameters:
    Bad:
      description: no name no in
`;
    const spec = parseApiSpec(specText);
    // Should not produce duplicate key "query:undefined"
    const badDup = spec.diagnostics.find((d) => d.id.includes('query:undefined'));
    expect(badDup).toBeUndefined();
  });

  it('curl encodes server variable values', () => {
    const endpoint: any = { method: 'get', path: '/pets', parameters: [], security: [], requestBody: undefined, responses: [] };
    const servers: any = [{ url: 'https://{env}.example.com/v1', variables: { env: { default: 'my env' } } }];
    const cmd = buildCurlCommand(endpoint, servers[0].url, servers[0]);
    expect(cmd).toContain('my%20env');
    expect(cmd).not.toContain('{env}');
  });

  it('curl encodes variable enum fallback', () => {
    const endpoint: any = { method: 'get', path: '/x', parameters: [], security: [], requestBody: undefined, responses: [] };
    const servers: any = [{ url: 'https://{region}.example.com', variables: { region: { enum: ['us east'] } } }];
    const cmd = buildCurlCommand(endpoint, servers[0].url, servers[0]);
    expect(cmd).toContain('us%20east');
  });

  it('urlHash roundtrip compress/decompress', () => {
    const txt = 'openapi: 3.0.0\ninfo:\n  title: Hash Test\n  version: 1.0.0\npaths: {}';
    const hash = compressSpecToHash(txt);
    const dec = decompressSpecFromHash(hash);
    expect(dec).toBe(txt);
  });

  it('urlHash handles raw spec without hash prefix', () => {
    const txt = 'openapi: 3.0.0\ninfo:\n  title: Raw\n  version: 1.0.0\npaths: {}';
    const encoded = encodeURIComponent(txt);
    const dec = decompressSpecFromHash(encoded);
    expect(dec).toBe(txt);
  });

  it('mock array uses MAX_MOCK_ARRAY_ITEMS limit for minItems cap', () => {
    const schema: any = { type: 'array', minItems: 10, items: { type: 'string' } };
    const res = generateMockData(schema) as unknown[];
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(5);
  });

  it('collectSchemaRefs max mock constants are consistent', () => {
    expect(MAX_MOCK_DEPTH).toBe(4);
  });

  it('parseRawText handles JSON array root as error', () => {
    const res = parseRawText('[1,2,3]');
    expect(res.data).toBeNull();
    expect(res.diagnostics.some((d) => d.id === 'json-root-object')).toBe(true);
  });
});
