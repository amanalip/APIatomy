import { afterEach, expect, it, vi } from 'vitest';
import { parseApiSpec } from '../src/parser';

function workerScope() {
  const scope = {
    postMessage: vi.fn(),
    onmessage: undefined as unknown as (event: { data: unknown }) => void,
  };
  vi.stubGlobal('self', scope);
  return scope;
}
afterEach(() => vi.unstubAllGlobals());

it('the parser worker receives project files and clears them for the next request', async () => {
  const scope = workerScope();
  await import('../src/workers/parserWorker');
  const rawText = JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Worker', version: '1' },
    paths: {},
    components: { schemas: { Value: { $ref: './value.yaml#/Value' } } },
  });
  scope.onmessage({
    data: {
      id: 1,
      rawText,
      files: { 'api/value.yaml': 'Value:\n  type: string' },
      rootFilename: 'api/root.json',
    },
  });
  expect(scope.postMessage.mock.calls[0][0].result.schemas.Value.type).toBe('string');
  scope.onmessage({ data: { id: 2, rawText } });
  expect(scope.postMessage.mock.calls[1][0].result.schemas.Value.type).toBeUndefined();
});
it('the compression worker prepares both hashes and reports malformed input', async () => {
  const scope = workerScope();
  await import('../src/workers/compressWorker');
  scope.onmessage({ data: { project: { specText: 'openapi: 3.0.0\npaths: {}', files: {} } } });
  expect(scope.postMessage.mock.calls[0][0].result.hash).toContain('#spec=');
  expect(scope.postMessage.mock.calls[0][0].result.compactHash).toContain('#spec=');
  scope.onmessage({ data: { project: null } });
  expect(scope.postMessage.mock.calls[1][0].error).toEqual(expect.any(String));
});
it('the layout worker returns a graph and reports malformed input', async () => {
  const scope = workerScope();
  await import('../src/workers/layoutWorker');
  const spec = parseApiSpec('openapi: 3.0.0\ninfo: {title: Test, version: "1"}\npaths: {}');
  scope.onmessage({ data: { spec, direction: 'LR' } });
  expect(scope.postMessage.mock.calls[0][0]).toEqual({ nodes: [], edges: [] });
  scope.onmessage({ data: { spec: null, direction: 'LR' } });
  expect(scope.postMessage.mock.calls[1][0].error).toEqual(expect.any(String));
});
