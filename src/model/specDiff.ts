import { validateImportProject } from '../share/validateImport';
import { describeFieldChanges, FieldChange } from './diffDetails';
import { hasOwn } from '../utils/dictionary';
import { ownValue } from '../utils/dictionary';
import { decodeProject } from '../share/project';
import { parseApiSpec } from '../parser';
import { ApiSpecModel, EndpointModel, SchemaModel, MediaTypeModel } from './index';

export type ChangeClass = 'breaking' | 'non-breaking' | 'documentation-only';

const documentationKeys = new Set([
  'summary',
  'description',
  'title',
  'example',
  'examples',
  'externalDocs',
  'deprecated',
  'operationId',
  'tags',
]);

/** Stable object comparison: property order and retained source AST are not API changes. */
export function stableValue(
  value: unknown,
  omitDocs = false,
  context: 'model' | 'literal' = 'model'
): string {
  const maps = new Set([
    'properties',
    'headers',
    'variables',
    'schemas',
    'securitySchemes',
    'flows',
    'scopes',
  ]);
  const literals = new Set(['enum', 'default', 'example', 'examples']);
  function clean(v: unknown, kind: 'model' | 'map' | 'literal'): unknown {
    if (Array.isArray(v)) return v.map((item) => clean(item, kind));
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v)
          .filter(
            ([key, val]) =>
              val !== undefined &&
              (kind !== 'model' || (key !== 'raw' && (!omitDocs || !documentationKeys.has(key))))
          )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, val]) => {
            const childKind =
              kind === 'literal'
                ? 'literal'
                : kind === 'map'
                  ? 'model'
                  : literals.has(key)
                    ? 'literal'
                    : maps.has(key)
                      ? 'map'
                      : 'model';
            return [key, clean(val, childKind)];
          })
      );
    return v;
  }
  return JSON.stringify(clean(value, context));
}

/** Conservative compatibility rules: uncertain structural changes require review. */
export function schemaBreaks(
  oldSchema: SchemaModel | undefined,
  newSchema: SchemaModel | undefined,
  direction: 'request' | 'response'
): boolean {
  if (stableValue(oldSchema, true) === stableValue(newSchema, true)) return false;
  if (!oldSchema || !newSchema)
    return direction === 'request' ? Boolean(newSchema) : Boolean(oldSchema);
  const oldTypes = new Set([oldSchema.type || 'any'].flat());
  const newTypes = new Set([newSchema.type || 'any'].flat());
  const offered = direction === 'request' ? oldTypes : newTypes;
  const accepted = direction === 'request' ? newTypes : oldTypes;
  if (
    !accepted.has('any') &&
    [...offered].some((t) => !accepted.has(t) && !(t === 'integer' && accepted.has('number')))
  )
    return true;
  if (
    direction === 'request'
      ? oldSchema.nullable && !newSchema.nullable
      : !oldSchema.nullable && newSchema.nullable
  )
    return true;
  const oldEnum = oldSchema.enum;
  const newEnum = newSchema.enum;
  const acceptingEnum = direction === 'request' ? newEnum : oldEnum;
  const offeringEnum = direction === 'request' ? oldEnum : newEnum;
  if (
    acceptingEnum &&
    (!offeringEnum ||
      offeringEnum.some(
        (v) =>
          !acceptingEnum.some(
            (a) => stableValue(a, false, 'literal') === stableValue(v, false, 'literal')
          )
      ))
  )
    return true;
  const oldRequired = new Set(oldSchema.required || []);
  const newRequired = new Set(newSchema.required || []);
  if (
    direction === 'request'
      ? [...newRequired].some((k) => !oldRequired.has(k))
      : [...oldRequired].some((k) => !newRequired.has(k))
  )
    return true;
  const oldProps = oldSchema.properties || {};
  const newProps = newSchema.properties || {};
  for (const [key, oldProp] of Object.entries(oldProps)) {
    if (!hasOwn(newProps, key) || schemaBreaks(oldProp, newProps[key], direction)) return true;
  }
  if (schemaBreaks(oldSchema.items, newSchema.items, direction)) return true;
  for (const key of ['minimum', 'minLength', 'minItems', 'minProperties'] as const) {
    const oldVal = oldSchema[key] ?? -Infinity;
    const newVal = newSchema[key] ?? -Infinity;
    if (direction === 'request' ? newVal > oldVal : newVal < oldVal) return true;
  }
  for (const key of ['maximum', 'maxLength', 'maxItems', 'maxProperties'] as const) {
    const oldVal = oldSchema[key] ?? Infinity;
    const newVal = newSchema[key] ?? Infinity;
    if (direction === 'request' ? newVal < oldVal : newVal > oldVal) return true;
  }
  // Complex constraint changes are conservatively breaking until proven compatible.
  for (const key of [
    'allOf',
    'oneOf',
    'anyOf',
    'not',
    'pattern',
    'format',
    'multipleOf',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'additionalProperties',
    'uniqueItems',
    'readOnly',
    'writeOnly',
  ] as const) {
    if (stableValue(oldSchema[key], true) !== stableValue(newSchema[key], true)) return true;
  }
  return false;
}

function mediaBreaks(
  oldContent: MediaTypeModel[],
  newContent: MediaTypeModel[],
  direction: 'request' | 'response'
) {
  return (
    oldContent.some((old) => {
      const next = newContent.find((n) => n.contentType === old.contentType);
      return !next || schemaBreaks(old.schema, next.schema, direction);
    }) ||
    (direction === 'response' &&
      newContent.some((n) => !oldContent.some((o) => o.contentType === n.contentType)))
  );
}

export function classifyChange(oldEp: EndpointModel, newEp: EndpointModel): ChangeClass {
  if (stableValue(oldEp, true) === stableValue(newEp, true)) return 'documentation-only';
  if ((oldEp.kind && oldEp.kind !== 'endpoint') || (newEp.kind && newEp.kind !== 'endpoint'))
    return 'breaking';
  if (oldEp.method !== newEp.method || oldEp.path !== newEp.path) return 'breaking';
  for (const param of newEp.parameters) {
    const old = oldEp.parameters.find((p) => p.name === param.name && p.in === param.in);
    if (param.required && !old?.required) return 'breaking';
    if (
      old &&
      (schemaBreaks(old.schema, param.schema, 'request') ||
        ['style', 'explode', 'allowReserved'].some(
          (k) =>
            stableValue(old[k as keyof typeof old]) !== stableValue(param[k as keyof typeof param])
        ))
    )
      return 'breaking';
  }
  if (
    oldEp.parameters.some((p) => !newEp.parameters.some((n) => n.name === p.name && n.in === p.in))
  )
    return 'breaking';
  if (newEp.requestBody?.required && !oldEp.requestBody?.required) return 'breaking';
  if (
    oldEp.requestBody &&
    (!newEp.requestBody ||
      mediaBreaks(oldEp.requestBody.content, newEp.requestBody.content, 'request'))
  )
    return 'breaking';
  for (const old of oldEp.responses) {
    const next = newEp.responses.find((r) => r.statusCode === old.statusCode);
    if (!next || mediaBreaks(old.content, next.content, 'response')) return 'breaking';
    for (const [name, header] of Object.entries(old.headers || {})) {
      if (
        !next.headers?.[name] ||
        schemaBreaks(header.schema, next.headers[name].schema, 'response')
      )
        return 'breaking';
    }
  }
  const alternatives = (ep: EndpointModel) =>
    ep.securityAlternatives?.length ? ep.securityAlternatives : [ep.security];
  const nextAuth = alternatives(newEp);
  // Every previously usable authentication option must remain usable without extra scopes.
  if (
    alternatives(oldEp).some(
      (old) =>
        !nextAuth.some((next) =>
          next.every((n) =>
            old.some(
              (o) => o.name === n.name && n.scopes.every((scope) => o.scopes.includes(scope))
            )
          )
        )
    )
  )
    return 'breaking';
  if (stableValue(oldEp.servers, true) !== stableValue(newEp.servers, true)) return 'breaking';
  return 'non-breaking';
}

function hasParseError(spec: ApiSpecModel | null, raw: string): boolean {
  if (!raw.trim()) return false;
  if (!spec) return true;
  if (spec.title === 'Invalid Spec' || spec.title === 'Parse Error') return true;
  return spec.diagnostics.some(
    (d) => d.severity === 'error' && (d.source === 'syntax' || d.id === 'parse-crash')
  );
}

function operationLabel(endpoint: EndpointModel): string {
  const label = `${endpoint.method} ${endpoint.path}`;
  return endpoint.kind && endpoint.kind !== 'endpoint'
    ? `${endpoint.kind}: ${label} (${endpoint.id})`
    : label;
}

export function compareSpecTexts(oldText: string, newText: string) {
  let oldSpec: ApiSpecModel | null = null;
  let newSpec: ApiSpecModel | null = null;
  let oldParseError = false;
  let newParseError = false;

  if (oldText.trim()) {
    try {
      const project = validateImportProject(decodeProject(oldText));
      oldSpec = parseApiSpec(project.specText, project);
      oldParseError = hasParseError(oldSpec, oldText);
    } catch {
      oldSpec = null;
      oldParseError = true;
    }
  }

  if (newText.trim()) {
    try {
      const project = validateImportProject(decodeProject(newText));
      newSpec = parseApiSpec(project.specText, project);
      newParseError = hasParseError(newSpec, newText);
    } catch {
      newSpec = null;
      newParseError = true;
    }
  }

  if (!oldSpec || !newSpec) {
    return {
      added: [] as EndpointModel[],
      removed: [] as EndpointModel[],
      changed: [] as string[],
      changedDetails: [] as Array<{ key: string; cls: ChangeClass; fields: FieldChange[] }>,
      oldSpec,
      newSpec,
      addedSchemas: [] as string[],
      removedSchemas: [] as string[],
      changedSchemas: [] as string[],
      addedSecurity: [] as string[],
      removedSecurity: [] as string[],
      changedSecurity: [] as string[],
      addedServers: [] as typeof oldSpec extends { servers: infer S } ? S : never[],
      removedServers: [] as typeof oldSpec extends { servers: infer S } ? S : never[],
      globalChanges: [] as string[],
      oldParseError,
      newParseError,
    };
  }

  if (oldParseError || newParseError) {
    return {
      added: [] as EndpointModel[],
      removed: [] as EndpointModel[],
      changed: [] as string[],
      changedDetails: [] as Array<{ key: string; cls: ChangeClass; fields: FieldChange[] }>,
      oldSpec,
      newSpec,
      addedSchemas: [] as string[],
      removedSchemas: [] as string[],
      changedSchemas: [] as string[],
      addedSecurity: [] as string[],
      removedSecurity: [] as string[],
      changedSecurity: [] as string[],
      addedServers: [] as typeof oldSpec extends { servers: infer S } ? S : never[],
      removedServers: [] as typeof oldSpec extends { servers: infer S } ? S : never[],
      globalChanges: [] as string[],
      oldParseError,
      newParseError,
    };
  }

  const oldIds = new Set(oldSpec.endpoints.map((e) => operationLabel(e)));
  const newIds = new Set(newSpec.endpoints.map((e) => operationLabel(e)));
  const added = newSpec.endpoints.filter((e) => !oldIds.has(operationLabel(e)));
  const removed = oldSpec.endpoints.filter((e) => !newIds.has(operationLabel(e)));
  const changedDetails: Array<{ key: string; cls: ChangeClass; fields: FieldChange[] }> = [];
  for (const e of newSpec.endpoints) {
    const key = operationLabel(e);
    if (oldIds.has(key)) {
      const oldEp = oldSpec.endpoints.find((o) => operationLabel(o) === key)!;
      const authChanged = [...oldEp.security, ...e.security].some(
        (requirement) =>
          stableValue(ownValue(oldSpec.securitySchemes, requirement.name), true) !==
          stableValue(ownValue(newSpec.securitySchemes, requirement.name), true)
      );
      if (stableValue(oldEp) !== stableValue(e) || authChanged) {
        const fields = describeFieldChanges(
          JSON.parse(stableValue(oldEp)),
          JSON.parse(stableValue(e))
        );
        if (authChanged)
          fields.push(
            ...describeFieldChanges(
              JSON.parse(stableValue(oldSpec.securitySchemes)),
              JSON.parse(stableValue(newSpec.securitySchemes))
            ).map((field) => ({ ...field, path: `securitySchemes.${field.path}` }))
          );
        changedDetails.push({
          key,
          cls: authChanged ? 'breaking' : classifyChange(oldEp, e),
          fields,
        });
      }
    }
  }
  const changed = changedDetails.map((d) => d.key);

  const oldSchemaKeys = Object.keys(oldSpec.schemas);
  const newSchemaKeys = Object.keys(newSpec.schemas);
  const addedSchemas = newSchemaKeys.filter((k) => !hasOwn(oldSpec!.schemas, k));
  const removedSchemas = oldSchemaKeys.filter((k) => !hasOwn(newSpec!.schemas, k));
  const changedSchemas = newSchemaKeys.filter(
    (k) =>
      hasOwn(oldSpec!.schemas, k) &&
      stableValue(ownValue(oldSpec!.schemas, k)) !== stableValue(ownValue(newSpec!.schemas, k))
  );

  const oldSecKeys = Object.keys(oldSpec.securitySchemes);
  const newSecKeys = Object.keys(newSpec.securitySchemes);
  const addedSecurity = newSecKeys.filter((k) => !hasOwn(oldSpec!.securitySchemes, k));
  const removedSecurity = oldSecKeys.filter((k) => !hasOwn(newSpec!.securitySchemes, k));
  const changedSecurity = newSecKeys.filter(
    (k) =>
      hasOwn(oldSpec!.securitySchemes, k) &&
      stableValue(oldSpec!.securitySchemes[k]) !== stableValue(newSpec!.securitySchemes[k])
  );

  const stringifyServer = (s: { url: string; description?: string; variables?: unknown }) =>
    stableValue(s);
  const oldServerStrings = new Set(oldSpec.servers.map(stringifyServer));
  const newServerStrings = new Set(newSpec.servers.map(stringifyServer));
  const addedServers = newSpec.servers.filter((s) => !oldServerStrings.has(stringifyServer(s)));
  const removedServers = oldSpec.servers.filter((s) => !newServerStrings.has(stringifyServer(s)));

  const globalChanges: string[] = [];
  if (oldSpec.title !== newSpec.title)
    globalChanges.push(`title: "${oldSpec.title}" -> "${newSpec.title}"`);
  if (oldSpec.version !== newSpec.version)
    globalChanges.push(`version: "${oldSpec.version}" -> "${newSpec.version}"`);
  if ((oldSpec.description || '') !== (newSpec.description || ''))
    globalChanges.push('description changed');
  if ((oldSpec.termsOfService || '') !== (newSpec.termsOfService || ''))
    globalChanges.push('termsOfService changed');
  if (stableValue(oldSpec.contact || null) !== stableValue(newSpec.contact || null))
    globalChanges.push('contact changed');
  if (stableValue(oldSpec.license || null) !== stableValue(newSpec.license || null))
    globalChanges.push('license changed');
  if (oldSpec.openApiVersion !== newSpec.openApiVersion)
    globalChanges.push(
      `openApiVersion: "${oldSpec.openApiVersion}" -> "${newSpec.openApiVersion}"`
    );
  if (stableValue(oldSpec.tags) !== stableValue(newSpec.tags)) globalChanges.push(`tags changed`);
  const oldSec = (oldSpec as unknown as { security?: unknown }).security;
  const newSec = (newSpec as unknown as { security?: unknown }).security;
  if (stableValue(oldSec || null) !== stableValue(newSec || null))
    globalChanges.push('global security changed');

  return {
    added,
    removed,
    changed,
    changedDetails,
    oldSpec,
    newSpec,
    addedSchemas,
    removedSchemas,
    changedSchemas,
    addedSecurity,
    removedSecurity,
    changedSecurity,
    addedServers,
    removedServers,
    globalChanges,
    oldParseError,
    newParseError,
  };
}
