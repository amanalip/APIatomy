import { compressSpecToHash } from './urlHash';
import { parse as parseYaml } from 'yaml';

export const SHARE_WARN_BYTES = 100 * 1024;
export const SHARE_LARGE_BYTES = 200 * 1024;

export function getCompactSpecText(specText: string): string | null {
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
  return null;
}

export function getShareHash(specText: string, compact = false): string {
  if (compact) {
    const compactText = getCompactSpecText(specText);
    if (compactText === null) return '';
    return compressSpecToHash(compactText);
  }
  return compressSpecToHash(specText);
}

export function getShareUrl(specText: string, compact = false, appState?: Record<string, unknown>): string {
  if (typeof window === 'undefined') return getShareHash(specText, compact);
  const hash = getShareHash(specText, compact);
  if (!hash) return '';
  if (appState && Object.keys(appState).length > 0) {
    try {
      const stateStr = encodeURIComponent(JSON.stringify(appState));
      return `${window.location.origin}${window.location.pathname}${hash}&state=${stateStr}`;
    } catch {
      return `${window.location.origin}${window.location.pathname}${hash}`;
    }
  }
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

export function decodeAppState(hash: string): Record<string, unknown> | null {
  try {
    const params = new URLSearchParams(hash.replace(/^[#?]+/, ''));
    const state = params.get('state');
    if (!state) return null;
    const json = decodeURIComponent(state);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getShareSize(specText: string, compact = false, appState?: Record<string, unknown>): { bytes: number; kb: string; urlLength: number; isWarn: boolean; isLarge: boolean } {
  const hash = getShareHash(specText, compact);
  const url = typeof window !== 'undefined' ? getShareUrl(specText, compact, appState) : hash;
  if (!hash) return { bytes: 0, kb: '0.0', urlLength: 0, isWarn: false, isLarge: false };
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

export async function nativeShare(specText: string, title = 'APIatomy spec', customUrl?: string): Promise<boolean> {
  const url = customUrl || getShareUrl(specText);
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
