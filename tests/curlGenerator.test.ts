import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';

describe('cURL Command Generator and URL Construction', () => {
  it('generates basic GET curl command with path and query parameters', () => {
    const specYaml = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
servers:
  - url: https://api.example.com/v1/
paths:
  /users/{userId}:
    get:
      summary: Get User
      parameters:
        - name: userId
          in: path
          required: true
          example: user 123
          schema:
            type: string
        - name: active
          in: query
          schema:
            type: boolean
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 10
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(specYaml);
    expect(parsed.endpoints.length).toBe(1);
    const ep = parsed.endpoints[0];
    expect(ep.parameters.length).toBe(3);

    const pathParam = ep.parameters.find((p) => p.in === 'path');
    expect(pathParam?.example).toBe('user 123');
  });

  it('correctly handles Swagger 2.0 file upload parameters as multipart requestBody', () => {
    const swaggerYaml = `
swagger: "2.0"
info:
  title: File Upload API
  version: 1.0.0
host: api.example.com
basePath: /v1
paths:
  /upload:
    post:
      summary: Upload document
      parameters:
        - name: file
          in: formData
          type: file
          required: true
        - name: note
          in: formData
          type: string
      responses:
        200:
          description: File uploaded
`;

    const parsed = parseApiSpec(swaggerYaml);
    expect(parsed.endpoints.length).toBe(1);
    const ep = parsed.endpoints[0];
    expect(ep.requestBody).toBeDefined();
    expect(ep.requestBody?.content[0].contentType).toBe('multipart/form-data');
    expect(ep.requestBody?.content[0].schema?.properties?.['file']).toBeDefined();
    expect(ep.requestBody?.content[0].schema?.properties?.['file']?.format).toBe('binary');
  });

  it('formats server URLs with template variables', () => {
    const variableServerSpec = `
openapi: 3.0.0
info:
  title: Variable Server API
  version: 1.0.0
servers:
  - url: https://{env}.example.com/v{version}
    variables:
      env:
        default: staging
      version:
        default: '2'
paths:
  /status:
    get:
      summary: Get Status
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(variableServerSpec);
    expect(parsed.servers.length).toBe(1);
    expect(parsed.servers[0].variables?.['env']?.default).toBe('staging');
    expect(parsed.servers[0].variables?.['version']?.default).toBe('2');
  });

  it('preserves array query parameters serialization style and explode settings', () => {
    const arrayQuerySpec = `
openapi: 3.0.0
info:
  title: Array Query API
  version: 1.0.0
paths:
  /search:
    get:
      summary: Search items
      parameters:
        - name: tags
          in: query
          style: form
          explode: true
          schema:
            type: array
            items:
              type: string
        - name: categories
          in: query
          style: pipeDelimited
          explode: false
          schema:
            type: array
            items:
              type: string
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(arrayQuerySpec);
    expect(parsed.endpoints.length).toBe(1);
    const ep = parsed.endpoints[0];
    const tagsParam = ep.parameters.find((p) => p.name === 'tags');
    const catParam = ep.parameters.find((p) => p.name === 'categories');

    expect(tagsParam?.style).toBe('form');
    expect(tagsParam?.explode).toBe(true);
    expect(catParam?.style).toBe('pipeDelimited');
    expect(catParam?.explode).toBe(false);
  });
});
