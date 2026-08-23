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

  // Rule: Validate info object
  if (!rawDoc.info || typeof rawDoc.info !== 'object') {
    diagnostics.push({
      id: 'missing-info-object',
      severity: 'error',
      message: 'The specification is missing the required "info" object.',
      path: '/info',
      line: 1,
      source: 'schema',
    });
  } else {
    const info = rawDoc.info as Record<string, unknown>;
    if (!info.title || typeof info.title !== 'string' || !info.title.trim()) {
      diagnostics.push({
        id: 'missing-info-title',
        severity: 'error',
        message: 'The info object must define a non-empty "title" string.',
        path: '/info/title',
        line: findLineForPattern(rawText, 'title:') || findLineForPattern(rawText, 'info:') || 1,
        source: 'schema',
      });
    }
    if (!info.version || typeof info.version !== 'string' || !info.version.trim()) {
      diagnostics.push({
        id: 'missing-info-version',
        severity: 'warning',
        message: 'The info object should define an API "version" string.',
        path: '/info/version',
        line: findLineForPattern(rawText, 'version:') || findLineForPattern(rawText, 'info:') || 1,
        source: 'schema',
      });
    }
  }

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
      if (/\{[ \t]*\}/.test(pKey)) {
        const line = findLineForPattern(rawText, pKey);
        diagnostics.push({
          id: `empty-path-param-${pKey}`,
          severity: 'error',
          message: `Path "${pKey}" contains empty parameter brackets "{}" without a parameter name.`,
          path: `/paths/${pKey}`,
          line,
          source: 'schema',
        });
      }
    }

    const VALID_HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
    const PATH_LEVEL_KEYS = new Set(['summary', 'description', 'servers', 'parameters', '$ref']);

    for (const [pKey, pathObj] of Object.entries(rawDoc.paths as Record<string, unknown>)) {
      if (typeof pathObj === 'object' && pathObj !== null) {
        for (const opKey of Object.keys(pathObj as Record<string, unknown>)) {
          if (!PATH_LEVEL_KEYS.has(opKey) && !VALID_HTTP_METHODS.has(opKey.toLowerCase())) {
            const line = findLineForPattern(rawText, opKey);
            diagnostics.push({
              id: `invalid-http-method-${pKey}-${opKey}`,
              severity: 'warning',
              message: `Unknown or unsupported HTTP method verb "${opKey}" in path "${pKey}". Valid methods are GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, TRACE.`,
              path: `/paths/${pKey}/${opKey}`,
              line,
              source: 'schema',
            });
          }
        }
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

    // Rule: Excessively long summary (> 120 chars)
    if (ep.summary && ep.summary.length > 120) {
      const line = findLineForPattern(rawText, ep.path);
      diagnostics.push({
        id: `long-summary-${ep.id}`,
        severity: 'info',
        message: `Endpoint ${ep.method.toUpperCase()} ${ep.path} summary exceeds 120 characters (${ep.summary.length} chars). Consider using description for detailed explanations.`,
        path: `/paths${ep.path}/${ep.method}/summary`,
        line,
        source: 'linter',
      });
    }

    // Rule: Empty or blank tag name
    for (const tag of ep.tags) {
      if (typeof tag === 'string' && tag.trim() === '') {
        const line = findLineForPattern(rawText, `${ep.method}:`) || findLineForPattern(rawText, ep.path);
        diagnostics.push({
          id: `empty-tag-${ep.id}`,
          severity: 'warning',
          message: `Endpoint ${ep.method.toUpperCase()} ${ep.path} contains an empty or whitespace-only tag string.`,
          path: `/paths${ep.path}/${ep.method}/tags`,
          line,
          source: 'linter',
        });
      }
    }

    // Rule: Missing 2xx success response
    const hasSuccessResponse = ep.responses.some((r) => {
      const code = r.statusCode.toLowerCase();
      if (code === '2xx' || code === 'default') return true;
      const num = parseInt(code, 10);
      return !isNaN(num) && num >= 200 && num < 300;
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

    // Check duplicate parameters in rawDoc operation
    if (rawDoc.paths && typeof rawDoc.paths === 'object') {
      const pathsObj = rawDoc.paths as Record<string, unknown>;
      const pathItem = pathsObj[ep.path] as Record<string, unknown> | undefined;
      const opItem = pathItem?.[ep.method] as Record<string, unknown> | undefined;
      if (opItem && Array.isArray(opItem.parameters)) {
        const rawSeen = new Set<string>();
        for (const p of opItem.parameters) {
          if (typeof p === 'object' && p !== null) {
            const pObj = p as Record<string, unknown>;
            const key = `${pObj.in || 'query'}:${pObj.name}`;
            if (rawSeen.has(key)) {
              const line = findLineForPattern(rawText, String(pObj.name));
              diagnostics.push({
                id: `duplicate-param-${ep.id}-${key}`,
                severity: 'warning',
                message: `Duplicate parameter "${pObj.name}" in "${pObj.in || 'query'}" declared in ${ep.method.toUpperCase()} ${ep.path}.`,
                path: `/paths${ep.path}/${ep.method}/parameters`,
                line,
                source: 'linter',
              });
            } else {
              rawSeen.add(key);
            }
          }
        }
      }
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

  // Rule: Unused security schemes
  const rawSecSchemes = (typeof rawDoc.components === 'object' && rawDoc.components !== null
    ? (rawDoc.components as Record<string, unknown>).securitySchemes
    : rawDoc.securityDefinitions) as Record<string, unknown> | undefined;

  if (rawSecSchemes && typeof rawSecSchemes === 'object') {
    const referencedSecSchemes = new Set<string>();
    if (Array.isArray(rawDoc.security)) {
      for (const secReq of rawDoc.security) {
        if (typeof secReq === 'object' && secReq !== null) {
          for (const k of Object.keys(secReq)) referencedSecSchemes.add(k);
        }
      }
    }
    for (const ep of endpoints) {
      for (const sec of ep.security) referencedSecSchemes.add(sec.name);
    }

    for (const secName of Object.keys(rawSecSchemes)) {
      if (!referencedSecSchemes.has(secName)) {
        const line = findLineForPattern(rawText, secName);
        diagnostics.push({
          id: `unused-security-scheme-${secName}`,
          severity: 'info',
          message: `Security scheme "${secName}" is defined but never referenced in global or endpoint security requirements.`,
          path: `/components/securitySchemes/${secName}`,
          line,
          source: 'linter',
        });
      }
    }
  }

  // Rule: Unused tags and duplicate tag definitions in root tags list
  if (Array.isArray(rawDoc.tags)) {
    const usedTags = new Set<string>();
    const seenRootTags = new Set<string>();
    for (const ep of endpoints) {
      for (const t of ep.tags) usedTags.add(t);
    }
    for (const tagItem of rawDoc.tags) {
      if (typeof tagItem === 'object' && tagItem !== null && typeof (tagItem as any).name === 'string') {
        const tagName = (tagItem as any).name;
        if (seenRootTags.has(tagName)) {
          const line = findLineForPattern(rawText, tagName);
          diagnostics.push({
            id: `duplicate-tag-${tagName}`,
            severity: 'warning',
            message: `Tag "${tagName}" is declared more than once in the root tags list.`,
            path: `/tags`,
            line,
            source: 'linter',
          });
        } else {
          seenRootTags.add(tagName);
        }

        if (!usedTags.has(tagName)) {
          const line = findLineForPattern(rawText, tagName);
          diagnostics.push({
            id: `unused-tag-${tagName}`,
            severity: 'info',
            message: `Tag "${tagName}" is declared in root tags list but is not used by any endpoint.`,
            path: `/tags`,
            line,
            source: 'linter',
          });
        }
      }
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
