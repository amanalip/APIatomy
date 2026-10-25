import { expect, it } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { compareSpecTexts } from '../src/model/specDiff';
import { computeApiTopologyGraph } from '../src/layout/graphLayout';
import { WEBHOOKS_SPEC } from '../src/samples/webhooks';
const operation = (type = 'string') => ({ requestBody: { content: { 'application/json': { schema: { type } } } }, responses: { 200: { description: 'ok' } } });
const document = (type = 'string') => JSON.stringify({ openapi: '3.1.0', info: { title: 'Outbound', version: '1' }, paths: { '/same': { post: { ...operation(), callbacks: { delivered: { '{$request.body#/url}': { post: operation(type) } } } } } }, webhooks: { '/same': { post: operation(type) } } });
it('explores the shipped webhooks and callbacks sample without losing runtime expressions', () => {
  const spec = parseApiSpec(WEBHOOKS_SPEC);
  expect(spec.endpoints.filter((ep) => ep.kind === 'webhook')).toHaveLength(2);
  const callback = spec.endpoints.find((ep) => ep.kind === 'callback')!;
  expect(callback.expression).toBe('{$request.body#/callbackUrl}');
  expect(callback.parentEndpointId).toBe('post_/subscriptions');
  expect(callback.requestBody?.content[0].schema?.properties).toHaveProperty('id');
});
it('resolves referenced callbacks and nested payloads relative to their uploaded document', () => {
  const root = JSON.stringify({ openapi: '3.1.0', paths: { '/register': { post: { ...operation(), callbacks: { delivery: { $ref: './callbacks.yaml#/Delivery' } } } } } });
  const spec = parseApiSpec(root, { rootFilename: 'api/root.json', files: { 'api/callbacks.yaml': 'Delivery:\n  "{$request.query.url}":\n    post:\n      requestBody:\n        content:\n          application/json:\n            schema:\n              $ref: ./models.yaml#/Payload\n      responses:\n        "200": {description: ok}', 'api/models.yaml': 'Payload: {type: object, properties: {externalField: {type: integer}}}' } });
  expect(spec.endpoints.find((ep) => ep.kind === 'callback')?.requestBody?.content[0].schema?.properties?.externalField.type).toBe('integer');
});
it('connects callback nodes to their parent and keeps outbound identities distinct', () => {
  const spec = parseApiSpec(document());
  expect(new Set(spec.endpoints.map((ep) => ep.id)).size).toBe(3);
  const graph = computeApiTopologyGraph(spec);
  const callback = spec.endpoints.find((ep) => ep.kind === 'callback')!;
  expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'ep_post_/same', target: `ep_${callback.id}`, data: { label: 'calls back', type: 'callback' } }));
});
it('diffs outbound payload changes independently from inbound operations', () => {
  const diff = compareSpecTexts(document(), document('integer'));
  expect(diff.changedDetails).toHaveLength(2);
  expect(diff.changedDetails.every((item) => item.cls === 'breaking')).toBe(true);
  expect(diff.changedDetails.some((item) => item.key.startsWith('webhook:'))).toBe(true);
  expect(diff.changedDetails.some((item) => item.key.startsWith('callback:'))).toBe(true);
});
it('warns when recursive callback exploration reaches its supported depth', () => {
  const text = JSON.stringify({ openapi: '3.1.0', paths: { '/register': { post: { ...operation(), callbacks: { again: { $ref: '#/components/callbacks/repeat' } } } } }, components: { callbacks: { repeat: { '{$request.query.url}': { post: { ...operation(), callbacks: { again: { $ref: '#/components/callbacks/repeat' } } } } } } } });
  const spec = parseApiSpec(text);
  expect(spec.diagnostics.some((item) => item.id.startsWith('outbound-depth-'))).toBe(true);
  expect(spec.endpoints.length).toBeLessThan(12);
});

it('bounds branching callback expansion and warns rather than silently omitting it', () => {
  const callbacks = Object.fromEntries(['one', 'two', 'three'].map((name) => [name, { $ref: '#/components/callbacks/repeat' }]));
  const nested = { post: { responses: { 200: { description: 'ok' } }, callbacks } };
  const text = JSON.stringify({ openapi: '3.1.0', paths: { '/register': nested }, components: { callbacks: { repeat: { '{$request.query.url}': nested } } } });
  const spec = parseApiSpec(text);
  expect(spec.endpoints.filter((ep) => ep.kind === 'callback').length).toBe(2000);
  expect(spec.diagnostics.some((item) => item.id === 'outbound-count-limit')).toBe(true);
});

it('validates webhook-only roots without marking their payload schemas unused', () => {
  const text = JSON.stringify({ openapi: '3.1.0', info: { title: 'Webhook only', version: '1' }, webhooks: { delivered: { post: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Payload' } } } }, responses: { 200: { description: 'ok' } } } } }, components: { schemas: { Payload: { type: 'string' } } } });
  const parsed = parseApiSpec(text);
  expect(parsed.endpoints).toHaveLength(1);
  expect(parsed.diagnostics.some((item) => item.id === 'missing-paths-object' || item.id.includes('unused-schema-Payload') || item.id.startsWith('missing-path-param-'))).toBe(false);
});
