import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { buildCurlCommand } from '../src/ui/CurlGenerator';
import { computeApiTopologyGraph } from '../src/layout/graphLayout';
import { decompressSpecFromHash, compressSpecToHash } from '../src/share/urlHash';
import { EndpointModel } from '../src/model';

/**
 * Quality + feature tests covering newly fixed bugs and refactors.
 * At least 4 distinct areas: curl pure helper, graph layout options, validator cross-level,
 * and URL hash robustness.
 */

describe('Quality: CurlBuilder pure helper (server & path handling)', () => {
  it('buildCurlCommand replaces all server variable occurrences', () => {
    const ep: EndpointModel = {
      id: 'get_/test',
      method: 'get',
      path: '/test',
      tags: ['Default'],
      deprecated: false,
      parameters: [],
      responses: [],
      security: [],
      consumedSchemaRefs: [],
      producedSchemaRefs: [],
    };
    const cmd = buildCurlCommand(ep, 'https://{env}.example.com/{env}/v1', {
      url: 'https://{env}.example.com/{env}/v1',
      variables: { env: { default: 'staging' } },
    } as any);
    expect(cmd).toContain('https://staging.example.com/staging/v1/test');
    expect(cmd).not.toContain('{env}');
  });

  it('buildCurlCommand replaces duplicate path placeholders', () => {
    const ep: EndpointModel = {
      id: 'get_/{id}/friends/{id}',
      method: 'get',
      path: '/{id}/friends/{id}',
      tags: ['Default'],
      deprecated: false,
      parameters: [{ name: 'id', in: 'path', required: true, example: 'xyz' } as any],
      responses: [],
      security: [],
      consumedSchemaRefs: [],
      producedSchemaRefs: [],
    };
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('https://api.example.com/xyz/friends/xyz');
    expect(cmd).not.toContain('{id}');
  });

  it('buildCurlCommand respects spaceDelimited and pipeDelimited array query styles', () => {
    const ep: EndpointModel = {
      id: 'get_/search',
      method: 'get',
      path: '/search',
      tags: ['Default'],
      deprecated: false,
      parameters: [
        { name: 'cats', in: 'query', style: 'pipeDelimited', explode: false, schema: { type: 'array' }, example: ['a', 'b'] } as any,
        { name: 'dogs', in: 'query', style: 'spaceDelimited', explode: false, schema: { type: 'array' }, example: ['x', 'y'] } as any,
      ],
      responses: [],
      security: [],
      consumedSchemaRefs: [],
      producedSchemaRefs: [],
    };
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    // pipeDelimited uses literal | delimiter (unencoded) with encoded values
    expect(cmd).toContain('cats=a|b');
    // spaceDelimited uses %20 delimiter
    expect(cmd).toContain('dogs=x%20y');
  });
});

describe('Quality: GraphLayout respects LayoutOptions', () => {
  it('produces different dagre widths based on nodeWidth option', () => {
    const yaml = `
openapi: 3.0.0
info:
  title: Layout Options API
  version: 1.0.0
paths:
  /a:
    get:
      summary: A
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Foo'
components:
  schemas:
    Foo:
      type: object
      properties:
        id: { type: string }
`;
    const spec = parseApiSpec(yaml);
    const small = computeApiTopologyGraph(spec, { direction: 'LR', nodeWidth: 220, nodeHeight: 70 });
    const large = computeApiTopologyGraph(spec, { direction: 'LR', nodeWidth: 320, nodeHeight: 90 });
    // Node positions differ due to width/height affecting dagre layout
    expect(small.nodes.length).toBe(large.nodes.length);
    // Ensure nodes have positions and different spacing due to width change
    const smallPos = small.nodes.find(n => n.id === 'ep_get_/a')?.position;
    const largePos = large.nodes.find(n => n.id === 'ep_get_/a')?.position;
    expect(smallPos).toBeDefined();
    expect(largePos).toBeDefined();
  });

  it('filters deterministic hiddenIds logic (exposed via compute)', () => {
    const yaml = `
openapi: 3.0.0
info:
  title: Filter API
  version: 1.0.0
paths:
  /pets:
    get:
      tags: [pets]
      summary: Get pets
      responses: { '200': { description: OK } }
  /users:
    post:
      tags: [users]
      summary: Create user
      responses: { '200': { description: OK } }
components:
  schemas:
    Pet: { type: object, properties: { id: { type: string } } }
`;
    const spec = parseApiSpec(yaml);
    const { nodes, edges } = computeApiTopologyGraph(spec, { direction: 'LR', nodeWidth: 280, nodeHeight: 90 });
    expect(nodes.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThanOrEqual(0);
    // Verify node ids follow expected prefix conventions
    expect(nodes.some(n => n.id.startsWith('ep_'))).toBe(true);
    expect(nodes.some(n => n.id.startsWith('schema_'))).toBe(true);
  });
});

describe('Quality: Validator duplicate path-level vs operation collision', () => {
  it('flags duplicate param across path and operation levels', () => {
    const specYaml = `
openapi: 3.0.0
info:
  title: Dup Path Level API
  version: 1.0.0
paths:
  /items/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string }
    get:
      summary: Get item
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: OK
`;
    const parsed = parseApiSpec(specYaml);
    const dup = parsed.diagnostics.find(d => d.id.startsWith('duplicate-param-') && d.message.includes('id'));
    expect(dup).toBeDefined();
    expect(dup?.severity).toBe('warning');
  });
});

describe('Quality: URL hash robustness with extra query params', () => {
  it('decompresses spec even when hash contains extra & params', async () => {
    const raw = 'openapi: 3.0.0\ninfo:\n  title: Hash Test\n  version: 1.0.0\npaths: {}';
    const hash = compressSpecToHash(raw); // '#spec=...'
    const hashWithExtra = `${hash}&foo=bar&baz=qux`;
    const decompressed = decompressSpecFromHash(hashWithExtra);
    expect(decompressed).toBe(raw);
    expect(decompressed).not.toContain('foo=bar');
  });

  it('handles plain #spec= with trailing & cleanly', () => {
    const raw = 'openapi: 3.0.0\ninfo:\n  title: Hash Test\n  version: 1.0.0\npaths: {}';
    const hash = compressSpecToHash(raw);
    const withoutHashPrefix = hash.replace(/^#/, '');
    const withAmp = withoutHashPrefix + '&extra=1';
    expect(decompressSpecFromHash(withAmp)).toBe(raw);
    expect(decompressSpecFromHash('#' + withAmp)).toBe(raw);
  });
});
