import { expect, it } from 'vitest';
import { parseApiSpec } from '../src/parser';

const root = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'External objects', version: '1' },
  paths: {
    '/test': {
      $ref: './routes/path.yaml#/Path',
      post: {
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Local' } } },
        },
        responses: { '200': { description: 'Local' } },
      },
    },
  },
  components: { schemas: { Local: { type: 'boolean' } } },
});
const files = {
  'api/root.json': root,
  'api/routes/path.yaml': `Path:
  parameters:
    - $ref: ../objects/parameters.yaml#/Id
  get:
    requestBody:
      $ref: ../objects/body.yaml#/Alias
    responses:
      '200':
        $ref: ../objects/responses.yaml#/OK
`,
  'api/objects/parameters.yaml':
    'Id:\n  name: id\n  in: query\n  schema:\n    $ref: "#/Types/Id"\nTypes:\n  Id:\n    type: integer',
  'api/objects/body.yaml':
    'Alias:\n  $ref: "#/Body"\nBody:\n  required: true\n  content:\n    application/json:\n      schema:\n        $ref: ./schemas.yaml#/Payload',
  'api/objects/schemas.yaml': 'Payload:\n  type: string',
  'api/objects/responses.yaml':
    'OK:\n  description: Remote\n  headers:\n    X-ID:\n      $ref: ./headers.yaml#/ID\n  content:\n    application/json:\n      schema:\n        $ref: ./schemas.yaml#/Payload',
  'api/objects/headers.yaml':
    'ID:\n  description: Identifier\n  schema:\n    $ref: "#/Types/ID"\nTypes:\n  ID:\n    type: integer',
};
it('resolves path items, parameters, bodies, responses, and headers in their own document scope', () => {
  const spec = parseApiSpec(root, { files, rootFilename: 'api/root.json' });
  const get = spec.endpoints.find((ep) => ep.method === 'get')!;
  expect(get.parameters[0]).toMatchObject({ name: 'id', schema: { type: 'integer' } });
  expect(get.requestBody).toMatchObject({
    required: true,
    content: [{ schema: { type: 'string' } }],
  });
  expect(get.responses[0].content[0].schema?.type).toBe('string');
  expect(get.responses[0].headers?.['X-ID']).toMatchObject({
    description: 'Identifier',
    schema: { type: 'integer' },
  });
  const post = spec.endpoints.find((ep) => ep.method === 'post')!;
  expect(post.requestBody?.content[0].schema?.type).toBe('boolean');
  expect(spec.diagnostics.filter((d) => d.source === 'ref')).toEqual([]);
});
it('reports missing and cyclic object references without fabricating empty bodies', () => {
  const doc = JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Cycles', version: '1' },
    paths: {
      '/test': {
        get: {
          parameters: [{ $ref: './cycle.yaml#/A' }],
          requestBody: { $ref: './missing.yaml#/Body' },
          responses: { '200': { $ref: './cycle.yaml#/A' } },
        },
      },
    },
  });
  const spec = parseApiSpec(doc, {
    files: { 'cycle.yaml': 'A:\n  $ref: "#/B"\nB:\n  $ref: "#/A"' },
  });
  expect(spec.endpoints[0].parameters).toEqual([]);
  expect(spec.endpoints[0].requestBody).toBeUndefined();
  expect(spec.endpoints[0].responses).toEqual([]);
  expect(spec.diagnostics.filter((d) => d.source === 'ref')).toHaveLength(3);
});
it('handles references back to the current edited root document', () => {
  const doc = JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Edited', version: '1' },
    paths: { '/test': { get: { responses: { '200': { $ref: './objects.yaml#/Response' } } } } },
    components: { schemas: { Value: { type: 'number' } } },
  });
  const spec = parseApiSpec(doc, {
    rootFilename: 'root.json',
    files: {
      'root.json': '{}',
      'objects.yaml':
        'Response:\n  description: OK\n  content:\n    application/json:\n      schema:\n        $ref: ./root.json#/components/schemas/Value',
    },
  });
  expect(spec.endpoints[0].responses[0].content[0].schema?.type).toBe('number');
});
