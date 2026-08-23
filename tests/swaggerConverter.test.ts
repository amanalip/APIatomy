import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';

const SWAGGER_2_SPEC = `
swagger: "2.0"
info:
  title: Sample Swagger 2.0 API
  version: "1.0.0"
host: api.example.com
basePath: /v1
schemes:
  - https
securityDefinitions:
  OAuth2App:
    type: oauth2
    flow: application
    tokenUrl: https://api.example.com/oauth/token
    scopes:
      write:orders: Modify orders
  BasicAuth:
    type: basic
security:
  - BasicAuth: []
parameters:
  limitParam:
    name: limit
    in: query
    type: integer
    default: 20
responses:
  NotFound:
    description: Entity not found
paths:
  /users:
    get:
      summary: Get users list
      produces:
        - application/json
      responses:
        200:
          description: A list of users
          schema:
            type: array
            items:
              $ref: "#/definitions/User"
    post:
      summary: Create a user
      consumes:
        - application/json
      parameters:
        - in: body
        - in: body
          name: user
          required: true
          schema:
            $ref: "#/definitions/User"
      responses:
        200:
          description: User created
  /upload:
    post:
      summary: Upload file
      consumes:
        - multipart/form-data
      parameters:
        - in: formData
          name: file
          type: file
          required: true
      responses:
        200:
          description: Upload successful
definitions:
  User:
    type: object
    properties:
      id:
        type: integer
      username:
        type: string
`;

describe('Swagger 2.0 Converter', () => {
  it('converts Swagger 2.0 to OpenAPI 3.0 internal model', () => {
    const spec = parseApiSpec(SWAGGER_2_SPEC);

    expect(spec.originalFormat).toBe('swagger2');
    expect(spec.title).toBe('Sample Swagger 2.0 API');
    expect(spec.servers.length).toBe(1);
    expect(spec.servers[0].url).toBe('https://api.example.com/v1');

    // Schemas converted from definitions
    expect(spec.schemas['User']).toBeDefined();
    expect(spec.schemas['User'].properties?.['username']).toBeDefined();

    // Body parameter converted to requestBody
    const postEndpoint = spec.endpoints.find((e) => e.path === '/users' && e.method === 'post');
    expect(postEndpoint).toBeDefined();
    expect(postEndpoint?.requestBody).toBeDefined();
    expect(postEndpoint?.consumedSchemaRefs).toContain('User');

    // Response schema converted
    const getEndpoint = spec.endpoints.find((e) => e.path === '/users' && e.method === 'get');
    expect(getEndpoint).toBeDefined();
    expect(getEndpoint?.producedSchemaRefs).toContain('User');

    // FormData converted to multipart requestBody
    const uploadEndpoint = spec.endpoints.find((e) => e.path === '/upload' && e.method === 'post');
    expect(uploadEndpoint).toBeDefined();
    expect(uploadEndpoint?.requestBody).toBeDefined();
    expect(uploadEndpoint?.requestBody?.content[0]?.contentType).toBe('multipart/form-data');

    // Security scheme conversion
    expect(spec.securitySchemes['BasicAuth']).toBeDefined();
    expect(spec.securitySchemes['BasicAuth'].type).toBe('http');
    expect(spec.securitySchemes['BasicAuth'].scheme).toBe('basic');

    expect(spec.securitySchemes['OAuth2App']).toBeDefined();
    expect(spec.securitySchemes['OAuth2App'].flows?.['clientCredentials']).toBeDefined();

    // Inherited root security requirement
    expect(getEndpoint?.security.length).toBe(1);
    expect(getEndpoint?.security[0].name).toBe('BasicAuth');
  });
});
