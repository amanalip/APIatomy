// Convert Swagger 2.0 specifications to OpenAPI 3.0.x format

export function isSwagger2(doc: Record<string, unknown>): boolean {
  const v = doc.swagger;
  if (typeof v === 'number') return v === 2 || v === 2.0;
  if (typeof v === 'string') return v.trim().startsWith('2.');
  return false;
}

export function convertSwagger2ToOpenApi3(swagger: Record<string, unknown>): Record<string, unknown> {
  const openapi: Record<string, unknown> = {
    openapi: '3.0.3',
    info: swagger.info || { title: 'Converted Swagger API', version: '1.0.0' },
    tags: swagger.tags || [],
    externalDocs: swagger.externalDocs,
  };

  if (Array.isArray(swagger.security)) {
    openapi.security = swagger.security;
  }

  // Preserve top-level externalDocs override if present (already set) else ensure defined
  if (!openapi.externalDocs && swagger.externalDocs) {
    openapi.externalDocs = swagger.externalDocs;
  }

  // Convert host, basePath, schemes to servers
  const servers: Array<{ url: string; description?: string }> = [];
  const host = typeof swagger.host === 'string' ? swagger.host : '';
  const basePath = typeof swagger.basePath === 'string' ? swagger.basePath : '';
  const schemes = Array.isArray(swagger.schemes) ? swagger.schemes : ['https'];

  if (host || basePath) {
    for (const scheme of schemes) {
      const schemeStr = String(scheme);
      const url = `${schemeStr}://${host || 'localhost'}${basePath}`;
      servers.push({ url, description: `Default ${schemeStr.toUpperCase()} server` });
    }
  } else if (swagger.servers && Array.isArray(swagger.servers)) {
    openapi.servers = swagger.servers;
  }

  if (servers.length > 0) {
    openapi.servers = servers;
  }

  // Convert definitions to components.schemas
  const components: Record<string, unknown> = {
    schemas: {},
    parameters: {},
    responses: {},
    securitySchemes: {},
  };

  if (swagger.definitions && typeof swagger.definitions === 'object') {
    const schemas: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(swagger.definitions as Record<string, unknown>)) {
      schemas[key] = rewriteSwaggerRefs(schema);
    }
    components.schemas = schemas;
  }

  // Convert global parameters
  if (swagger.parameters && typeof swagger.parameters === 'object') {
    const params: Record<string, unknown> = {};
    for (const [key, param] of Object.entries(swagger.parameters as Record<string, unknown>)) {
      params[key] = rewriteSwaggerRefs(param);
    }
    components.parameters = params;
  }

  // Convert global responses
  if (swagger.responses && typeof swagger.responses === 'object') {
    const resps: Record<string, unknown> = {};
    for (const [key, resp] of Object.entries(swagger.responses as Record<string, unknown>)) {
      resps[key] = rewriteSwaggerRefs(resp);
    }
    components.responses = resps;
  }

  // Convert securityDefinitions to components.securitySchemes
  if (swagger.securityDefinitions && typeof swagger.securityDefinitions === 'object') {
    const secSchemes: Record<string, unknown> = {};
    for (const [key, secDef] of Object.entries(swagger.securityDefinitions as Record<string, unknown>)) {
      if (typeof secDef === 'object' && secDef !== null) {
        const sd = secDef as Record<string, unknown>;
        if (sd.type === 'basic') {
          secSchemes[key] = {
            type: 'http',
            scheme: 'basic',
            description: sd.description,
          };
        } else if (sd.type === 'apiKey') {
          secSchemes[key] = {
            type: 'apiKey',
            name: sd.name || 'api_key',
            in: sd.in || 'header',
            description: sd.description,
          };
        } else if (sd.type === 'oauth2') {
          const flowType =
            sd.flow === 'accessCode'
              ? 'authorizationCode'
              : sd.flow === 'application'
              ? 'clientCredentials'
              : typeof sd.flow === 'string'
              ? sd.flow
              : 'implicit';

          secSchemes[key] = {
            type: 'oauth2',
            description: sd.description,
            flows: {
              [flowType]: {
                authorizationUrl: sd.authorizationUrl,
                tokenUrl: sd.tokenUrl,
                scopes: sd.scopes || {},
              },
            },
          };
        } else {
          secSchemes[key] = secDef;
        }
      }
    }
    components.securitySchemes = secSchemes;
  }

  openapi.components = components;

  // Convert paths
  if (swagger.paths && typeof swagger.paths === 'object') {
    const defaultConsumes = Array.isArray(swagger.consumes) ? (swagger.consumes as string[]) : ['application/json'];
    const defaultProduces = Array.isArray(swagger.produces) ? (swagger.produces as string[]) : ['application/json'];

    const newPaths: Record<string, unknown> = {};

    for (const [pathKey, pathItem] of Object.entries(swagger.paths as Record<string, unknown>)) {
      if (typeof pathItem !== 'object' || pathItem === null) continue;

      const newPathItem: Record<string, unknown> = {};
      const pi = pathItem as Record<string, unknown>;

      for (const [methodKey, opObj] of Object.entries(pi)) {
        const method = methodKey.toLowerCase();
        if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'].includes(method)) {
          newPathItem[methodKey] = opObj;
          continue;
        }

        if (typeof opObj !== 'object' || opObj === null) continue;

        const op = opObj as Record<string, unknown>;
        const newOp: Record<string, unknown> = {
          tags: op.tags || [],
          summary: op.summary,
          description: op.description,
          operationId: op.operationId,
          deprecated: op.deprecated,
          security: op.security,
        };

        if (Array.isArray(op.schemes) && (host || basePath)) {
          newOp.servers = op.schemes.map((s) => ({
            url: `${String(s)}://${host || 'localhost'}${basePath}`,
            description: `Operation ${String(s).toUpperCase()} server`,
          }));
        }

        const consumes = Array.isArray(op.consumes) ? (op.consumes as string[]) : defaultConsumes;
        const produces = Array.isArray(op.produces) ? (op.produces as string[]) : defaultProduces;

        // Separate parameters into requestBody vs parameters
        const newParams: unknown[] = [];
        let bodyParam: Record<string, unknown> | null = null;
        const formDataParams: Record<string, unknown>[] = [];

        if (Array.isArray(op.parameters)) {
          for (const rawParam of op.parameters) {
            if (typeof rawParam !== 'object' || rawParam === null) continue;
            const p = rewriteSwaggerRefs(rawParam) as Record<string, unknown>;

            if (p.in === 'body') {
              bodyParam = p;
            } else if (p.in === 'formData') {
              formDataParams.push(p);
            } else {
              // OpenAPI 3 parameter schema
              const paramSchema: Record<string, unknown> = {
                type: p.type,
                format: p.format,
                items: p.items,
                enum: p.enum,
                default: p.default,
              };

              const newP: Record<string, unknown> = {
                name: p.name,
                in: p.in,
                required: p.required ?? p.in === 'path',
                description: p.description,
                schema: p.schema ? p.schema : paramSchema,
              };

              if (p.collectionFormat === 'multi') {
                newP.style = 'form';
                newP.explode = true;
              } else if (p.collectionFormat === 'pipes') {
                newP.style = 'pipeDelimited';
              } else if (p.collectionFormat === 'ssv') {
                newP.style = 'spaceDelimited';
              } else if (p.collectionFormat === 'csv') {
                newP.style = 'form';
                newP.explode = false;
              }

              newParams.push(newP);
            }
          }
        }

        if (newParams.length > 0) {
          newOp.parameters = newParams;
        }

        // Handle body parameter -> requestBody
        if (bodyParam) {
          const contentMap: Record<string, unknown> = {};
          for (const cType of consumes) {
            contentMap[cType] = {
              schema: bodyParam.schema || {},
            };
          }
          newOp.requestBody = {
            description: bodyParam.description,
            required: bodyParam.required ?? true,
            content: contentMap,
          };
        } else if (formDataParams.length > 0) {
          // Handle formData parameters -> requestBody
          const properties: Record<string, unknown> = {};
          const requiredProps: string[] = [];

          for (const fp of formDataParams) {
            const propName = String(fp.name);
            properties[propName] = {
              type: fp.type === 'file' ? 'string' : fp.type,
              format: fp.type === 'file' ? 'binary' : fp.format,
              description: fp.description,
            };
            if (fp.required) {
              requiredProps.push(propName);
            }
          }

          const hasFileParam = formDataParams.some((fp) => fp.type === 'file');
          const formContentType = consumes.includes('multipart/form-data') || hasFileParam
            ? 'multipart/form-data'
            : 'application/x-www-form-urlencoded';

          newOp.requestBody = {
            content: {
              [formContentType]: {
                schema: {
                  type: 'object',
                  properties,
                  required: requiredProps.length > 0 ? requiredProps : undefined,
                },
              },
            },
          };
        }

        // Convert responses
        if (op.responses && typeof op.responses === 'object') {
          const newResponses: Record<string, unknown> = {};

          for (const [code, respObj] of Object.entries(op.responses as Record<string, unknown>)) {
            if (typeof respObj !== 'object' || respObj === null) {
              newResponses[code] = { description: String(respObj || '') };
              continue;
            }

            const r = rewriteSwaggerRefs(respObj) as Record<string, unknown>;
            const newResp: Record<string, unknown> = {
              description: r.description || '',
              headers: r.headers,
            };

            if (r.schema) {
              const contentMap: Record<string, unknown> = {};
              for (const pType of produces) {
                contentMap[pType] = {
                  schema: r.schema,
                };
              }
              newResp.content = contentMap;
            }

            newResponses[code] = newResp;
          }

          newOp.responses = newResponses;
        }

        newPathItem[methodKey] = newOp;
      }

      newPaths[pathKey] = newPathItem;
    }

    openapi.paths = newPaths;
  }

  return openapi;
}

// Rewrite Swagger `#/definitions/Name` to `#/components/schemas/Name`
// Only rewrite strings that are $ref target values; preserves example strings that coincidentally look like refs
function rewriteSwaggerRefs(obj: unknown, seen = new WeakSet<object>(), parentKey?: string): unknown {
  if (typeof obj === 'string') {
    const isRefContext = parentKey === '$ref';
    if (isRefContext) {
      if (obj.startsWith('#/definitions/')) {
        return obj.replace('#/definitions/', '#/components/schemas/');
      }
      if (obj.startsWith('#/parameters/')) {
        return obj.replace('#/parameters/', '#/components/parameters/');
      }
      if (obj.startsWith('#/responses/')) {
        return obj.replace('#/responses/', '#/components/responses/');
      }
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    if (seen.has(obj as object)) return obj;
    seen.add(obj as object);
    return (obj as unknown[]).map((item) => rewriteSwaggerRefs(item, seen, parentKey));
  }

  if (typeof obj === 'object' && obj !== null) {
    if (seen.has(obj as object)) return obj;
    seen.add(obj as object);
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = rewriteSwaggerRefs(v, seen, k);
    }
    return result;
  }

  return obj;
}
