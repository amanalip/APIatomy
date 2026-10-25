import { expect, it } from 'vitest';
import { compareSpecTexts } from '../src/model/specDiff';
import { describeFieldChanges } from '../src/model/diffDetails';
import { DiffView } from '../src/ui/DiffView';
import { mount } from './reactHarness';
const spec = (type: string) => JSON.stringify({ openapi: '3.0.3', info: { title: 'Review', version: '1' }, paths: { '/price': { get: { responses: { 200: { description: 'ok', content: { 'application/json': { schema: { type: 'object', properties: { price: { type } } } } } } } } } } });
it('explains response field types using production compatibility results', () => {
  const change = compareSpecTexts(spec('number'), spec('string')).changedDetails[0];
  expect(change.cls).toBe('breaking');
  expect(change.fields).toContainEqual(expect.objectContaining({ path: 'responses[200].content[application/json].schema.properties.price.type', before: 'number', after: 'string', reason: expect.stringContaining('value type') }));
});
it('bounds large explanations while preserving arbitrary property names', () => {
  const before = Object.fromEntries(Array.from({ length: 250 }, (_, i) => [String(i), 0]));
  expect(describeFieldChanges(before, Object.fromEntries(Object.keys(before).map((key) => [key, 1])))).toHaveLength(200);
  expect(describeFieldChanges(JSON.parse('{"__proto__":1}'), JSON.parse('{"__proto__":2}'))[0].path).toBe('__proto__');
});
it('rejects non-API roots instead of returning a successful empty diff', () => {
  expect(compareSpecTexts('{}', spec('number')).oldParseError).toBe(true);
});
it('shows incomplete readiness without misleading result counts', () => {
  const view = mount(<DiffView oldText="" newText={spec('number')} currentText={spec('number')} onOldChange={() => {}} onNewChange={() => {}} />);
  expect(view.container.textContent).toContain('Choose both specifications');
  expect(view.container.textContent).not.toContain('Added (0)');
  view.unmount();
});
it('distinguishes invalid and unchanged states', () => {
  const props = { currentText: spec('number'), onOldChange: () => {}, onNewChange: () => {} };
  const invalid = mount(<DiffView {...props} oldText="{}" newText={spec('number')} />);
  expect(invalid.container.textContent).toContain('Comparison unavailable');
  invalid.unmount();
  const unchanged = mount(<DiffView {...props} oldText={spec('number')} newText={spec('number')} />);
  expect(unchanged.container.textContent).toContain('Specifications are unchanged');
  unchanged.unmount();
});
