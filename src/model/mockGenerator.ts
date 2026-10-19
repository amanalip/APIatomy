import { SchemaModel } from './index';
import { MAX_MOCK_ARRAY_ITEMS, MAX_MOCK_DEPTH } from '../utils/schemaRefs';
import { dictionary, hasOwn, ownValue } from '../utils/dictionary';

const MAX_STRING_LENGTH = 1024;
const formats: Record<string, string> = {
  email: 'alex@example.com',
  'date-time': '2026-08-23T14:30:00.000Z',
  date: '2026-08-23',
  time: '14:30:00Z',
  ipv4: '192.168.1.1',
  ipv6: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
  hostname: 'api.example.com',
  uuid: 'a1b2c3d4-e5f6-7a8b-9c0d-ef1234567890',
  uri: 'https://api.example.com',
  byte: 'U3dhZ2dlciByb2Nrcw==',
  binary: 'SGVsbG8gV29ybGQ=',
  password: 's3cret-P@ssw0rd',
};
export interface MockExample {
  value: unknown;
  issues: string[];
}
function typeOf(schema: SchemaModel): string | undefined {
  return Array.isArray(schema.type)
    ? schema.type.find((type) => type !== 'null') || 'null'
    : schema.type;
}
function effective(schema: SchemaModel, schemas: Record<string, SchemaModel>): SchemaModel {
  const target = schema.refTarget && ownValue(schemas, schema.refTarget);
  return target ? { ...target, ...schema, refTarget: undefined } : schema;
}
function numericBounds(schema: SchemaModel) {
  const lower = Math.max(
    schema.minimum ?? -Infinity,
    typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum : -Infinity
  );
  const upper = Math.min(
    schema.maximum ?? Infinity,
    typeof schema.exclusiveMaximum === 'number' ? schema.exclusiveMaximum : Infinity
  );
  const strictLower =
    (typeof schema.exclusiveMinimum === 'number' && lower === schema.exclusiveMinimum) ||
    (schema.exclusiveMinimum === true && lower === schema.minimum);
  const strictUpper =
    (typeof schema.exclusiveMaximum === 'number' && upper === schema.exclusiveMaximum) ||
    (schema.exclusiveMaximum === true && upper === schema.maximum);
  return { lower, upper, strictLower, strictUpper };
}
function validNumber(value: number, schema: SchemaModel): boolean {
  const { lower, upper, strictLower, strictUpper } = numericBounds(schema);
  return (
    Number.isFinite(value) &&
    (typeOf(schema) !== 'integer' || Number.isInteger(value)) &&
    (strictLower ? value > lower : value >= lower) &&
    (strictUpper ? value < upper : value <= upper) &&
    (schema.multipleOf === undefined ||
      (schema.multipleOf > 0 &&
        Math.abs(value / schema.multipleOf - Math.round(value / schema.multipleOf)) < 1e-8))
  );
}
function numberValue(schema: SchemaModel, variant: number): number {
  const integer = typeOf(schema) === 'integer';
  const { lower, upper, strictLower, strictUpper } = numericBounds(schema);
  const step = schema.multipleOf && schema.multipleOf > 0 ? schema.multipleOf : integer ? 1 : 0.01;
  let base = Number.isFinite(lower)
    ? lower
    : Number.isFinite(upper) && upper < 1
      ? upper
      : integer
        ? 1
        : 19.99;
  if (schema.multipleOf)
    base = Number.isFinite(lower) ? Math.ceil(base / step) * step : Math.floor(base / step) * step;
  if (integer && !schema.multipleOf) base = Math.ceil(base);
  if (strictLower && base <= lower)
    base = lower + Math.max(step, Number.EPSILON * Math.max(1, Math.abs(lower)));
  if (base > upper || (strictUpper && base >= upper)) {
    base = integer ? Math.floor(upper) : upper;
    if (strictUpper && base >= upper)
      base -= Math.max(step, Number.EPSILON * Math.max(1, Math.abs(upper)));
    if (schema.multipleOf) base = Math.floor(base / step) * step;
  }
  if (integer) base = Math.ceil(base);
  if (
    !integer &&
    !schema.multipleOf &&
    !validNumber(base, schema) &&
    Number.isFinite(lower) &&
    Number.isFinite(upper)
  )
    base = lower + (upper - lower) / 2;
  for (let attempt = variant; attempt < variant + 100; attempt++) {
    for (const candidate of [base + attempt * step, base - attempt * step]) {
      const rounded = Number(candidate.toPrecision(15));
      if (validNumber(rounded, schema)) return rounded;
      if (validNumber(candidate, schema)) return candidate;
    }
  }
  return base; // The result validator explains unsatisfiable bounds.
}

function generate(
  schemaInput: SchemaModel,
  schemas: Record<string, SchemaModel>,
  depth: number,
  variant: number,
  issues: string[]
): unknown {
  const schema = effective(schemaInput, schemas);
  const type = typeOf(schema);
  if (variant === 0 && schema.example !== undefined) return structuredClone(schema.example);
  if (variant === 0 && schema.default !== undefined) return structuredClone(schema.default);
  if (schema.enum?.length) return structuredClone(schema.enum[variant % schema.enum.length]);
  if (depth > MAX_MOCK_DEPTH) {
    issues.push(
      `Example generation stops after ${MAX_MOCK_DEPTH} nested levels; recursive values need review.`
    );
    if (type === 'object' || schema.properties) return {};
    if (type === 'array' || schema.items) return [];
    if (type === 'integer' || type === 'number') return 0;
    if (type === 'boolean') return false;
    return '...';
  }
  if (schema.allOf?.length) {
    const values = schema.allOf.map((sub) => generate(sub, schemas, depth + 1, variant, issues));
    const objects = values.filter(
      (value) => value && typeof value === 'object' && !Array.isArray(value)
    );
    if (objects.length === values.length) {
      const merged = Object.assign(dictionary<unknown>(), ...objects);
      if (schema.properties)
        for (const [key, prop] of Object.entries(schema.properties))
          merged[key] = generate(prop, schemas, depth + 1, variant, issues);
      return merged;
    }
    return values[values.length - 1];
  }
  const choices = schema.oneOf || schema.anyOf;
  if (choices?.length)
    return generate(choices[variant % choices.length], schemas, depth + 1, variant, issues);
  if (schema.not) {
    issues.push(
      'Automatic generation for not constraints is not supported; review this placeholder.'
    );
    const excluded = typeOf(schema.not);
    return excluded === 'string'
      ? 12345
      : excluded === 'number' || excluded === 'integer'
        ? 'not-a-number'
        : excluded === 'boolean'
          ? 'not-boolean'
          : excluded === 'array'
            ? {}
            : excluded === 'object'
              ? []
              : 'not_excluded_value';
  }
  if (type === 'null') return null;
  if (type === 'string') {
    let value =
      (schema.format && ownValue(formats, schema.format)) || schema.name || 'string_value';
    if (variant) value = variant.toString(36) + value;
    const minimum = Math.max(0, schema.minLength || 0);
    const maximum = Math.min(MAX_STRING_LENGTH, schema.maxLength ?? MAX_STRING_LENGTH);
    if (minimum > MAX_STRING_LENGTH)
      issues.push(`String examples are limited to ${MAX_STRING_LENGTH} characters.`);
    const chars = Array.from(value);
    value = chars.slice(0, Math.max(0, maximum)).join('');
    if (Array.from(value).length < Math.min(minimum, maximum))
      value += 'x'.repeat(Math.min(minimum, maximum) - Array.from(value).length);
    return value;
  }
  if (type === 'integer' || type === 'number') return numberValue(schema, variant);
  if (type === 'boolean') return variant % 2 === 0;
  if (type === 'array' || schema.items) {
    const minimum = Math.max(0, schema.minItems || 0);
    const count = Math.max(
      0,
      Math.min(schema.maxItems ?? Infinity, MAX_MOCK_ARRAY_ITEMS, Math.max(minimum, 1))
    );
    if (minimum > MAX_MOCK_ARRAY_ITEMS)
      issues.push(`Array examples are limited to ${MAX_MOCK_ARRAY_ITEMS} items.`);
    const result: unknown[] = [];
    const seen = new Set<string>();
    for (
      let index = 0;
      result.length < count && index < (schema.uniqueItems ? 100 : count);
      index++
    ) {
      const item = schema.items
        ? generate(
            schema.items,
            schemas,
            depth + 1,
            schema.uniqueItems ? index + variant : variant,
            issues
          )
        : `item${schema.uniqueItems ? index : ''}`;
      const key = JSON.stringify(item);
      if (!schema.uniqueItems || !seen.has(key)) {
        result.push(item);
        seen.add(key);
      }
    }
    return result;
  }
  const object: Record<string, unknown> = dictionary();
  const properties = schema.properties || {};
  const required = new Set(schema.required || []);
  const entries = Object.entries(properties).sort(
    ([a], [b]) => Number(required.has(b)) - Number(required.has(a))
  );
  const maximum = Math.min(50, Math.max(schema.maxProperties ?? 50, required.size));
  for (const [key, prop] of entries.slice(0, maximum))
    object[key] = generate(prop, schemas, depth + 1, variant, issues);
  if (entries.length > 50) issues.push('Object examples are limited to 50 properties.');
  if (
    schema.additionalProperties !== false &&
    (schema.minProperties || typeof schema.additionalProperties === 'object')
  ) {
    const target = Math.min(
      50,
      Math.max(schema.minProperties || 0, Object.keys(object).length + 1)
    );
    for (let i = 0; Object.keys(object).length < Math.min(maximum, target); i++) {
      const name = i === 0 ? 'additionalProp' : `additionalProp${i}`;
      if (!hasOwn(object, name))
        object[name] = generate(
          typeof schema.additionalProperties === 'object'
            ? schema.additionalProperties
            : { type: 'string' },
          schemas,
          depth + 1,
          variant + i,
          issues
        );
    }
  }
  return object;
}

/** Deterministic best-effort data. UI consumers should use generateMockExample for limitations. */
export function generateMockData(
  schema: SchemaModel,
  allSchemas: Record<string, SchemaModel> = {},
  depth = 0
): unknown {
  return generate(schema, allSchemas, depth, 0, []);
}

/** Check supported constraints and explicitly report constraints we cannot verify. */
function validate(
  value: unknown,
  input: SchemaModel,
  schemas: Record<string, SchemaModel>,
  path: string,
  depth: number
): string[] {
  if (depth > MAX_MOCK_DEPTH + 2)
    return [`${path}: recursive constraints could not be fully verified.`];
  const schema = effective(input, schemas);
  const issues: string[] = [];
  const fail = (message: string) => issues.push(`${path}: ${message}`);
  const type = typeOf(schema);
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (
    types.length &&
    !types.includes(actual as never) &&
    !(
      actual === 'number' &&
      ((types.includes('integer') && Number.isInteger(value)) || types.includes('number'))
    ) &&
    !(value === null && schema.nullable)
  )
    fail(`generated value does not match type ${types.join(' or ')}.`);
  if (schema.enum && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value)))
    fail('no allowed enum value was generated.');
  if (typeof value === 'number' && !validNumber(value, schema))
    fail(
      `no ${type === 'integer' ? 'integer' : 'number'} satisfying the numeric bounds and multipleOf could be generated.`
    );
  if (typeof value === 'string') {
    const length = Array.from(value).length;
    if (length < (schema.minLength ?? 0) || length > (schema.maxLength ?? Infinity))
      fail('string length constraints could not be satisfied.');
    if (schema.format && !hasOwn(formats, schema.format))
      fail(`format "${schema.format}" is not supported for automatic validation.`);
    if (
      schema.format &&
      ownValue(formats, schema.format) &&
      value !== ownValue(formats, schema.format)
    )
      fail(`format "${schema.format}" could not be verified after applying other constraints.`);
  }
  if (schema.pattern) fail('pattern constraints are not automatically generated or verified.');
  for (const key of [
    'const',
    'contains',
    'if',
    'then',
    'else',
    'dependentSchemas',
    'patternProperties',
    'unevaluatedProperties',
    'prefixItems',
    '$dynamicRef',
  ])
    if (schema.raw && hasOwn(schema.raw, key))
      fail(`keyword "${key}" is not supported for automatic generation.`);
  if (Array.isArray(value)) {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity))
      fail('array length constraints could not be satisfied.');
    if (
      schema.uniqueItems &&
      new Set(value.map((item) => JSON.stringify(item))).size !== value.length
    )
      fail('array items must be unique.');
    if (schema.items)
      value.forEach((item, index) =>
        issues.push(...validate(item, schema.items!, schemas, `${path}[${index}]`, depth + 1))
      );
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (
      keys.length < (schema.minProperties ?? 0) ||
      keys.length > (schema.maxProperties ?? Infinity)
    )
      fail('object property count constraints could not be satisfied.');
    for (const name of schema.required || [])
      if (!hasOwn(record, name)) fail(`required property "${name}" is missing.`);
    for (const [key, item] of Object.entries(record)) {
      const property = schema.properties && ownValue(schema.properties, key);
      const additional = schema.additionalProperties;
      if (property) issues.push(...validate(item, property, schemas, `${path}.${key}`, depth + 1));
      else if (additional && typeof additional === 'object')
        issues.push(...validate(item, additional, schemas, `${path}.${key}`, depth + 1));
      else if (additional === false) fail(`additional property "${key}" is not allowed.`);
    }
  }
  for (const sub of schema.allOf || [])
    issues.push(...validate(value, sub, schemas, path, depth + 1));
  const choices = schema.oneOf || schema.anyOf;
  if (choices?.length) {
    const matches = choices.filter(
      (sub) => validate(value, sub, schemas, path, depth + 1).length === 0
    ).length;
    if (!matches || (schema.oneOf && matches !== 1))
      fail('composition constraints could not be verified for this example.');
  }
  return issues;
}

export function generateMockExample(
  schema: SchemaModel,
  allSchemas: Record<string, SchemaModel> = {}
): MockExample {
  const issues: string[] = [];
  let value: unknown;
  try {
    value = generate(schema, allSchemas, 0, 0, issues);
    issues.push(...validate(value, schema, allSchemas, '$', 0));
    JSON.stringify(value);
  } catch {
    value = null;
    issues.push('This schema or example cannot be safely generated and serialized.');
  }
  return { value, issues: [...new Set(issues)] };
}
