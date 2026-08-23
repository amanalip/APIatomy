export const BROKEN_SPEC = `openapi: 3.0.3
info:
  title: Intentionally Broken & Warning-Heavy Spec
  description: This specification contains deliberate lint warnings, missing 2xx codes, unused schemas, and broken ref pointers to test diagnostics.
  version: 0.9.0-beta
paths:
  /undocumented-endpoint:
    get:
      # Missing summary and description
      responses:
        '404':
          description: Resource not found
        '500':
          description: Server crash

  /broken-ref-endpoint:
    post:
      summary: Endpoint with missing reference
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NonExistentPayload'
      responses:
        '200':
          description: OK

  /empty-response-endpoint:
    delete:
      summary: Endpoint with no responses declared
      responses: {}

components:
  schemas:
    OrphanedSchemaA:
      type: object
      description: This schema is never referenced anywhere in paths or other models.
      properties:
        id:
          type: string
        debugFlag:
          type: boolean

    OrphanedSchemaB:
      type: object
      properties:
        token:
          type: string

    EmptySchemaNode:
      type: object
      # Empty schema with no properties or composition
`;
