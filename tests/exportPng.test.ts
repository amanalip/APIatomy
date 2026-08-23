import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportGraphToPng } from '../src/graph/exportPng';

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

import { toPng } from 'html-to-image';

describe('PNG Image Export Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when target element is not found in DOM', async () => {
    const mockDoc = {
      getElementById: vi.fn().mockReturnValue(null),
      createElement: vi.fn(),
    };
    vi.stubGlobal('document', mockDoc);

    const success = await exportGraphToPng('non-existent-id');
    expect(success).toBe(false);
    expect(toPng).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('generates PNG and triggers anchor download when element exists', async () => {
    const mockElement = { id: 'graph-canvas' };
    const mockAnchor = {
      download: '',
      href: '',
      click: vi.fn(),
    };
    const mockDoc = {
      getElementById: vi.fn().mockReturnValue(mockElement),
      createElement: vi.fn().mockReturnValue(mockAnchor),
    };
    vi.stubGlobal('document', mockDoc);

    const mockDataUrl = 'data:image/png;base64,samplebase64data';
    vi.mocked(toPng).mockResolvedValueOnce(mockDataUrl);

    const success = await exportGraphToPng('graph-canvas', 'my-api-graph.png', '#020617');

    expect(success).toBe(true);
    expect(toPng).toHaveBeenCalledWith(mockElement as any, expect.objectContaining({
      backgroundColor: '#020617',
      quality: 0.95,
      pixelRatio: 2,
    }));
    expect(mockAnchor.download).toBe('my-api-graph.png');
    expect(mockAnchor.href).toBe(mockDataUrl);
    expect(mockAnchor.click).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('returns false and catches exceptions when toPng fails', async () => {
    const mockElement = { id: 'graph-canvas' };
    const mockDoc = {
      getElementById: vi.fn().mockReturnValue(mockElement),
      createElement: vi.fn(),
    };
    vi.stubGlobal('document', mockDoc);

    vi.mocked(toPng).mockRejectedValueOnce(new Error('Canvas render error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const success = await exportGraphToPng('graph-canvas');

    expect(success).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
