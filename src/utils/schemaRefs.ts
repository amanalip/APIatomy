import { SchemaModel } from '../model';

/**
 * Unified traversal over SchemaModel that collects every referenced schema name.
 * Parity set: properties, items, additionalProperties, not, allOf/oneOf/anyOf, refTarget
 * Used by normalizer, validator, graphLayout, refResolver.
 */
export function collectSchemaRefs(
  schema: SchemaModel | null | undefined,
  target: Set<string>
): void {
  if (!schema || typeof schema !== 'object') return;
  if (schema.refTarget) target.add(schema.refTarget);
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) collectSchemaRefs(prop, target);
  }
  if (schema.items) collectSchemaRefs(schema.items, target);
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    collectSchemaRefs(schema.additionalProperties as SchemaModel, target);
  }
  if (schema.not) collectSchemaRefs(schema.not, target);
  if (schema.allOf) for (const sub of schema.allOf) collectSchemaRefs(sub, target);
  if (schema.oneOf) for (const sub of schema.oneOf) collectSchemaRefs(sub, target);
  if (schema.anyOf) for (const sub of schema.anyOf) collectSchemaRefs(sub, target);
}

export const VALID_HTTP_METHODS = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'options',
  'head',
  'trace',
] as const;
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
export const MAX_MOCK_DEPTH = 4;
export const MAX_MOCK_ARRAY_ITEMS = 5;
