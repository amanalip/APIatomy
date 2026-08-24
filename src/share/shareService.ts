import { compressSpecToHash } from './urlHash';
import { parse as parseYaml } from 'yaml';

export const SHARE_WARN_BYTES = 100 * 1024;
export const SHARE_LARGE_BYTES = 200 * 1024;

export function getCompactSpecText(specText: string): string {
  const trimmed = specText.trim();
  if (!trimmed) return specText;
  try {
    const jsonObj = JSON.parse(trimmed);
    return JSON.stringify(jsonObj);
  } catch {
    // not JSON
  }
  try {
    const yamlObj = parseYaml(trimmed);
    if (yamlObj && typeof yamlObj === 'object') {
      return JSON.stringify(yamlObj);
    }
  } catch {
    // ignore
  }
  const withoutComments = trimmed
    .split('\n')
    .map((line) => {
      const hashIdx = line.indexOf('#');
      if (hashIdx >= 0) {
        const before = line.slice(0, hashIdx);
        if (before.trim() === '') return '';
        return before.trimEnd();
      }
      return line;
    })
    .filter((l) => l.trim() !== '')
    .join('\n');
  return withoutComments.replace(/\s+/g, ' ').trim();
}

export function getShareHash(specText: string, compact = false): string {
  const text = compact ? getCompactSpecText(specText) : specText;
  return compressSpecToHash(text);
}

export function getShareUrl(specText: string, compact = false): string {
  if (typeof window === 'undefined') return getShareHash(specText, compact);
  const hash = getShareHash(specText, compact);
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

export function getShareSize(specText: string, compact = false): { bytes: number; kb: string; urlLength: number; isWarn: boolean; isLarge: boolean } {
  const hash = getShareHash(specText, compact);
  const url = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}${hash}` : hash;
  let bytes: number;
  try {
    bytes = new TextEncoder().encode(url).length;
  } catch {
    bytes = url.length;
  }
  const kb = (bytes / 1024).toFixed(1);
  return {
    bytes,
    kb,
    urlLength: url.length,
    isWarn: bytes > SHARE_WARN_BYTES,
    isLarge: bytes > SHARE_LARGE_BYTES,
  };
}

export function downloadShareFile(specText: string, filename = 'apiatomy-share.yaml'): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([specText], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as unknown as { share?: unknown }).share === 'function';
}

export async function nativeShare(specText: string, title = 'APIatomy spec'): Promise<boolean> {
  const url = getShareUrl(specText);
  if (!canUseNativeShare()) return false;
  try {
    await (navigator as unknown as { share: (data: { title: string; text: string; url: string }) => Promise<void> }).share({
      title,
      text: title,
      url,
    });
    return true;
  } catch {
    return false;
  }
}
