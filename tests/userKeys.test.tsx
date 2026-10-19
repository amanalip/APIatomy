import { afterEach, expect, it } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { resolveJsonPointer } from '../src/parser/refResolver';
import { generateMockData } from '../src/model/mockGenerator';
import { compareSpecTexts } from '../src/model/specDiff';
import { computeApiTopologyGraph } from '../src/layout/graphLayout';
import { EndpointExplorer } from '../src/ui/EndpointExplorer';
import { mount, click } from './reactHarness';

const names = ['__proto__', 'constructor', 'toString'];
const text = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'Names', version: '1' },
  paths: Object.fromEntries(
    names.map((name) => [
      `/${name}`,
      {
        get: {
          tags: [name],
          responses: {
            '200': {
              description: 'OK',
              content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } },
            },
          },
        },
      },
    ])
  ),
  components: {
    schemas: Object.fromEntries(
      names.map((name) => [name, { type: 'object', properties: { [name]: { type: 'string' } } }])
    ),
    securitySchemes: Object.fromEntries(
      names.map((name) => [name, { type: 'apiKey', in: 'header', name }])
    ),
  },
});
let view: ReturnType<typeof mount>;
afterEach(() => view?.unmount());
it('preserves reserved names through normalization and worker-style cloning', () => {
  const parsed = structuredClone(parseApiSpec(text));
  expect(Object.keys(parsed.schemas)).toEqual(names);
  expect(Object.keys(parsed.securitySchemes)).toEqual(names);
  for (const name of names) {
    expect(Object.keys(parsed.schemas[name].properties!)).toEqual([name]);
    const sample = generateMockData(parsed.schemas[name]);
    expect(Object.prototype.hasOwnProperty.call(sample, name)).toBe(true);
    expect(JSON.parse(JSON.stringify(sample))[name]).toEqual(expect.any(String));
  }
  expect(computeApiTopologyGraph(parsed).nodes).toHaveLength(6);
});
it('renders and collapses reserved tag names without inherited values', () => {
  const parsed = structuredClone(parseApiSpec(text));
  view = mount(
    <EndpointExplorer
      endpoints={parsed.endpoints}
      selectedEndpoint={null}
      onSelectEndpoint={() => {}}
    />
  );
  expect(view.container.querySelectorAll('[data-testid="endpoint-card"]')).toHaveLength(3);
  const group = view.container.querySelector('[aria-expanded="true"]')!;
  click(group);
  expect(view.container.querySelectorAll('[data-testid="endpoint-card"]')).toHaveLength(2);
  click(group);
  expect(view.container.querySelectorAll('[data-testid="endpoint-card"]')).toHaveLength(3);
});
it('does not resolve inherited members as schema references', () => {
  expect(resolveJsonPointer({}, '#/constructor')).toBeUndefined();
  expect(resolveJsonPointer({}, '#/__proto__')).toBeUndefined();
  expect(generateMockData({ type: 'string', refTarget: 'constructor' }, {})).toBe('string_value');
});
it('detects components whose names match inherited object members', () => {
  const before = JSON.stringify({
    openapi: '3.1.0',
    info: { title: 'Names', version: '1' },
    paths: {},
  });
  expect(compareSpecTexts(before, text).addedSchemas).toEqual(names);
});
