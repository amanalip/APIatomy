import { SchemaModel } from './index';
import { MAX_MOCK_ARRAY_ITEMS, MAX_MOCK_DEPTH } from '../utils/schemaRefs';

/**
 * Generate deterministic mock data for a SchemaModel, respecting enum/default/example
 * and composition (allOf/oneOf/anyOf). Depth-limited to prevent infinite recursion
 * on circular references. Uses distinct object clones for array items.
 */

export function generateMockData(
  schema: SchemaModel,
  allSchemas: Record<string, SchemaModel> = {},
  depth = 0
): unknown {
  // Normalize type checks for OpenAPI 3.1 array types (e.g. ['string','null'])
  const normalizeType = (t: unknown): string | undefined =>
    Array.isArray(t) ? (t as string[]).find((v) => v !== 'null') : (t as string | undefined);
  const normType = normalizeType(schema.type);

  // Prioritize explicit values even at recursion depth limit
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];

  if (depth > MAX_MOCK_DEPTH) {
    if (normType === 'object' || schema.properties) return {};
    if (normType === 'array' || schema.items) return [];
    if (normType === 'integer' || normType === 'number') return 0;
    if (normType === 'boolean') return false;
    return '...';
  }

  if (schema.refTarget && allSchemas[schema.refTarget]) {
    return generateMockData(allSchemas[schema.refTarget], allSchemas, depth + 1);
  }

  // Handle allOf / oneOf / anyOf composition in mock generation
  if (schema.allOf && schema.allOf.length > 0) {
    const merged: Record<string, unknown> = {};
    for (const sub of schema.allOf) {
      const subData = generateMockData(sub, allSchemas, depth + 1);
      if (typeof subData === 'object' && subData !== null) {
        Object.assign(merged, subData);
      }
    }
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        merged[key] = generateMockData(prop, allSchemas, depth + 1);
      }
    }
    return merged;
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    return generateMockData(schema.oneOf[0], allSchemas, depth + 1);
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    return generateMockData(schema.anyOf[0], allSchemas, depth + 1);
  }

  if (schema.not) {
    // For not schemas, generate a placeholder that intentionally violates the negated type
    const notSchema = schema.not as SchemaModel;
    const notType = Array.isArray(notSchema.type)
      ? (notSchema.type as string[]).find((v) => v !== 'null')
      : (notSchema.type as string | undefined);
    if (notType === 'string') return 12345;
    if (notType === 'number' || notType === 'integer') return 'not-a-number';
    if (notType === 'boolean') return 'not-boolean';
    if (notType === 'array') return {};
    if (notType === 'object') return [];
    return 'not_excluded_value';
  }

  if (normType === 'string') {
    if (schema.format === 'email') return 'alex@example.com';
    if (schema.format === 'date-time') return '2026-08-23T14:30:00.000Z';
    if (schema.format === 'date') return '2026-08-23';
    if (schema.format === 'time') return '14:30:00Z';
    if (schema.format === 'ipv4') return '192.168.1.1';
    if (schema.format === 'ipv6') return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    if (schema.format === 'hostname') return 'api.example.com';
    if (schema.format === 'uuid') return 'a1b2c3d4-e5f6-7a8b-9c0d-ef1234567890';
    if (schema.format === 'uri') return 'https://api.example.com';
    if (schema.format === 'byte') return 'U3dhZ2dlciByb2Nrcw==';
    if (schema.format === 'binary') return 'SGVsbG8gV29ybGQ='; // base64 realistic
    if (schema.format === 'password') return 's3cret-P@ssw0rd';
    return schema.name || 'string_value';
  }

  if (normType === 'integer') {
    if (schema.minimum !== undefined) return schema.minimum;
    if (schema.maximum !== undefined && schema.maximum < 1) return schema.maximum;
    return 1;
  }

  if (normType === 'number') {
    if (schema.minimum !== undefined) return schema.minimum;
    if (schema.maximum !== undefined && schema.maximum < 1) return schema.maximum;
    return 19.99;
  }

  if (normType === 'boolean') {
    return true;
  }

  if (normType === 'array' || schema.items) {
    const count =
      typeof schema.minItems === 'number' && schema.minItems > 0
        ? Math.min(schema.minItems, MAX_MOCK_ARRAY_ITEMS)
        : 1;
    // Generate distinct object per index to avoid shared reference mutation
    return Array.from({ length: count }, () => {
      const item = schema.items ? generateMockData(schema.items, allSchemas, depth + 1) : 'item';
      // clone objects/arrays per element
      if (typeof item === 'object' && item !== null) return JSON.parse(JSON.stringify(item));
      return item;
    });
  }

  if (schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      obj[key] = generateMockData(prop, allSchemas, depth + 1);
    }
    // Include sample for additionalProperties map types
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      obj['additionalProp'] = generateMockData(
        schema.additionalProperties as SchemaModel,
        allSchemas,
        depth + 1
      );
    }
    return obj;
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    return {
      additionalProp: generateMockData(
        schema.additionalProperties as SchemaModel,
        allSchemas,
        depth + 1
      ),
    };
  }

  return {};
}
