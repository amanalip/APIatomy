import { SchemaModel } from '../model';
import { getFileContent, resolveFilePath } from './fileMap';
import { parse as parseYaml } from 'yaml';

export interface RefResolutionContext {
  rootDoc: Record<string, unknown>;
  resolvedCache: Map<string, SchemaModel>;
  visitingPath: Set<string>;
  basePath?: string;
  files?: Map<string, string>;
}

function getCacheKey(ref: string, basePath?: string): string {
  if (!ref) return ref;
  if (isExternalRef(ref))
    return `${resolveFilePath(ref, basePath)}${ref.includes('#') ? ref.slice(ref.indexOf('#')) : ''}`;
  return basePath ? `${basePath}${ref}` : ref;
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
    const cacheKey = getCacheKey(ref, context.basePath);
    const normalizedRef = (() => {
      try {
        return decodeURIComponent(ref);
      } catch {
        return ref;
      }
    })();
    const normalizedKey = getCacheKey(normalizedRef, context.basePath);
    if (context.visitingPath.has(cacheKey) || context.visitingPath.has(normalizedKey)) {
      return {
        $ref: ref,
        refTarget: targetName,
        name: schemaName || targetName,
        isCircular: true,
        title: targetName,
        description: `Circular reference to ${targetName}`,
      };
    }

    if (context.resolvedCache.has(cacheKey)) {
      return applyReferenceSiblings(
        context.resolvedCache.get(cacheKey)!,
        s,
        context,
        targetName,
        schemaName
      );
    }

    let resolvedRaw: unknown = resolveJsonPointer(context.rootDoc, ref);
    let externalDoc: Record<string, unknown> | null = null;
    let externalBase: string | undefined;
    if ((!resolvedRaw || typeof resolvedRaw !== 'object') && isExternalRef(ref)) {
      const fileContent = getFileContent(ref, context.basePath, context.files);
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
          const candidate =
            pointer === '#/' || pointer === '#' || pointer === ''
              ? doc
              : resolveJsonPointer(doc, pointer.startsWith('#') ? pointer : `#${pointer}`);
          if (candidate && typeof candidate === 'object') {
            resolvedRaw = candidate;
            externalDoc = doc;
            externalBase = resolveFilePath(ref, context.basePath);
          }
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

    context.visitingPath.add(cacheKey);
    const childContext: RefResolutionContext = externalDoc
      ? {
          rootDoc: externalDoc,
          resolvedCache: context.resolvedCache,
          visitingPath: context.visitingPath,
          files: context.files,
          basePath: externalBase || '',
        }
      : context;
    let resolved: SchemaModel;
    try {
      resolved = resolveSchema(resolvedRaw, childContext, targetName);
    } finally {
      context.visitingPath.delete(cacheKey);
    }
    // Cache only the target. Siblings belong to this reference occurrence.
    context.resolvedCache.set(cacheKey, structuredClone(resolved));
    return applyReferenceSiblings(resolved, s, context, targetName, schemaName);
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

function applyReferenceSiblings(
  target: SchemaModel,
  reference: Record<string, unknown>,
  context: RefResolutionContext,
  targetName: string,
  schemaName?: string
): SchemaModel {
  const result = structuredClone(target);
  const siblingRaw = { ...reference };
  delete siblingRaw.$ref;
  if (Object.keys(siblingRaw).length) {
    const sibling = resolveSchema(siblingRaw, context, schemaName);
    // Only explicitly provided fields override the target. Normalization also
    // supplies default flags (e.g. nullable:false), which are not overrides.
    for (const key of Object.keys(siblingRaw)) {
      const modelKey = key === 'examples' ? 'example' : key;
      if (modelKey === 'raw' || modelKey === 'id' || modelKey === 'name') continue;
      const value = (sibling as unknown as Record<string, unknown>)[modelKey];
      if (value !== undefined) (result as unknown as Record<string, unknown>)[modelKey] = value;
    }
    if (target.properties && sibling.properties) {
      result.properties = { ...result.properties, ...sibling.properties };
    }
    if (target.required && sibling.required) {
      result.required = Array.from(new Set([...target.required, ...sibling.required]));
    }
    if (sibling.allOf) result.allOf = [...(target.allOf || []), ...sibling.allOf];
  }
  return {
    ...result,
    $ref: reference.$ref as string,
    refTarget: targetName,
    name: schemaName || targetName,
  };
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
