import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canUseNativeShare,
  decodeAppState,
  downloadShareFile,
  getCompactSpecText,
  getShareSize,
  getShareUrl,
  measureShareUrl,
  nativeShare,
} from '../src/share/shareService';
import { decodeProject } from '../src/share/project';
import { decompressSpecFromHash } from '../src/share/urlHash';
import { setFileMap } from '../src/parser/fileMap';

const text = 'openapi: 3.0.0\ninfo: {title: Test, version: "1"}\npaths: {}';
afterEach(() => {
  setFileMap({});
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('production share services', () => {
  it('round-trips normal and compact links including percent characters in state', () => {
    for (const compact of [false, true]) {
      const url = getShareUrl(text, compact, { endpointId: 'get_%25', view: 'graph' });
      expect(decodeAppState(new URL(url).hash)).toEqual({ endpointId: 'get_%25', view: 'graph' });
      expect(decodeProject(decompressSpecFromHash(new URL(url).hash)!).specText).toContain(
        'openapi'
      );
      expect(getShareSize(text, compact, { endpointId: 'get_%25', view: 'graph' })).toEqual(
        measureShareUrl(url)
      );
    }
  });
  it('handles invalid compact input and app state', () => {
    expect(getCompactSpecText('openapi: [')).toBeNull();
    expect(getShareUrl('openapi: [', true)).toBe('');
    expect(decodeAppState('#state=invalid')).toBeNull();
    expect(decodeAppState('#spec=abc')).toBeNull();
    expect(getShareSize('', true).bytes).toBe(0);
  });
  it('measures actual UTF-8 bytes and warning thresholds', () => {
    expect(measureShareUrl('é').bytes).toBe(2);
    expect(measureShareUrl('a'.repeat(101 * 1024)).isWarn).toBe(true);
    expect(measureShareUrl('a'.repeat(201 * 1024)).isLarge).toBe(true);
  });
  it('downloads complete project files and cleans up the object URL', async () => {
    let saved: Blob | undefined;
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn((blob: Blob) => {
          saved = blob;
          return 'blob:test';
        }),
        revokeObjectURL: vi.fn(),
      })
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setFileMap({ 'root.yaml': text, 'schema.yaml': 'type: string' }, 'root.yaml');
    downloadShareFile(text);
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a')?.download).toBe('apiatomy-project.json');
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(saved!);
    });
    expect(decodeProject(content).files['schema.yaml']).toBe('type: string');
    await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test'));
    expect(document.querySelector('a')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
  it('uses native sharing when available and handles cancellation', async () => {
    expect(canUseNativeShare()).toBe(false);
    expect(await nativeShare(text)).toBe(false);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    expect(await nativeShare(text, 'Test', 'https://example.com/#spec=test')).toBe(true);
    expect(share).toHaveBeenCalledWith({
      title: 'Test',
      text: 'Test',
      url: 'https://example.com/#spec=test',
    });
    share.mockRejectedValueOnce(new Error('Cancelled'));
    expect(await nativeShare(text)).toBe(false);
  });
});
