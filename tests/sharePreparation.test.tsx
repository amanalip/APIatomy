import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareDialog } from '../src/ui/ShareDialog';
import * as preparation from '../src/share/sharePreparation';
import { decodeAppState, measureShareUrl } from '../src/share/shareService';
import { decompressSpecFromHash } from '../src/share/urlHash';
import { decodeProject } from '../src/share/project';
import { setFileMap } from '../src/parser/fileMap';
import { mount, click } from './reactHarness';

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    TestWorker.instances.push(this);
  }
}
const text = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Large', version: '1', description: 'x'.repeat(90000) },
  paths: {},
});
let view: ReturnType<typeof mount>;
afterEach(() => {
  view?.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  TestWorker.instances = [];
  setFileMap({});
});

describe('share preparation', () => {
  it('uses one worker for both links and reuses hashes when view state changes', () => {
    vi.stubGlobal('Worker', TestWorker);
    const prepare = vi.spyOn(preparation, 'prepareShare');
    const close = vi.fn();
    view = mount(<ShareDialog specText={text} onClose={close} appState={{ view: 'graph' }} />);
    expect(prepare).not.toHaveBeenCalled();
    expect(TestWorker.instances).toHaveLength(1);
    const worker = TestWorker.instances[0];
    const project = worker.postMessage.mock.calls[0][0].project;
    const result = preparation.prepareShare(project);
    prepare.mockClear();
    act(() => worker.onmessage?.({ data: { result } }));
    const normal = document.querySelector<HTMLInputElement>('[aria-label="Shareable URL"]')!;
    expect(decodeProject(decompressSpecFromHash(new URL(normal.value).hash)!).specText).toBe(text);
    expect(measureShareUrl(normal.value).bytes).toBe(new TextEncoder().encode(normal.value).length);
    click(document.querySelector('input[type="checkbox"]'));
    expect(decodeAppState(new URL(normal.value).hash)).toEqual({ view: 'graph' });
    view.rerender(<ShareDialog specText={text} onClose={close} appState={{ view: 'schemas' }} />);
    expect(decodeAppState(new URL(normal.value).hash)).toEqual({ view: 'schemas' });
    click(document.querySelectorAll('input[type="checkbox"]')[1]);
    const compact = document.querySelector<HTMLInputElement>(
      '[aria-label="Compact shareable URL"]'
    )!;
    expect(compact.value).toBe(normal.value);
    expect(TestWorker.instances).toHaveLength(1);
    expect(prepare).not.toHaveBeenCalled();
  });
  it('discards stale results and stops workers when the spec changes', () => {
    vi.stubGlobal('Worker', TestWorker);
    view = mount(<ShareDialog specText={text} onClose={() => {}} />);
    const old = TestWorker.instances[0];
    const oldResult = preparation.prepareShare(old.postMessage.mock.calls[0][0].project);
    const changed = text.replace('Large', 'Changed');
    view.rerender(<ShareDialog specText={changed} onClose={() => {}} />);
    act(() => old.onmessage?.({ data: { result: oldResult } }));
    expect(document.querySelector<HTMLInputElement>('[aria-label="Shareable URL"]')!.value).toBe(
      'Preparing link...'
    );
    expect(old.terminate).toHaveBeenCalled();
    const next = TestWorker.instances[1];
    act(() =>
      next.onmessage?.({
        data: { result: preparation.prepareShare(next.postMessage.mock.calls[0][0].project) },
      })
    );
    const url = document.querySelector<HTMLInputElement>('[aria-label="Shareable URL"]')!.value;
    expect(decodeProject(decompressSpecFromHash(new URL(url).hash)!).specText).toBe(changed);
  });
  it('falls back once if the worker fails', () => {
    vi.stubGlobal('Worker', TestWorker);
    const prepare = vi.spyOn(preparation, 'prepareShare');
    view = mount(<ShareDialog specText={text} onClose={() => {}} />);
    act(() => TestWorker.instances[0].onerror?.());
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector<HTMLInputElement>('[aria-label="Shareable URL"]')!.value
    ).toContain('#spec=');
  });
  it('keeps multi-file dependencies in both prepared links', () => {
    const root = '{"openapi":"3.1.0","paths":{}}';
    const project = {
      specText: root,
      files: { 'root.json': root, 'schema.yaml': 'type: string' },
      rootFilename: 'root.json',
    };
    const result = preparation.prepareShare(project);
    for (const hash of [result.hash, result.compactHash!]) {
      expect(decodeProject(decompressSpecFromHash(hash)!).files['schema.yaml']).toBe(
        'type: string'
      );
    }
  });
});
