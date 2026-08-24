export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function asString(value: unknown, fallback?: string): string | undefined {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback?: number): number | undefined {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
}

/**
 * Narrow unknown to non-empty trimmed string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Assert a value is a plain record (non-array object). */
export function assertRecord(
  value: unknown,
  label = 'value'
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`${label} must be a plain object`);
}
