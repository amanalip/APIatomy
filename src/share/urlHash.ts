import LZString from 'lz-string';

export function compressSpecToHash(specText: string): string {
  if (!specText) return '';
  const compressed = LZString.compressToEncodedURIComponent(specText);
  return `#spec=${compressed}`;
}

export function decompressSpecFromHash(hashString: string): string | null {
  if (!hashString) return null;
  const cleanHash = hashString.replace(/^[#?]+/, '').trim();
  if (!cleanHash) return null;

  let specEncoded: string | null = null;

  if (cleanHash.startsWith('spec=')) {
    specEncoded = cleanHash.slice(5);
  } else {
    const params = new URLSearchParams(cleanHash);
    specEncoded = params.get('spec');
  }

  // Fallback: If entire hash is raw compressed string
  if (!specEncoded && cleanHash.length > 20 && !cleanHash.includes('=')) {
    specEncoded = cleanHash;
  }

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

  // Fallback for older environments
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
