import { dictionary } from '../utils/dictionary';
import { getRootFilename, getFileMap } from './fileMap';
import {
  ApiSpecModel,
  DiagnosticItem,
  EndpointModel,
  HttpMethod,
  MediaTypeModel,
  ParameterModel,
  RequestBodyModel,
  ResponseModel,
  SchemaModel,
  SecurityRequirementModel,
  SecuritySchemeModel,
  ServerModel,
  TagModel,
} from '../model';
import {
  RefResolutionContext,
  resolveReferenceObject,
  ResolvedReference,
  resolveSchema,
} from './refResolver';
import { isSwagger2, convertSwagger2ToOpenApi3 } from './swaggerConverter';
import { validateSpec, findLineForPattern } from './validator';
import { collectSchemaRefs, VALID_HTTP_METHODS } from '../utils/schemaRefs';
import { isRecord } from '../utils/typeGuards';

export function normalizeSpec(
  rawDoc: Record<string, unknown>,
  rawText: string,
  initialDiagnostics: DiagnosticItem[] = [],
  project?: { files: Record<string, string>; rootFilename?: string }
): ApiSpecModel {
  let doc = rawDoc;
  const diagnostics: DiagnosticItem[] = [...initialDiagnostics];
  const isSwagger = isSwagger2(rawDoc);

  if (isSwagger) {
    try {
      doc = convertSwagger2ToOpenApi3(rawDoc);
    } catch (convErr: unknown) {
      diagnostics.push({
        id: 'swagger-conv-error',
        severity: 'error',
        message: `Failed to convert Swagger 2.0 to OpenAPI 3.0: ${convErr instanceof Error ? convErr.message : String(convErr)}`,
        line: 1,
        source: 'syntax',
      });
    }
  }

  // Ref Resolution Context
  const context: RefResolutionContext = {
    rootDoc: doc,
    resolvedCache: new Map<string, SchemaModel>(),
    visitingPath: new Set<string>(),
    basePath: (project ? project.rootFilename : getRootFilename()) || '',
    files: project ? new Map(Object.entries(project.files)) : getFileMap(),
    documents: new Map(),
  };

  if (context.basePath) {
    context.documents!.set(context.basePath, doc);
    context.files!.set(context.basePath, rawText);
  }
  function resolveObject(
    raw: unknown,
    source: RefResolutionContext,
    label: string,
    path: string
  ): ResolvedReference | undefined {
    const resolved = resolveReferenceObject(raw, source);
    if (!resolved && isRecord(raw) && typeof raw.$ref === 'string') {
      diagnostics.push({
        id: `unresolved-${label.replace(/ /g, '')}-ref-${path}`,
        severity: raw.$ref.startsWith('#') ? 'error' : 'warning',
        message: `Unresolved or circular ${label} reference "${raw.$ref}".`,
        path,
        line: findLineForPattern(rawText, raw.$ref) || 1,
        source: 'ref',
      });
    }
    return resolved;
  }
  function parseHeaders(
    raw: unknown,
    source: RefResolutionContext,
    path: string
  ): ResponseModel['headers'] {
    if (!isRecord(raw)) return undefined;
    const headers: NonNullable<ResponseModel['headers']> = dictionary();
    for (const [name, header] of Object.entries(raw)) {
      const resolved = resolveObject(header, source, 'header', `${path}/${name}`);
      if (!resolved) continue;
      headers[name] = {
        description:
          typeof resolved.value.description === 'string' ? resolved.value.description : undefined,
        schema: resolved.value.schema
          ? resolveSchema(resolved.value.schema, resolved.context)
          : undefined,
      };
    }
    return headers;
  }

  // 1. Info block (guarded via isRecord for stricter typing)
  const info = isRecord(doc.info) ? doc.info : {};
  const title = typeof info.title === 'string' ? info.title : 'Untitled API';
  const version = typeof info.version === 'string' ? info.version : '1.0.0';
  const description = typeof info.description === 'string' ? info.description : undefined;
  const termsOfService = typeof info.termsOfService === 'string' ? info.termsOfService : undefined;
  const contact =
    typeof info.contact === 'object' && info.contact !== null && !Array.isArray(info.contact)
      ? (info.contact as any)
      : undefined;
  const license =
    typeof info.license === 'object' &&
    info.license !== null &&
    !Array.isArray((info as any).license)
      ? (info.license as any)
      : undefined;

  // 2. Servers
  const servers: ServerModel[] = [];
  if (Array.isArray(doc.servers)) {
    for (const s of doc.servers) {
      if (typeof s === 'object' && s !== null && typeof (s as any).url === 'string') {
        servers.push({
          url: (s as any).url,
          description:
            typeof (s as any).description === 'string' ? (s as any).description : undefined,
          variables: (s as any).variables,
        });
      }
    }
  }

  // 3. Tags
  const tags: TagModel[] = [];
  if (Array.isArray(doc.tags)) {
    for (const t of doc.tags) {
      if (typeof t === 'object' && t !== null && typeof (t as any).name === 'string') {
        tags.push({
          name: (t as any).name,
          description:
            typeof (t as any).description === 'string' ? (t as any).description : undefined,
          externalDocs: (t as any).externalDocs,
        });
      }
    }
  }

  // 4. Component Schemas
  const schemas: Record<string, SchemaModel> = dictionary();
  const components = (
    typeof doc.components === 'object' && doc.components !== null ? doc.components : {}
  ) as Record<string, unknown>;
  const rawSchemas = (
    typeof components.schemas === 'object' && components.schemas !== null ? components.schemas : {}
  ) as Record<string, unknown>;

  for (const [schemaName, rawSchema] of Object.entries(rawSchemas)) {
    const canonicalRef = `${context.basePath || ''}#/components/schemas/${schemaName}`;
    context.visitingPath.add(canonicalRef);
    try {
      schemas[schemaName] = resolveSchema(rawSchema, context, schemaName);
    } catch (schemaErr: unknown) {
      diagnostics.push({
        id: `schema-err-${schemaName}`,
        severity: 'error',
        message: `Error parsing schema "${schemaName}": ${schemaErr instanceof Error ? schemaErr.message : String(schemaErr)}`,
        line: findLineForPattern(rawText, schemaName),
        source: 'schema',
      });
      schemas[schemaName] = {
        id: schemaName,
        name: schemaName,
        type: 'object',
        description: 'Failed to parse schema',
      };
    } finally {
      context.visitingPath.delete(canonicalRef);
    }
  }

  // 5. Security Schemes
  const securitySchemes: Record<string, SecuritySchemeModel> = dictionary();
  const rawSecSchemes = (
    typeof components.securitySchemes === 'object' && components.securitySchemes !== null
      ? components.securitySchemes
      : {}
  ) as Record<string, unknown>;

  for (const [secName, secObj] of Object.entries(rawSecSchemes)) {
    if (typeof secObj === 'object' && secObj !== null) {
      const resolved = resolveObject(
        secObj,
        context,
        'security scheme',
        `/components/securitySchemes/${secName}`
      );
      if (!resolved) continue;
      const s = resolved.value;
      securitySchemes[secName] = {
        name: secName,
        type: (s.type as any) || 'apiKey',
        description: typeof s.description === 'string' ? s.description : undefined,
        in: s.in as any,
        scheme: typeof s.scheme === 'string' ? s.scheme : undefined,
        bearerFormat: typeof s.bearerFormat === 'string' ? s.bearerFormat : undefined,
        flows: typeof s.flows === 'object' ? (s.flows as any) : undefined,
        openIdConnectUrl: typeof s.openIdConnectUrl === 'string' ? s.openIdConnectUrl : undefined,
        paramName: typeof s.name === 'string' ? s.name : undefined,
      };
    }
  }

  // 6. Paths & Endpoints
  const endpoints: EndpointModel[] = [];
  const rawPaths = (typeof doc.paths === 'object' && doc.paths !== null ? doc.paths : {}) as Record<
    string,
    unknown
  >;

  const validMethods: readonly HttpMethod[] = VALID_HTTP_METHODS as unknown as HttpMethod[];

  for (const [pathKey, rawPathItem] of Object.entries(rawPaths)) {
    if (typeof rawPathItem !== 'object' || rawPathItem === null) continue;
    const pathItem = resolveObject(rawPathItem, context, 'path item', `/paths/${pathKey}`);
    if (!pathItem) continue;
    const pi = pathItem.value;
    const pathContext = pathItem.context;

    // Common path-level parameters
    const pathLevelParameters: ParameterModel[] = [];
    if (Array.isArray(pi.parameters)) {
      for (const p of pi.parameters) {
        const parsedP = parseParameter(
          p,
          pathItem.fieldContexts?.get('parameters') || pathContext,
          diagnostics,
          rawText
        );
        if (parsedP) pathLevelParameters.push(parsedP);
      }
    }

    const pathLevelServers: ServerModel[] | undefined = Array.isArray(pi.servers)
      ? (pi.servers as ServerModel[])
      : undefined;

    for (const [methodKey, opObj] of Object.entries(pi)) {
      const method = methodKey.toLowerCase() as HttpMethod;
      if (!validMethods.includes(method)) continue;
      if (typeof opObj !== 'object' || opObj === null) continue;

      const operationContext = pathItem.fieldContexts?.get(methodKey) || pathContext;
      const op = opObj as Record<string, unknown>;
      const opId =
        typeof op.operationId === 'string'
          ? op.operationId
          : `${method}_${pathKey.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Tags
      const opTags =
        Array.isArray(op.tags) && op.tags.length > 0 ? (op.tags as string[]) : ['Default'];

      // Parameters
      const operationParameters: ParameterModel[] = [];
      if (Array.isArray(op.parameters)) {
        for (const p of op.parameters) {
          const parsedP = parseParameter(p, operationContext, diagnostics, rawText);
          if (parsedP) operationParameters.push(parsedP);
        }
      }

      // Merge path-level parameters with operation parameters
      const mergedParams = [...pathLevelParameters];
      for (const opParam of operationParameters) {
        const existingIdx = mergedParams.findIndex(
          (p) => p.name === opParam.name && p.in === opParam.in
        );
        if (existingIdx >= 0) {
          mergedParams[existingIdx] = opParam;
        } else {
          mergedParams.push(opParam);
        }
      }

      // Request Body
      let requestBody: RequestBodyModel | undefined;
      const consumedSchemaRefs = new Set<string>();

      if (typeof op.requestBody === 'object' && op.requestBody !== null) {
        const body = resolveObject(
          op.requestBody,
          operationContext,
          'request body',
          `/paths/${pathKey}/${method}/requestBody`
        );
        const rb = body?.value || {};
        const bodyContext =
          body?.fieldContexts?.get('content') || body?.context || operationContext;

        const contentList: MediaTypeModel[] = [];

        if (typeof rb.content === 'object' && rb.content !== null) {
          for (const [cType, mediaObj] of Object.entries(rb.content as Record<string, unknown>)) {
            if (typeof mediaObj === 'object' && mediaObj !== null) {
              const m = mediaObj as Record<string, unknown>;
              let schema: SchemaModel | undefined;
              if (m.schema) {
                schema = resolveSchema(m.schema, bodyContext);
                collectSchemaRefs(schema, consumedSchemaRefs);
              }
              contentList.push({
                contentType: cType,
                schema,
                example: m.example,
                examples: typeof m.examples === 'object' ? (m.examples as any) : undefined,
              });
            }
          }
        }

        requestBody = body
          ? {
              description: typeof rb.description === 'string' ? rb.description : undefined,
              required: Boolean(rb.required),
              content: contentList,
            }
          : undefined;
      }

      // Responses
      const responses: ResponseModel[] = [];
      const producedSchemaRefs = new Set<string>();

      if (typeof op.responses === 'object' && op.responses !== null) {
        for (const [code, respObj] of Object.entries(op.responses as Record<string, unknown>)) {
          if (typeof respObj !== 'object' || respObj === null) {
            responses.push({
              statusCode: code,
              description: String(respObj || ''),
              content: [],
            });
            continue;
          }

          const response = resolveObject(
            respObj,
            operationContext,
            'response',
            `/paths/${pathKey}/${method}/responses/${code}`
          );
          if (!response) continue;
          const r = response.value;
          const responseContext = response.context;

          const contentList: MediaTypeModel[] = [];

          if (typeof r.content === 'object' && r.content !== null) {
            for (const [cType, mediaObj] of Object.entries(r.content as Record<string, unknown>)) {
              if (typeof mediaObj === 'object' && mediaObj !== null) {
                const m = mediaObj as Record<string, unknown>;
                let schema: SchemaModel | undefined;
                if (m.schema) {
                  schema = resolveSchema(m.schema, responseContext);
                  collectSchemaRefs(schema, producedSchemaRefs);
                }
                contentList.push({
                  contentType: cType,
                  schema,
                  example: m.example,
                  examples: typeof m.examples === 'object' ? (m.examples as any) : undefined,
                });
              }
            }
          }

          responses.push({
            statusCode: code,
            description: typeof r.description === 'string' ? r.description : '',
            content: contentList,
            headers: parseHeaders(
              r.headers,
              responseContext,
              `/paths/${pathKey}/${method}/responses/${code}/headers`
            ),
          });
        }
      }

      // Security: preserve OR and AND semantics as alternatives
      // effectiveSec array where each entry is AND group, OR between entries, {} means optional
      const security: SecurityRequirementModel[] = [];
      const securityAlternatives: SecurityRequirementModel[][] = [];
      const effectiveSec = op.security !== undefined ? op.security : doc.security;
      if (Array.isArray(effectiveSec)) {
        if (effectiveSec.length === 0 && op.security !== undefined) {
          securityAlternatives.push([]);
        } else {
          for (const secReq of effectiveSec) {
            if (typeof secReq === 'object' && secReq !== null) {
              const keys = Object.keys(secReq as Record<string, unknown>);
              if (keys.length === 0) {
                securityAlternatives.push([]);
                continue;
              }
              const group: SecurityRequirementModel[] = [];
              for (const [secKey, scopes] of Object.entries(secReq as Record<string, unknown>)) {
                const entry: SecurityRequirementModel = {
                  name: secKey,
                  scopes: Array.isArray(scopes) ? (scopes as string[]) : [],
                };
                group.push(entry);
                security.push(entry);
              }
              if (group.length > 0) securityAlternatives.push(group);
            }
          }
        }
      }

      const opServers = Array.isArray(op.servers) ? (op.servers as ServerModel[]) : undefined;
      const effectiveServers = opServers ?? pathLevelServers;

      endpoints.push({
        id: `${method}_${pathKey}`,
        method,
        path: pathKey,
        summary: typeof op.summary === 'string' ? op.summary : undefined,
        description: typeof op.description === 'string' ? op.description : undefined,
        operationId: opId,
        tags: opTags,
        deprecated: Boolean(op.deprecated),
        parameters: mergedParams,
        requestBody,
        responses,
        security,
        securityAlternatives: securityAlternatives.length > 0 ? securityAlternatives : undefined,
        servers: effectiveServers,
        consumedSchemaRefs: Array.from(consumedSchemaRefs),
        producedSchemaRefs: Array.from(producedSchemaRefs),
      });
    }
  }

  // Run linter / validator
  const validationDiagnostics = validateSpec({
    endpoints,
    schemas,
    rawText,
    rawDoc: doc,
  });

  const allDiagnostics = [...diagnostics, ...validationDiagnostics];

  return {
    title,
    version,
    description,
    termsOfService,
    contact,
    license,
    openApiVersion: isSwagger ? '2.0 (converted to 3.0)' : String(doc.openapi || '3.0.0'),
    originalFormat: isSwagger ? 'swagger2' : 'openapi3',
    servers,
    tags,
    endpoints,
    schemas,
    securitySchemes,
    security: Array.isArray(doc.security)
      ? doc.security.filter(isRecord).map((group) =>
          Object.entries(group).map(([name, scopes]) => ({
            name,
            scopes: Array.isArray(scopes)
              ? scopes.filter((scope): scope is string => typeof scope === 'string')
              : [],
          }))
        )
      : [],
    diagnostics: allDiagnostics,
    rawText,
  };
}

function parseParameter(
  p: unknown,
  context: RefResolutionContext,
  diagnostics: DiagnosticItem[],
  rawText: string
): ParameterModel | null {
  if (typeof p !== 'object' || p === null) return null;
  const resolved = resolveReferenceObject(p, context);
  if (!resolved) {
    if (isRecord(p) && typeof p.$ref === 'string')
      diagnostics.push({
        id: `unresolved-parameter-ref-${p.$ref}`,
        severity: p.$ref.startsWith('#') ? 'error' : 'warning',
        message: `Unresolved or circular parameter reference "${p.$ref}".`,
        line: findLineForPattern(rawText, p.$ref) || 1,
        source: 'ref',
      });
    return null;
  }
  const param = resolved.value;
  const name = typeof param.name === 'string' ? param.name : 'unnamed';
  const inType = typeof param.in === 'string' ? (param.in as any) : 'query';
  const required = Boolean(param.required ?? inType === 'path');
  const description = typeof param.description === 'string' ? param.description : undefined;
  const deprecated = Boolean(param.deprecated);

  let schema: SchemaModel | undefined;
  if (param.schema) {
    schema = resolveSchema(param.schema, resolved.context, name);
  }

  const defaultStyle =
    inType === 'query' || inType === 'cookie'
      ? 'form'
      : inType === 'path' || inType === 'header'
        ? 'simple'
        : undefined;
  const style = typeof param.style === 'string' ? param.style : defaultStyle;
  const defaultExplode = style === 'form';
  const explode = typeof param.explode === 'boolean' ? param.explode : defaultExplode;

  return {
    name,
    in: inType,
    required,
    description,
    deprecated,
    schema,
    example: param.example,
    style,
    explode,
    allowReserved: typeof param.allowReserved === 'boolean' ? param.allowReserved : undefined,
  };
}
