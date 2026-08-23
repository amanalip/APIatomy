import { SchemaModel } from './index';

export function generateMockData(
  schema: SchemaModel,
  allSchemas: Record<string, SchemaModel> = {},
  depth = 0
): unknown {
  if (depth > 4) {
    // Return type-aware placeholder instead of generic string to avoid type mismatch
    if (schema.type === 'object' || schema.properties) return {};
    if (schema.type === 'array' || schema.items) return [];
    if (schema.type === 'integer' || schema.type === 'number') return 0;
    if (schema.type === 'boolean') return false;
    return '...';
  }

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
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

  if (schema.type === 'string') {
    if (schema.format === 'email') return 'alex@example.com';
    if (schema.format === 'date-time') return new Date().toISOString();
    if (schema.format === 'date') return '2026-08-23';
    if (schema.format === 'time') return '14:30:00Z';
    if (schema.format === 'ipv4') return '192.168.1.1';
    if (schema.format === 'ipv6') return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    if (schema.format === 'hostname') return 'api.example.com';
    if (schema.format === 'uuid') return 'a1b2c3d4-e5f6-7a8b-9c0d-ef1234567890';
    if (schema.format === 'uri') return 'https://api.example.com';
    if (schema.format === 'byte') return 'U3dhZ2dlciByb2Nrcw==';
    if (schema.format === 'binary') return 'binary_stream';
    return schema.name || 'string_value';
  }

  if (schema.type === 'integer') {
    if (schema.minimum !== undefined) return schema.minimum;
    if (schema.maximum !== undefined && schema.maximum < 1) return schema.maximum;
    return 1;
  }

  if (schema.type === 'number') {
    if (schema.minimum !== undefined) return schema.minimum;
    if (schema.maximum !== undefined && schema.maximum < 1) return schema.maximum;
    return 19.99;
  }

  if (schema.type === 'boolean') {
    return true;
  }

  if (schema.type === 'array' || schema.items) {
    const count = typeof schema.minItems === 'number' && schema.minItems > 0 ? Math.min(schema.minItems, 5) : 1;
    const itemData = schema.items
      ? generateMockData(schema.items, allSchemas, depth + 1)
      : 'item';
    return Array.from({ length: count }, () => itemData);
  }

  if (schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      obj[key] = generateMockData(prop, allSchemas, depth + 1);
    }
    return obj;
  }

  return {};
}
