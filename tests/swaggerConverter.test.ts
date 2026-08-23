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
          name: user
          required: true
          schema:
            $ref: "#/definitions/User"
      responses:
        200:
          description: User created
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
  });
});
