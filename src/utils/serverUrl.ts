/**
 * Normalize server URLs by stripping trailing slashes and encoding variables.
 * Centralized helper to avoid duplicated replace logic across CurlGenerator and normalizer.
 */
export function normalizeServerUrl(url: string): string {
  return (url || 'https://api.example.com').replace(/\/+$/, '');
}

export function joinUrl(base: string, path: string): string {
  const normBase = normalizeServerUrl(base);
  const normPath = path.startsWith('/') ? path : `/${path}`;
  return `${normBase}${normPath}`;
}

export function sanitizeHeaderValue(val: string): string {
  return String(val)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}
