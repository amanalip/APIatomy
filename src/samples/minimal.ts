export const MINIMAL_SPEC = `openapi: 3.0.3
info:
  title: Minimal OpenAPI Spec
  version: 1.0.0
paths:
  /health:
    get:
      summary: Health check endpoint
      responses:
        '200':
          description: Service is healthy
`;
