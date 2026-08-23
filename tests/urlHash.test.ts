import { describe, it, expect } from 'vitest';
import { compressSpecToHash, decompressSpecFromHash } from '../src/share/urlHash';
import { MINIMAL_SPEC } from '../src/samples/minimal';

describe('URL Hash Codec', () => {
  it('compresses and decompresses OpenAPI specs without loss', () => {
    const hash = compressSpecToHash(MINIMAL_SPEC);
    expect(hash.startsWith('#spec=')).toBe(true);

    const recovered = decompressSpecFromHash(hash);
    expect(recovered).toBe(MINIMAL_SPEC);
  });

  it('decompresses URI-encoded plain text fallback', () => {
    const encoded = `#spec=${encodeURIComponent(MINIMAL_SPEC)}`;
    const recovered = decompressSpecFromHash(encoded);
    expect(recovered).toBe(MINIMAL_SPEC);
  });

  it('handles invalid hash gracefully', () => {
    expect(decompressSpecFromHash('')).toBeNull();
    expect(decompressSpecFromHash('#unknown=123')).toBeNull();
    expect(decompressSpecFromHash('#spec=invalidgarbage')).toBeNull();
  });
});
