import { DiagnosticItem, EndpointModel, SchemaModel } from '../model';
import { resolveJsonPointer } from './refResolver';

export interface ValidationInput {
  endpoints: EndpointModel[];
  schemas: Record<string, SchemaModel>;
  rawText: string;
  rawDoc: Record<string, unknown>;
}

export function validateSpec(input: ValidationInput): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];
  const { endpoints, schemas, rawText, rawDoc } = input;

  // Track all schemas referenced anywhere in endpoints or other schemas
  const referencedSchemas = new Set<string>();

  // Check path formatting in rawDoc
  if (rawDoc.paths && typeof rawDoc.paths === 'object') {
    for (const pKey of Object.keys(rawDoc.paths as Record<string, unknown>)) {
      if (!pKey.startsWith('/')) {
        const line = findLineForPattern(rawText, pKey);
        diagnostics.push({
          id: `invalid-path-slash-${pKey}`,
          severity: 'warning',
          message: `Path "${pKey}" must begin with a forward slash "/".`,
          path: `/paths/${pKey}`,
          line,
          source: 'schema',
        });
      }
    }
  }

  // Track operationIds for uniqueness
  const seenOperationIds = new Map<string, EndpointModel>();

  for (const ep of endpoints) {
    // Collect consumed and produced refs
    for (const ref of ep.consumedSchemaRefs) referencedSchemas.add(ref);
    for (const ref of ep.producedSchemaRefs) referencedSchemas.add(ref);

    // Rule: Duplicate operationId validation
    if (ep.operationId) {
      const existing = seenOperationIds.get(ep.operationId);
      if (existing) {
        const line = findLineForPattern(rawText, ep.operationId);
        diagnostics.push({
          id: `duplicate-op-id-${ep.id}-${ep.operationId}`,
          severity: 'warning',
          message: `Duplicate operationId "${ep.operationId}" found in ${ep.method.toUpperCase()} ${ep.path} (already used in ${existing.method.toUpperCase()} ${existing.path}).`,
          path: `/paths${ep.path}/${ep.method}/operationId`,
          line,
          source: 'linter',
        });
      } else {
        seenOperationIds.set(ep.operationId, ep);
      }
    }

    // Rule: Missing summary and description
    if (!ep.summary && !ep.description) {
      const line = findLineForPattern(rawText, `${ep.method}:`) || findLineForPattern(rawText, ep.path);
      diagnostics.push({
        id: `missing-doc-${ep.id}`,
        severity: 'warning',
        message: `Endpoint ${ep.method.toUpperCase()} ${ep.path} has neither a summary nor a description.`,
        path: `/paths${ep.path}/${ep.method}`,
        line,
        source: 'linter',
      });
    }

    // Rule: Missing 2xx success response
    const hasSuccessResponse = ep.responses.some((r) => {
      const num = parseInt(r.statusCode, 10);
      return (num >= 200 && num < 300) || r.statusCode === 'default';
    });

    if (!hasSuccessResponse && ep.responses.length > 0) {
      const line = findLineForPattern(rawText, ep.path);
      diagnostics.push({
        id: `missing-2xx-${ep.id}`,
        severity: 'warning',
        message: `Endpoint ${ep.method.toUpperCase()} ${ep.path} does not define a 2xx success response status.`,
        path: `/paths${ep.path}/${ep.method}/responses`,
        line,
        source: 'schema',
      });
    }

    // Rule: Empty responses
    if (ep.responses.length === 0) {
      const line = findLineForPattern(rawText, ep.path);
      diagnostics.push({
        id: `empty-responses-${ep.id}`,
        severity: 'error',
        message: `Endpoint ${ep.method.toUpperCase()} ${ep.path} has no response definitions.`,
        path: `/paths${ep.path}/${ep.method}/responses`,
        line,
        source: 'schema',
      });
    }

    // Check broken parameter refs or missing parameter types
    for (const param of ep.parameters) {
      if (!param.schema && !param.description) {
        const line = findLineForPattern(rawText, param.name);
        diagnostics.push({
          id: `untyped-param-${ep.id}-${param.name}`,
          severity: 'info',
          message: `Parameter "${param.name}" in ${ep.method.toUpperCase()} ${ep.path} lacks schema and description.`,
          path: `/paths${ep.path}/${ep.method}/parameters/${param.name}`,
          line,
          source: 'linter',
        });
      }
    }

    // Rule: Path parameters in path string must be defined in parameters with in: 'path'
    const pathParamMatches = Array.from(ep.path.matchAll(/\{([^}]+)\}/g)).map((m) => m[1]);
    for (const expectedParam of pathParamMatches) {
      const paramDef = ep.parameters.find((p) => p.name === expectedParam && p.in === 'path');
      if (!paramDef) {
        const line = findLineForPattern(rawText, ep.path);
        diagnostics.push({
          id: `missing-path-param-${ep.id}-${expectedParam}`,
          severity: 'error',
          message: `Path template "${ep.path}" expects parameter "{${expectedParam}}", but no parameter with in: "path" and name "${expectedParam}" is defined.`,
          path: `/paths${ep.path}/${ep.method}/parameters`,
          line,
          source: 'schema',
        });
      }
    }
  }

  // Collect nested refs inside schemas
  for (const [schemaName, schemaObj] of Object.entries(schemas)) {
    collectSubRefs(schemaObj, referencedSchemas);

    // Rule: Schema without properties, items, or composition
    const hasProps = schemaObj.properties && Object.keys(schemaObj.properties).length > 0;
    const hasComposition = schemaObj.allOf || schemaObj.oneOf || schemaObj.anyOf;
    const hasItems = schemaObj.items;
    const isPrimitive = ['string', 'number', 'integer', 'boolean'].includes(String(schemaObj.type));

    if (!hasProps && !hasComposition && !hasItems && !isPrimitive && !schemaObj.$ref) {
      const line = findLineForPattern(rawText, schemaName);
      diagnostics.push({
        id: `empty-schema-${schemaName}`,
        severity: 'info',
        message: `Schema "${schemaName}" has no properties, items, or composition definitions.`,
        path: `/components/schemas/${schemaName}`,
        line,
        source: 'schema',
      });
    }
  }

  // Rule: Unused component schemas
  for (const schemaName of Object.keys(schemas)) {
    if (!referencedSchemas.has(schemaName)) {
      const line = findLineForPattern(rawText, schemaName);
      diagnostics.push({
        id: `unused-schema-${schemaName}`,
        severity: 'info',
        message: `Schema "${schemaName}" is defined in components but never referenced by endpoints or schemas.`,
        path: `/components/schemas/${schemaName}`,
        line,
        source: 'linter',
      });
    }
  }

  // Rule: Check for broken refs in rawDoc
  findBrokenRefsInDoc(rawDoc, rawDoc, rawText, diagnostics);

  return diagnostics;
}

function collectSubRefs(schema: SchemaModel, referenced: Set<string>): void {
  if (schema.refTarget) {
    referenced.add(schema.refTarget);
  }
  if (schema.properties) {
    for (const p of Object.values(schema.properties)) {
      collectSubRefs(p, referenced);
    }
  }
  if (schema.items) {
    collectSubRefs(schema.items, referenced);
  }
  if (schema.allOf) {
    for (const s of schema.allOf) collectSubRefs(s, referenced);
  }
  if (schema.oneOf) {
    for (const s of schema.oneOf) collectSubRefs(s, referenced);
  }
  if (schema.anyOf) {
    for (const s of schema.anyOf) collectSubRefs(s, referenced);
  }
}

function findBrokenRefsInDoc(
  doc: unknown,
  rootDoc: Record<string, unknown>,
  rawText: string,
  diagnostics: DiagnosticItem[],
  currentPath = ''
): void {
  if (typeof doc !== 'object' || doc === null) return;

  if (Array.isArray(doc)) {
    doc.forEach((item, idx) =>
      findBrokenRefsInDoc(item, rootDoc, rawText, diagnostics, `${currentPath}/${idx}`)
    );
    return;
  }

  const obj = doc as Record<string, unknown>;

  if (typeof obj.$ref === 'string') {
    const refStr = obj.$ref;
    if (refStr.startsWith('#/')) {
      const resolved = resolveJsonPointer(rootDoc, refStr);
      if (resolved === undefined) {
        const line = findLineForPattern(rawText, refStr);
        diagnostics.push({
          id: `broken-ref-${currentPath}-${refStr}`,
          severity: 'error',
          message: `Unresolved reference "${refStr}" at ${currentPath || 'root'}.`,
          path: currentPath,
          line,
          source: 'linter',
        });
      }
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    findBrokenRefsInDoc(value, rootDoc, rawText, diagnostics, `${currentPath}/${key}`);
  }
}

export function findLineForPattern(text: string, pattern: string): number {
  if (!pattern || !text) return 1;
  const lines = text.split('\n');
  const cleanPat = pattern.trim().toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(cleanPat)) {
      return i + 1;
    }
  }
  return 1;
}
