import { SchemaModel } from './index';
import { dictionary, ownValue } from '../utils/dictionary';
import { MAX_MOCK_DEPTH } from '../utils/schemaRefs';

export type ExampleDirection = 'neutral' | 'request' | 'response';

/** Project schema positions only: supplied example and default values remain literal data. */
export function schemaForDirection(
  schema: SchemaModel,
  schemas: Record<string, SchemaModel>,
  direction: ExampleDirection,
  depth = 0
): SchemaModel {
  if (direction === 'neutral' || depth > MAX_MOCK_DEPTH) return schema;
  const target = schema.refTarget && ownValue(schemas, schema.refTarget);
  const result: SchemaModel = { ...(target || {}), ...schema, refTarget: undefined };
  const excluded = new Set<string>();
  if (result.properties) {
    const properties = dictionary<SchemaModel>();
    for (const [name, property] of Object.entries(result.properties)) {
      const definition = property.refTarget && ownValue(schemas, property.refTarget);
      const effective = { ...(definition || {}), ...property };
      if (direction === 'request' ? effective.readOnly : effective.writeOnly) excluded.add(name);
      else properties[name] = schemaForDirection(property, schemas, direction, depth + 1);
    }
    result.properties = properties;
    result.required = result.required?.filter((name) => !excluded.has(name));
  }
  if (result.items) result.items = schemaForDirection(result.items, schemas, direction, depth + 1);
  for (const key of ['allOf', 'oneOf', 'anyOf'] as const)
    result[key] = result[key]?.map((item) =>
      schemaForDirection(item, schemas, direction, depth + 1)
    );
  if (typeof result.additionalProperties === 'object')
    result.additionalProperties = schemaForDirection(
      result.additionalProperties,
      schemas,
      direction,
      depth + 1
    );
  return result;
}
