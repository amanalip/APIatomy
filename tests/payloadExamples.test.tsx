import { expect, it } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { suppliedPayloadExamples, serializePayloadExample } from '../src/model/payloadExamples';
import { PayloadViewer } from '../src/ui/PayloadViewer';
import { mount, click } from './reactHarness';
const spec = (examples: unknown) => JSON.stringify({ openapi: '3.0.3', paths: { '/test': { get: { responses: { 200: { description: 'ok', content: { 'application/json': { schema: { type: 'boolean' }, examples } } } } } } } });
it.each([false, 0, '', null])('preserves literal example %j with or without a schema', (value) => {
  expect(suppliedPayloadExamples({ contentType: 'application/json', example: value })[0].value).toBe(value);
});
it('resolves named example references locally and explains external values', () => {
  const text = spec({ zero: { $ref: './examples.yaml#/Zero' }, missing: { $ref: '#/components/examples/Missing' }, remote: { externalValue: 'https://example.com/payload.json' } });
  const media = parseApiSpec(text, { rootFilename: 'api/root.json', files: { 'api/examples.yaml': 'Zero:\n  summary: A zero value\n  description: Preserved literally\n  value: 0' } }).endpoints[0].responses[0].content[0];
  expect(media.examples?.zero).toMatchObject({ value: 0, summary: 'A zero value' });
  expect(media.examples?.missing.unresolvedReason).toContain('unresolved');
  expect(media.examples?.remote.unresolvedReason).toContain('not fetched');
});
it('keeps prototype-like example names and literal property names', () => {
  const values = Object.fromEntries([['__proto__', {value: {description: false}}], ['constructor', {value: 0}]]);
  const media = parseApiSpec(spec(values)).endpoints[0].responses[0].content[0];
  expect(suppliedPayloadExamples(media).map((item) => item.label)).toEqual(['__proto__', 'constructor']);
});
it('serializes non-JSON text literally and reports cycles', () => {
  expect(serializePayloadExample('<x/>', 'application/xml').text).toBe('<x/>');
  expect(serializePayloadExample('', 'text/plain').text).toBe('');
  const cyclic: any = {}; cyclic.self = cyclic;
  expect(serializePayloadExample(cyclic, 'application/json').error).toContain('cyclic');
});
it('shows supplied values alongside schemas and identifies generated choices', () => {
  const view = mount(<PayloadViewer media={{ contentType: 'application/json', schema: { type: 'boolean' }, example: false }} direction="response" schemas={{}}><span>Schema tree</span></PayloadViewer>);
  click([...view.container.querySelectorAll('button')].find((button) => button.textContent === 'Examples')!);
  expect(view.container.textContent).toContain('Supplied example');
  expect(view.container.querySelector('pre')?.textContent).toBe('false');
  expect(view.container.querySelector('option[value="generated"]')).not.toBeNull();
  view.unmount();
});
