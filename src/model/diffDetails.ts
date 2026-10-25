export interface FieldChange {
  path: string;
  before: unknown;
  after: unknown;
  reason: string;
}

/** Explain canonical model values supplied by the production diff engine. */
export function describeFieldChanges(before: unknown, after: unknown): FieldChange[] {
  const changes: FieldChange[] = [];
  function visit(oldValue: unknown, newValue: unknown, path: string, depth: number) {
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;
    if (changes.length >= 200) return;
    if (
      depth < 16 &&
      oldValue &&
      newValue &&
      typeof oldValue === 'object' &&
      typeof newValue === 'object'
    ) {
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        const key = ['statusCode', 'contentType', 'name'].find((field) =>
          [...oldValue, ...newValue].every(
            (value) => value && typeof value === 'object' && typeof value[field] === 'string'
          )
        );
        if (key) {
          const identity = (value: Record<string, unknown>) =>
            `${value[key]}${key === 'name' && value.in ? ` (${value.in})` : ''}`;
          const oldItems = new Map(oldValue.map((value) => [identity(value), value]));
          const newItems = new Map(newValue.map((value) => [identity(value), value]));
          for (const name of new Set([...oldItems.keys(), ...newItems.keys()]))
            visit(oldItems.get(name), newItems.get(name), `${path}[${name}]`, depth + 1);
          return;
        }
      } else if (!Array.isArray(oldValue) && !Array.isArray(newValue)) {
        const oldEntries = new Map(Object.entries(oldValue));
        const newEntries = new Map(Object.entries(newValue));
        for (const key of new Set([...oldEntries.keys(), ...newEntries.keys()]))
          visit(oldEntries.get(key), newEntries.get(key), path ? `${path}.${key}` : key, depth + 1);
        return;
      }
    }
    const reason = /(?:security|scopes|flows)/i.test(path)
      ? 'Authentication requirements changed. Check credentials and required scopes.'
      : /\.type$/.test(path)
        ? 'The accepted or returned value type changed. Update serialization or response handling.'
        : /required/.test(path)
          ? 'Required fields changed. Check request construction and response assumptions.'
          : /(?:enum|minimum|maximum|Length|Items|pattern|format)/.test(path)
            ? 'Allowed values or constraints changed. Check existing payloads against the new contract.'
            : /(?:summary|description|title|example|tags)/.test(path)
              ? 'Documentation or examples changed.'
              : oldValue === undefined
                ? 'A field was added. Review the new contract.'
                : newValue === undefined
                  ? 'A field was removed. Review callers that depend on it.'
                  : 'The contract changed. Review the before and after values.';
    changes.push({ path: path || 'value', before: oldValue, after: newValue, reason });
  }
  visit(before, after, '', 0);
  return changes;
}
