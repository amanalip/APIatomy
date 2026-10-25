import { act } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { UrlImportDialog } from '../src/ui/UrlImportDialog';
import { readImportResponse } from '../src/utils/readImportResponse';
import { MAX_PROJECT_BYTES } from '../src/share/projectLimits';
import { mount, input, click } from './reactHarness';

let view: ReturnType<typeof mount>;
afterEach(() => {
  view?.unmount();
  vi.unstubAllGlobals();
});
function setup() {
  const pending: Array<{ signal: AbortSignal; resolve: (value: Response) => void }> = [];
  const onLoad = vi.fn();
  const onClose = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url, options) =>
        new Promise<Response>((resolve) => pending.push({ resolve, signal: options.signal }))
    )
  );
  view = mount(<UrlImportDialog onLoad={onLoad} onClose={onClose} />);
  input(document.querySelector('input')!, 'https://example.com/api.json');
  const load = () =>
    click([...document.querySelectorAll('button')].find((b) => b.textContent === 'Load')!);
  return { pending, onLoad, onClose, load };
}
const response = (text = 'openapi: 3.0.3\npaths: {}') =>
  ({ ok: true, headers: new Headers(), text: async () => text }) as Response;
it.each(['close', 'escape', 'backdrop', 'unmount'])(
  'suppresses pending results after %s',
  async (method) => {
    const { pending, onLoad, load } = setup();
    load();
    if (method === 'close') click(document.querySelector('button[aria-label="Close"]'));
    if (method === 'escape')
      act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    if (method === 'backdrop') click(document.querySelector('[role="dialog"]'));
    if (method === 'unmount') view.unmount();
    expect(pending[0].signal.aborted).toBe(true);
    await act(async () => pending[0].resolve(response()));
    expect(onLoad).not.toHaveBeenCalled();
  }
);
it('prevents duplicate Enter submissions and ignores a cancelled request after retry', async () => {
  const { pending, onLoad, load } = setup();
  load();
  act(() =>
    document
      .querySelector('input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  );
  expect(pending).toHaveLength(1);
  click([...document.querySelectorAll('button')].find((b) => b.textContent === 'Cancel')!);
  load();
  expect(pending).toHaveLength(2);
  await act(async () => pending[0].resolve(response('STALE')));
  expect(onLoad).not.toHaveBeenCalled();
  await act(async () => pending[1].resolve(response('openapi: 3.0.3\ninfo: {title: LATEST}\npaths: {}')));
  expect(onLoad).toHaveBeenCalledWith('openapi: 3.0.3\ninfo: {title: LATEST}\npaths: {}', 'https://example.com/api.json', expect.any(AbortSignal));
});
it('cancels an oversized stream without trusting the declared length', async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_PROJECT_BYTES + 1));
    },
    cancel,
  });
  await expect(
    readImportResponse(
      new Response(stream, { headers: { 'content-length': '1' } }),
      new AbortController().signal
    )
  ).rejects.toThrow('20 MB');
  expect(cancel).toHaveBeenCalled();
});
it('decodes UTF-8 split across network chunks', async () => {
  const bytes = new TextEncoder().encode('é🧪');
  const stream = new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  expect(await readImportResponse(new Response(stream), new AbortController().signal)).toBe('é🧪');
});

it('keeps invalid URL responses out of app state and allows retry', async () => {
  const { pending, onLoad, onClose, load } = setup();
  load();
  await act(async () => pending[0].resolve(response('<html>Not an API</html>')));
  expect(onLoad).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('Specification');
  load();
  await act(async () => pending[1].resolve(response()));
  expect(onLoad).toHaveBeenCalledTimes(1);
});
