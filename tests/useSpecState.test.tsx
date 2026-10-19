import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSpecState } from '../src/hooks/useSpecState';
import { parseApiSpec } from '../src/parser';
import { setFileMap } from '../src/parser/fileMap';
import { mount } from './reactHarness';

class ParserWorker {
  static current: ParserWorker;
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    ParserWorker.current = this;
  }
}
function text(title: string) {
  return JSON.stringify({ openapi: '3.0.0', info: { title, version: '1' }, paths: {} });
}
let state: ReturnType<typeof useSpecState>;
function Probe() {
  state = useSpecState(text('Initial'));
  return <span>{state.spec.title}</span>;
}
let view: ReturnType<typeof mount>;
afterEach(() => {
  view?.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setFileMap({});
});

describe('spec state orchestration', () => {
  it('debounces edits and ignores responses for older requests', () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', ParserWorker);
    view = mount(<Probe />);
    act(() => vi.advanceTimersByTime(120));
    const worker = ParserWorker.current;
    const first = worker.postMessage.mock.calls[0][0];
    act(() => {
      state.setRawText(text('Second'));
    });
    act(() => {
      worker.onmessage?.({ data: { id: first.id, result: parseApiSpec(text('Stale')) } });
    });
    expect(state.spec.title).toBe('Initial');
    act(() => {
      state.setRawText(text('Newest'));
      vi.advanceTimersByTime(119);
    });
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(120));
    const latest = worker.postMessage.mock.calls.at(-1)![0];
    expect(latest.rawText).toBe(text('Newest'));
    act(() =>
      worker.onmessage?.({ data: { id: latest.id, result: parseApiSpec(latest.rawText) } })
    );
    expect(state.spec.title).toBe('Newest');
    view.unmount();
    expect(worker.terminate).toHaveBeenCalled();
  });
  it('reparses when files change even if the root text is unchanged', () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', ParserWorker);
    view = mount(<Probe />);
    act(() => vi.advanceTimersByTime(120));
    const worker = ParserWorker.current;
    act(() =>
      setFileMap({ 'root.json': text('Initial'), 'schema.yaml': 'type: string' }, 'root.json')
    );
    act(() => vi.advanceTimersByTime(120));
    expect(worker.postMessage.mock.calls.at(-1)![0]).toMatchObject({
      files: { 'schema.yaml': 'type: string' },
      rootFilename: 'root.json',
    });
  });
  it('keeps parsing future edits after a worker failure', () => {
    vi.stubGlobal('Worker', ParserWorker);
    view = mount(<Probe />);
    const worker = ParserWorker.current;
    act(() => worker.onerror?.());
    act(() => state.setRawText(text('Fallback')));
    expect(state.spec.title).toBe('Fallback');
    expect(worker.terminate).toHaveBeenCalled();
  });
  it('parses without worker support', () => {
    vi.stubGlobal('Worker', undefined);
    view = mount(<Probe />);
    act(() => state.setRawText(text('No worker')));
    expect(state.spec.title).toBe('No worker');
  });
});
