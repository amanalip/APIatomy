import { SchemaModel } from '../model';
import { getFileContent } from './fileMap';
import { parse as parseYaml } from 'yaml';

export interface RefResolutionContext {
  rootDoc: Record<string, unknown>;
  resolvedCache: Map<string, SchemaModel>;
  visitingPath: Set<string>;
}

export function extractRefTargetName(ref: string): string {
  if (!ref) return '';
  const hashPart = ref.includes('#') ? (ref.split('#').pop() as string) : ref;
  const pointer = hashPart.startsWith('/') ? hashPart : `/${hashPart}`;
  const parts = pointer.split('/');
  const rawTarget = parts[parts.length - 1] || ref;
  const hashless = rawTarget.split('#')[0] || rawTarget;
  try {
    return decodeURIComponent(hashless.replace(/~1/g, '/').replace(/~0/g, '~'));
  } catch {
    return hashless.replace(/~1/g, '/').replace(/~0/g, '~');
  }
}

export function isExternalRef(ref: string): boolean {
  if (!ref) return false;
  if (ref.startsWith('#/')) return false;
  if (ref.startsWith('#')) return false;
  return true;
}

export function resolveJsonPointer(doc: Record<string, unknown>, pointer: string): unknown {
  if (!pointer) return undefined;
  let effectivePointer = pointer;
  if (pointer.includes('#')) {
    const hashIdx = pointer.indexOf('#');
    const after = pointer.slice(hashIdx + 1);
    if (!after || after === '' || after === '/') return undefined;
    effectivePointer = after.startsWith('/') ? `#${after}` : `#/${after}`;
    const filePart = pointer.slice(0, hashIdx);
    if (filePart && filePart.trim() !== '' && filePart !== '.' && filePart !== './') {
      return undefined;
    }
  }
  if (!effectivePointer.startsWith('#/')) {
    return undefined;
  }

  const parts = effectivePointer
    .slice(2)
    .split('/')
    .map((p) => {
      const unescaped = p.replace(/~1/g, '/').replace(/~0/g, '~');
      try {
        return decodeURIComponent(unescaped);
      } catch {
        return unescaped;
      }
    });

  let current: unknown = doc;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function resolveSchema(
  rawSchema: unknown,
  context: RefResolutionContext,
  schemaName?: string
): SchemaModel {
  if (typeof rawSchema !== 'object' || rawSchema === null) {
    return {
      type: 'any',
      name: schemaName,
    };
  }

  const s = rawSchema as Record<string, unknown>;

  // Check for $ref
  if (typeof s.$ref === 'string') {
    const ref = s.$ref;
    const targetName = extractRefTargetName(ref);

    // Circular reference check - normalize encoded ref for comparison
    const canonicalPath = `#/components/schemas/${targetName}`;
    const normalizedRef = (() => {
      try {
        return decodeURIComponent(ref);
      } catch {
        return ref;
      }
    })();
    if (
      context.visitingPath.has(ref) ||
      context.visitingPath.has(normalizedRef) ||
      (targetName && context.visitingPath.has(canonicalPath))
    ) {
      return {
        $ref: ref,
        refTarget: targetName,
        name: schemaName || targetName,
        isCircular: true,
        title: targetName,
        description: `Circular reference to ${targetName}`,
      };
    }

    // Cache lookup - deep clone composed structures to avoid mutation leaking into cache
    if (context.resolvedCache.has(ref)) {
      const cached = context.resolvedCache.get(ref)!;
      return {
        ...cached,
        properties: cached.properties ? { ...cached.properties } : undefined,
        items: cached.items ? { ...cached.items } : undefined,
        additionalProperties:
          typeof cached.additionalProperties === 'object' && cached.additionalProperties !== null
            ? ({ ...(cached.additionalProperties as Record<string, unknown>) } as any)
            : cached.additionalProperties,
        allOf: cached.allOf ? [...cached.allOf] : undefined,
        oneOf: cached.oneOf ? [...cached.oneOf] : undefined,
        anyOf: cached.anyOf ? [...cached.anyOf] : undefined,
        not: cached.not ? { ...cached.not } : undefined,
        $ref: ref,
        refTarget: targetName,
        name: schemaName || targetName,
      };
    }

    let resolvedRaw: unknown = resolveJsonPointer(context.rootDoc, ref);
    if ((!resolvedRaw || typeof resolvedRaw !== 'object') && isExternalRef(ref)) {
      const fileContent = getFileContent(ref);
      if (fileContent) {
        try {
          const parsed = fileContent.trim().startsWith('{')
            ? JSON.parse(fileContent)
            : parseYaml(fileContent);
          const hashIdx = ref.indexOf('#');
          const pointer = hashIdx >= 0 ? ref.slice(hashIdx) : '#/';
          const doc =
            typeof parsed === 'object' && parsed !== null
              ? (parsed as Record<string, unknown>)
              : ({ value: parsed } as Record<string, unknown>);
          resolvedRaw =
            pointer === '#/' || pointer === '#' || pointer === ''
              ? doc
              : resolveJsonPointer(doc, pointer.startsWith('#') ? pointer : `#${pointer}`);
        } catch {
          // ignore parse error
        }
      }
    }
    if (!resolvedRaw || typeof resolvedRaw !== 'object') {
      const external = isExternalRef(ref);
      return {
        $ref: ref,
        refTarget: targetName,
        name: schemaName || targetName,
        description: external
          ? `External reference not resolved offline: ${ref}`
          : `Unresolved reference: ${ref}`,
      };
    }

    context.visitingPath.add(ref);
    const resolved = resolveSchema(resolvedRaw, context, targetName);
    const hasSiblings = Object.keys(s).some((k) => k !== '$ref');
    let result: SchemaModel = {
      ...resolved,
      $ref: ref,
      refTarget: targetName,
      name: schemaName || targetName,
    };
    if (hasSiblings) {
      const siblingRaw: Record<string, unknown> = { ...s };
      delete siblingRaw.$ref;
      const siblingModel = resolveSchema(siblingRaw, context, schemaName);
      for (const [k, v] of Object.entries(siblingModel)) {
        if (
          v !== undefined &&
          k !== '$ref' &&
          k !== 'refTarget' &&
          k !== 'name' &&
          k !== 'id' &&
          k !== 'raw'
        ) {
          (result as any)[k] = v;
        }
      }
      result.$ref = ref;
      result.refTarget = targetName;
      result.name = schemaName || targetName;
      if (resolved.properties && siblingModel.properties) {
        result.properties = { ...resolved.properties, ...siblingModel.properties };
      }
      if (resolved.required && siblingModel.required) {
        const merged = new Set([...(resolved.required || []), ...(siblingModel.required || [])]);
        result.required = Array.from(merged);
      }
      if (siblingModel.allOf) {
        result.allOf = [...(resolved.allOf || []), ...siblingModel.allOf];
      }
    }
    context.visitingPath.delete(ref);

    context.resolvedCache.set(ref, result);
    return result;
  }

  // Parse direct schema object
  const model: SchemaModel = {
    id: schemaName,
    name: schemaName || (typeof s.title === 'string' ? s.title : undefined),
    title: typeof s.title === 'string' ? s.title : undefined,
    description: typeof s.description === 'string' ? s.description : undefined,
    format: typeof s.format === 'string' ? s.format : undefined,
    nullable: Boolean(s.nullable),
    readOnly: Boolean(s.readOnly),
    writeOnly: Boolean(s.writeOnly),
    deprecated: Boolean(s.deprecated),
    enum: Array.isArray(s.enum) ? s.enum : undefined,
    default: s.default,
    example: s.example ?? (Array.isArray(s.examples) ? s.examples[0] : undefined),
    minimum: typeof s.minimum === 'number' ? s.minimum : undefined,
    maximum: typeof s.maximum === 'number' ? s.maximum : undefined,
    exclusiveMinimum:
      typeof s.exclusiveMinimum === 'number' || typeof s.exclusiveMinimum === 'boolean'
        ? s.exclusiveMinimum
        : undefined,
    exclusiveMaximum:
      typeof s.exclusiveMaximum === 'number' || typeof s.exclusiveMaximum === 'boolean'
        ? s.exclusiveMaximum
        : undefined,
    multipleOf: typeof s.multipleOf === 'number' ? s.multipleOf : undefined,
    minLength: typeof s.minLength === 'number' ? s.minLength : undefined,
    maxLength: typeof s.maxLength === 'number' ? s.maxLength : undefined,
    pattern: typeof s.pattern === 'string' ? s.pattern : undefined,
    minItems: typeof s.minItems === 'number' ? s.minItems : undefined,
    maxItems: typeof s.maxItems === 'number' ? s.maxItems : undefined,
    uniqueItems: Boolean(s.uniqueItems),
    minProperties: typeof s.minProperties === 'number' ? s.minProperties : undefined,
    maxProperties: typeof s.maxProperties === 'number' ? s.maxProperties : undefined,
    required: Array.isArray(s.required) ? (s.required as string[]) : undefined,
    raw: s,
  };

  // Schema Type (can be array in OpenAPI 3.1)
  if (s.type) {
    model.type = s.type as any;
  } else if (s.properties || s.additionalProperties) {
    model.type = 'object';
  } else if (s.items) {
    model.type = 'array';
  }

  // Properties
  if (s.properties && typeof s.properties === 'object') {
    const props: Record<string, SchemaModel> = {};
    for (const [propKey, propVal] of Object.entries(s.properties as Record<string, unknown>)) {
      props[propKey] = resolveSchema(propVal, context, propKey);
    }
    model.properties = props;
  }

  // AdditionalProperties
  if (typeof s.additionalProperties === 'boolean') {
    model.additionalProperties = s.additionalProperties;
  } else if (typeof s.additionalProperties === 'object' && s.additionalProperties !== null) {
    model.additionalProperties = resolveSchema(s.additionalProperties, context);
  }

  // Array items
  if (s.items) {
    model.items = resolveSchema(s.items, context);
  }

  // Composition: allOf, oneOf, anyOf, not - typed handling
  if (Array.isArray(s.allOf)) {
    model.allOf = s.allOf.map((sub) => resolveSchema(sub, context));
  }
  if (Array.isArray(s.oneOf)) {
    model.oneOf = s.oneOf.map((sub) => resolveSchema(sub, context));
  }
  if (Array.isArray(s.anyOf)) {
    model.anyOf = s.anyOf.map((sub) => resolveSchema(sub, context));
  }
  if (s.not && typeof s.not === 'object') {
    model.not = resolveSchema(s.not, context);
  }

  return model;
}

export function collectSchemaRefs(schema: unknown, refs: Set<string> = new Set()): Set<string> {
  if (typeof schema !== 'object' || schema === null) return refs;

  const s = schema as Record<string, unknown>;
  if (typeof s.$ref === 'string') {
    const target = extractRefTargetName(s.$ref);
    if (target) refs.add(target);
  }

  if (s.properties && typeof s.properties === 'object') {
    for (const prop of Object.values(s.properties as Record<string, unknown>)) {
      collectSchemaRefs(prop, refs);
    }
  }

  if (s.items) {
    collectSchemaRefs(s.items, refs);
  }

  if (s.additionalProperties && typeof s.additionalProperties === 'object') {
    collectSchemaRefs(s.additionalProperties, refs);
  }

  if (s.not && typeof s.not === 'object') {
    collectSchemaRefs(s.not, refs);
  }

  if (Array.isArray(s.allOf)) {
    for (const sub of s.allOf) collectSchemaRefs(sub, refs);
  }
  if (Array.isArray(s.oneOf)) {
    for (const sub of s.oneOf) collectSchemaRefs(sub, refs);
  }
  if (Array.isArray(s.anyOf)) {
    for (const sub of s.anyOf) collectSchemaRefs(sub, refs);
  }

  return refs;
}
