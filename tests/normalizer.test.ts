import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';

describe('AST Normalizer and Graph Metadata', () => {
  it('normalizes response schema references into producedSchemaRefs', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Produces API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get users list
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
`;

    const parsed = parseApiSpec(spec);
    expect(parsed.endpoints.length).toBe(1);
    const ep = parsed.endpoints[0];
    expect(ep.producedSchemaRefs).toContain('User');
  });

  it('normalizes requestBody schema references into consumedSchemaRefs', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Consumes API
  version: 1.0.0
paths:
  /orders:
    post:
      summary: Create order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewOrder'
      responses:
        '201':
          description: Created
components:
  schemas:
    NewOrder:
      type: object
      properties:
        item:
          type: string
        quantity:
          type: integer
`;

    const parsed = parseApiSpec(spec);
    expect(parsed.endpoints.length).toBe(1);
    const ep = parsed.endpoints[0];
    expect(ep.consumedSchemaRefs).toContain('NewOrder');
    expect(ep.requestBody?.required).toBe(true);
  });

  it('captures deprecated operation and parameter metadata', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Deprecated API
  version: 1.0.0
paths:
  /legacy:
    get:
      summary: Legacy operation
      deprecated: true
      parameters:
        - name: oldToken
          in: header
          deprecated: true
          schema:
            type: string
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(spec);
    expect(parsed.endpoints.length).toBe(1);
    const ep = parsed.endpoints[0];
    expect(ep.deprecated).toBe(true);
    expect(ep.parameters[0].deprecated).toBe(true);
  });

  it('defaults parameter explode settings based on style', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Param Style API
  version: 1.0.0
paths:
  /items:
    get:
      summary: Get items
      parameters:
        - name: defaultForm
          in: query
          schema:
            type: array
            items:
              type: string
        - name: matrixParam
          in: path
          style: matrix
          required: true
          schema:
            type: string
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(spec);
    expect(parsed.endpoints.length).toBe(1);
    const ep = parsed.endpoints[0];
    const formParam = ep.parameters.find((p) => p.name === 'defaultForm');
    const matrixParam = ep.parameters.find((p) => p.name === 'matrixParam');

    expect(formParam?.style).toBe('form');
    expect(formParam?.explode).toBe(true);
    expect(matrixParam?.style).toBe('matrix');
  });
});
