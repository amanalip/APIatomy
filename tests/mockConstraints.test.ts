import { describe, expect, it } from 'vitest';
import { generateMockExample } from '../src/model/mockGenerator';
import { generateSampleJsonFromSchema } from '../src/ui/CurlGenerator';
import type { SchemaModel } from '../src/model';

describe('constrained mock examples', () => {
  it.each<SchemaModel>([
    { type: 'integer', minimum: 10, maximum: 14, exclusiveMinimum: true, exclusiveMaximum: true },
    { type: 'number', exclusiveMinimum: 0.1, exclusiveMaximum: 0.2 },
    { type: 'number', minimum: 0.3, maximum: 0.9, multipleOf: 0.2 },
    { type: 'integer', exclusiveMaximum: -2 },
    { type: 'integer', exclusiveMinimum: 10.5, maximum: 12 },
    { type: 'number', exclusiveMinimum: 0.1, exclusiveMaximum: 0.1001 },
  ])('honors inclusive, exclusive and multiple bounds: %j', (schema) => {
    const result = generateMockExample(schema);
    const value = result.value as number;
    expect(result.issues).toEqual([]);
    if (schema.type === 'integer') expect(Number.isInteger(value)).toBe(true);
    if (schema.minimum !== undefined) expect(value).toBeGreaterThanOrEqual(schema.minimum);
    if (schema.maximum !== undefined) expect(value).toBeLessThanOrEqual(schema.maximum);
    if (schema.exclusiveMinimum === true) expect(value).toBeGreaterThan(schema.minimum!);
    if (schema.exclusiveMaximum === true) expect(value).toBeLessThan(schema.maximum!);
    if (typeof schema.exclusiveMinimum === 'number')
      expect(value).toBeGreaterThan(schema.exclusiveMinimum);
    if (typeof schema.exclusiveMaximum === 'number')
      expect(value).toBeLessThan(schema.exclusiveMaximum);
    if (schema.multipleOf)
      expect(value / schema.multipleOf).toBeCloseTo(Math.round(value / schema.multipleOf));
  });

  it('honors zero maxItems and creates distinct bounded items', () => {
    expect(generateMockExample({ type: 'array', maxItems: 0, items: { type: 'string' } })).toEqual({
      value: [],
      issues: [],
    });
    const result = generateMockExample({
      type: 'array',
      minItems: 3,
      maxItems: 3,
      uniqueItems: true,
      items: { type: 'integer', minimum: 1, maximum: 3 },
    });
    expect(result.issues).toEqual([]);
    expect(new Set(result.value as number[]).size).toBe(3);
    expect((result.value as number[]).every((value) => value >= 1 && value <= 3)).toBe(true);
  });

  it('honors string lengths and object counts, including required fields', () => {
    const schema: SchemaModel = {
      type: 'object',
      minProperties: 3,
      maxProperties: 3,
      required: ['name'],
      properties: { name: { type: 'string', minLength: 20, maxLength: 20 } },
      additionalProperties: true,
    };
    const result = generateMockExample(schema);
    expect(result.issues).toEqual([]);
    expect(Object.keys(result.value as object)).toHaveLength(3);
    expect((result.value as { name: string }).name).toHaveLength(20);
    expect(JSON.parse(generateSampleJsonFromSchema(schema))).toEqual(result.value);
  });

  it.each<SchemaModel>([
    { type: 'integer', minimum: 1, maximum: 1, exclusiveMinimum: true },
    { type: 'string', minLength: 10, maxLength: 2 },
    { type: 'array', minItems: 3, maxItems: 1 },
    { type: 'array', minItems: 3, uniqueItems: true, items: { type: 'boolean' } },
    { type: 'string', pattern: '^(a+)+$' },
    { type: 'string', raw: { const: 'fixed' } },
    { type: 'object', required: ['missing'], additionalProperties: false },
    { type: 'string', example: 123 },
    { not: { type: 'string' } },
    { oneOf: [{ type: 'integer' }, { type: 'number' }] },
  ])('explains impossible or unsupported constraints: %j', (schema) => {
    const result = generateMockExample(schema);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(() => JSON.stringify(result.value)).not.toThrow();
  });

  it('bounds large examples and recursive generation', () => {
    expect(
      generateMockExample({ type: 'string', minLength: 100000 }).issues.length
    ).toBeGreaterThan(0);
    expect(generateMockExample({ type: 'array', minItems: 100000 }).issues.length).toBeGreaterThan(
      0
    );
    const node: SchemaModel = { type: 'object', properties: { next: { refTarget: 'Node' } } };
    expect(generateMockExample(node, { Node: node }).issues.join(' ')).toContain('nested levels');
  });
});
