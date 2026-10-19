export const MAX_SPEC_BYTES = 5 * 1024 * 1024;
export const MAX_PROJECT_BYTES = 20 * 1024 * 1024;
export function textBytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}
export function assertTextLimit(text: string, limit: number, label: string): void {
  if (text.length > limit || textBytes(text) > limit)
    throw new Error(`${label} exceeds ${limit / 1024 / 1024} MB`);
}
