import { expect, it } from 'vitest';
import { compareSpecTexts, stableValue } from '../src/model/specDiff';

function spec(name: string, type: string) {
  return JSON.stringify({
    openapi: '3.1.0',
    info: { title: 'Test', version: '1' },
    paths: {
      '/test': {
        get: {
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { [name]: { type } } },
                },
              },
            },
          },
        },
      },
    },
  });
}
it.each([
  'title',
  'description',
  'raw',
  'summary',
  'example',
  'examples',
  'tags',
  'deprecated',
  'properties',
])('keeps structural changes to a property named %s', (name) => {
  expect(compareSpecTexts(spec(name, 'string'), spec(name, 'integer')).changedDetails).toEqual([
    expect.objectContaining({ key: 'get /test', cls: 'breaking', fields: expect.arrayContaining([expect.objectContaining({ path: `responses[200].content[application/json].schema.properties.${name}.type`, before: 'string', after: 'integer' })]) }),
  ]);
});
it('still classifies actual schema documentation as documentation-only', () => {
  const before = JSON.parse(spec('title', 'string'));
  const after = structuredClone(before);
  before.paths['/test'].get.responses['200'].content['application/json'].schema.description =
    'Before';
  after.paths['/test'].get.responses['200'].content['application/json'].schema.description =
    'After';
  expect(
    compareSpecTexts(JSON.stringify(before), JSON.stringify(after)).changedDetails[0].cls
  ).toBe('documentation-only');
});
it('preserves literal enum and example objects, including metadata-like keys', () => {
  expect(stableValue({ enum: [{ raw: 'first', title: 'one' }] }, true)).not.toBe(
    stableValue({ enum: [{ raw: 'second', title: 'one' }] }, true)
  );
  expect(stableValue({ example: { raw: 1, description: 2 } })).toContain('"raw":1');
});
