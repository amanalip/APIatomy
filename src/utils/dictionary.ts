/** A string-keyed dictionary with no inherited entries or prototype setters. */
export function dictionary<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

export function hasOwn(object: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/** Own-key lookup with the same indexed-access typing as Record<string, T>. */
export function ownValue<T>(object: Record<string, T>, key: string): T {
  return (hasOwn(object, key) ? object[key] : undefined) as T;
}
