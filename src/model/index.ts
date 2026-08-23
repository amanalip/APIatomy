export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

export interface ParameterModel {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  deprecated?: boolean;
  description?: string;
  schema?: SchemaModel;
  example?: unknown;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export interface MediaTypeModel {
  contentType: string;
  schema?: SchemaModel;
  example?: unknown;
  examples?: Record<string, { summary?: string; description?: string; value?: unknown }>;
}

export interface RequestBodyModel {
  description?: string;
  required: boolean;
  content: MediaTypeModel[];
}

export interface ResponseModel {
  statusCode: string;
  description: string;
  headers?: Record<string, { description?: string; schema?: SchemaModel }>;
  content: MediaTypeModel[];
}

export interface SecurityRequirementModel {
  name: string;
  scopes: string[];
}

export interface EndpointModel {
  id: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  operationId?: string;
  tags: string[];
  deprecated: boolean;
  parameters: ParameterModel[];
  requestBody?: RequestBodyModel;
  responses: ResponseModel[];
  security: SecurityRequirementModel[];
  servers?: { url: string; description?: string }[];
  // References to schemas used in this endpoint
  consumedSchemaRefs: string[];
  producedSchemaRefs: string[];
}

export type SchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null' | 'any';

export interface SchemaModel {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  type?: SchemaType | SchemaType[];
  format?: string;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  enum?: unknown[];
  default?: unknown;
  example?: unknown;

  // Numbers
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean | number;
  exclusiveMaximum?: boolean | number;
  multipleOf?: number;

  // Strings
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Arrays
  items?: SchemaModel;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Objects
  properties?: Record<string, SchemaModel>;
  required?: string[];
  additionalProperties?: boolean | SchemaModel;
  minProperties?: number;
  maxProperties?: number;

  // Composition
  allOf?: SchemaModel[];
  oneOf?: SchemaModel[];
  anyOf?: SchemaModel[];
  not?: SchemaModel;

  // Reference tracking
  $ref?: string;
  refTarget?: string; // Resolved normalized name e.g. "Pet"
  isCircular?: boolean;
  raw?: Record<string, unknown>;
}

export interface SecuritySchemeModel {
  name: string;
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'mutualTLS';
  description?: string;
  in?: 'header' | 'query' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, unknown>;
  openIdConnectUrl?: string;
}

export interface ServerModel {
  url: string;
  description?: string;
  variables?: Record<string, { default: string; description?: string; enum?: string[] }>;
}

export interface TagModel {
  name: string;
  description?: string;
  externalDocs?: { url: string; description?: string };
}

export interface DiagnosticItem {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
  line?: number;
  column?: number;
  source?: 'syntax' | 'ref' | 'schema' | 'linter';
}

export interface ApiSpecModel {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: { name?: string; url?: string; email?: string };
  license?: { name: string; url?: string };
  openApiVersion: string; // e.g. "3.0.3" or "2.0 (converted)"
  originalFormat: 'openapi3' | 'swagger2';
  servers: ServerModel[];
  tags: TagModel[];
  endpoints: EndpointModel[];
  schemas: Record<string, SchemaModel>;
  securitySchemes: Record<string, SecuritySchemeModel>;
  diagnostics: DiagnosticItem[];
  rawText: string;
}
