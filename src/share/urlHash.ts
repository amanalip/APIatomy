import LZString from 'lz-string';

export function compressSpecToHash(specText: string): string {
  if (!specText) return '';
  const compressed = LZString.compressToEncodedURIComponent(specText);
  return `#spec=${compressed}`;
}

export function decompressSpecFromHash(hashString: string): string | null {
  if (!hashString) return null;
  const cleanHash = hashString.startsWith('#') ? hashString.slice(1) : hashString;
  const params = new URLSearchParams(cleanHash);
  const specEncoded = params.get('spec');

  if (!specEncoded) return null;

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(specEncoded);
    return decompressed || null;
  } catch {
    return null;
  }
}

export function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }

  // Fallback for older browsers
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    textArea.remove();
    return Promise.resolve(successful);
  } catch {
    return Promise.resolve(false);
  }
}
