import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { PETSTORE_SPEC } from '../src/samples/petstore';
import { GITHUB_SPEC } from '../src/samples/github';
import { STRIPE_SPEC } from '../src/samples/stripe';
import { BROKEN_SPEC } from '../src/samples/broken';
import { MINIMAL_SPEC } from '../src/samples/minimal';

describe('OpenAPI Parser', () => {
  it('parses Petstore specification correctly', () => {
    const spec = parseApiSpec(PETSTORE_SPEC);

    expect(spec.title).toContain('Swagger Petstore');
    expect(spec.version).toBe('1.0.19');
    expect(spec.endpoints.length).toBeGreaterThan(0);

    const petEndpoint = spec.endpoints.find((e) => e.path === '/pet' && e.method === 'post');
    expect(petEndpoint).toBeDefined();
    expect(petEndpoint?.tags).toContain('pet');
    expect(petEndpoint?.requestBody).toBeDefined();
    expect(petEndpoint?.consumedSchemaRefs).toContain('Pet');

    expect(spec.schemas['Pet']).toBeDefined();
    expect(spec.schemas['Pet'].properties?.['category']).toBeDefined();
  });

  it('parses GitHub API subset with nested schemas and pagination', () => {
    const spec = parseApiSpec(GITHUB_SPEC);

    expect(spec.title).toBe('GitHub REST API (Subset)');
    expect(spec.endpoints.length).toBe(4);

    const issuesEndpoint = spec.endpoints.find((e) => e.path === '/repos/{owner}/{repo}/issues' && e.method === 'get');
    expect(issuesEndpoint).toBeDefined();
    expect(issuesEndpoint?.parameters.some((p) => p.name === 'per_page')).toBe(true);

    const issueSchema = spec.schemas['Issue'];
    expect(issueSchema).toBeDefined();
    expect(issueSchema.properties?.['user']).toBeDefined();
  });

  it('parses Stripe API subset with oneOf polymorphism', () => {
    const spec = parseApiSpec(STRIPE_SPEC);

    expect(spec.title).toBe('Stripe API (Subset)');
    const paymentMethodSchema = spec.schemas['PaymentMethodDetails'];
    expect(paymentMethodSchema).toBeDefined();
    expect(paymentMethodSchema.properties?.['data']?.oneOf).toBeDefined();
    expect(paymentMethodSchema.properties?.['data']?.oneOf?.length).toBe(2);
  });

  it('generates expected diagnostics on broken spec', () => {
    const spec = parseApiSpec(BROKEN_SPEC);

    expect(spec.diagnostics.length).toBeGreaterThan(0);

    // Should detect missing docs on undocumented endpoint
    const missingDocDiag = spec.diagnostics.find((d) => d.id.startsWith('missing-doc-'));
    expect(missingDocDiag).toBeDefined();

    // Should detect unused schemas
    const unusedSchemaDiag = spec.diagnostics.find((d) => d.id.startsWith('unused-schema-OrphanedSchema'));
    expect(unusedSchemaDiag).toBeDefined();

    // Should detect empty responses
    const emptyRespDiag = spec.diagnostics.find((d) => d.id.startsWith('empty-responses-'));
    expect(emptyRespDiag).toBeDefined();

    // Should detect broken references
    const brokenRefDiag = spec.diagnostics.find((d) => d.id.startsWith('broken-ref-'));
    expect(brokenRefDiag).toBeDefined();
  });

  it('resolves component parameter and response references', () => {
    const specWithComponentRefs = `
openapi: 3.0.0
info:
  title: Component Ref Test
  version: 1.0.0
paths:
  /items/{id}:
    get:
      summary: Get item
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '200':
          $ref: '#/components/responses/ItemSuccess'
components:
  parameters:
    IdParam:
      name: id
      in: path
      required: true
      schema:
        type: string
  responses:
    ItemSuccess:
      description: Successful item response
      content:
        application/json:
          schema:
            type: object
            properties:
              id:
                type: string
`;

    const parsed = parseApiSpec(specWithComponentRefs);
    expect(parsed.endpoints.length).toBe(1);
    const ep = parsed.endpoints[0];
    expect(ep.parameters.length).toBe(1);
    expect(ep.parameters[0].name).toBe('id');
    expect(ep.parameters[0].in).toBe('path');
    expect(ep.parameters[0].required).toBe(true);

    expect(ep.responses.length).toBe(1);
    expect(ep.responses[0].statusCode).toBe('200');
    expect(ep.responses[0].description).toBe('Successful item response');
    expect(ep.responses[0].content[0].contentType).toBe('application/json');
  });

  it('warns when paths do not begin with a leading forward slash', () => {
    const invalidPathSpec = `
openapi: 3.0.0
info:
  title: Invalid Path Spec
  version: 1.0.0
paths:
  invalid_path:
    get:
      summary: Get without slash
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(invalidPathSpec);
    const pathDiag = parsed.diagnostics.find((d) => d.id.startsWith('invalid-path-slash-'));
    expect(pathDiag).toBeDefined();
    expect(pathDiag?.severity).toBe('warning');
  });

  it('flags missing path parameter definitions for path templates', () => {
    const missingPathParamSpec = `
openapi: 3.0.0
info:
  title: Missing Path Param Spec
  version: 1.0.0
paths:
  /users/{userId}/posts/{postId}:
    get:
      summary: Get post
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(missingPathParamSpec);
    const missingParamDiag = parsed.diagnostics.find((d) => d.id.startsWith('missing-path-param-'));
    expect(missingParamDiag).toBeDefined();
    expect(missingParamDiag?.message).toContain('postId');
  });

  it('flags duplicate operationIds with warning diagnostics', () => {
    const duplicateOpIdSpec = `
openapi: 3.0.0
info:
  title: Duplicate OpId Spec
  version: 1.0.0
paths:
  /users:
    get:
      operationId: getResource
      responses:
        '200':
          description: OK
  /posts:
    get:
      operationId: getResource
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(duplicateOpIdSpec);
    const dupDiag = parsed.diagnostics.find((d) => d.id.startsWith('duplicate-op-id-'));
    expect(dupDiag).toBeDefined();
    expect(dupDiag?.severity).toBe('warning');
    expect(dupDiag?.message).toContain('getResource');
  });

  it('flags duplicate parameters in the same operation', () => {
    const duplicateParamSpec = `
openapi: 3.0.0
info:
  title: Duplicate Param Spec
  version: 1.0.0
paths:
  /search:
    get:
      summary: Search
      parameters:
        - name: q
          in: query
          schema:
            type: string
        - name: q
          in: query
          schema:
            type: string
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(duplicateParamSpec);
    const dupParamDiag = parsed.diagnostics.find((d) => d.id.startsWith('duplicate-param-'));
    expect(dupParamDiag).toBeDefined();
    expect(dupParamDiag?.severity).toBe('warning');
    expect(dupParamDiag?.message).toContain('q');
  });

  it('flags excessively long summary strings with info diagnostics', () => {
    const longSummarySpec = `
openapi: 3.0.0
info:
  title: Long Summary Spec
  version: 1.0.0
paths:
  /status:
    get:
      summary: This is an extraordinarily long summary that should have been placed inside the description field rather than inside the concise summary field according to OpenAPI documentation recommendations.
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(longSummarySpec);
    const longSumDiag = parsed.diagnostics.find((d) => d.id.startsWith('long-summary-'));
    expect(longSumDiag).toBeDefined();
    expect(longSumDiag?.severity).toBe('info');
  });

  it('flags missing info object with error diagnostic', () => {
    const missingInfoSpec = `
openapi: 3.0.0
paths:
  /ping:
    get:
      summary: Ping
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(missingInfoSpec);
    const missingInfoDiag = parsed.diagnostics.find((d) => d.id === 'missing-info-object');
    expect(missingInfoDiag).toBeDefined();
    expect(missingInfoDiag?.severity).toBe('error');
  });

  it('recognizes 2XX wildcard responses as valid success definitions', () => {
    const wildcardSpec = `
openapi: 3.0.0
info:
  title: Wildcard Spec
  version: 1.0.0
paths:
  /events:
    get:
      summary: Get events
      responses:
        '2XX':
          description: Success
`;

    const parsed = parseApiSpec(wildcardSpec);
    const missing2xx = parsed.diagnostics.find((d) => d.id.startsWith('missing-2xx-'));
    expect(missing2xx).toBeUndefined();
  });

  it('detects unused security schemes in components', () => {
    const unusedSecSpec = `
openapi: 3.0.0
info:
  title: Unused Sec Spec
  version: 1.0.0
paths:
  /public:
    get:
      summary: Public endpoint
      responses:
        '200':
          description: OK
components:
  securitySchemes:
    UnusedAuth:
      type: http
      scheme: bearer
`;

    const parsed = parseApiSpec(unusedSecSpec);
    const unusedSecDiag = parsed.diagnostics.find((d) => d.id.startsWith('unused-security-scheme-UnusedAuth'));
    expect(unusedSecDiag).toBeDefined();
    expect(unusedSecDiag?.severity).toBe('info');
  });

  it('inherits root-level security requirements in operations', () => {
    const rootSecSpec = `
openapi: 3.0.0
info:
  title: Root Sec Spec
  version: 1.0.0
security:
  - BearerAuth: []
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
paths:
  /secure:
    get:
      summary: Secure endpoint
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(rootSecSpec);
    expect(parsed.endpoints.length).toBe(1);
    expect(parsed.endpoints[0].security.length).toBe(1);
    expect(parsed.endpoints[0].security[0].name).toBe('BearerAuth');
  });

  it('handles minimal spec cleanly', () => {
    const spec = parseApiSpec(MINIMAL_SPEC);

    expect(spec.title).toBe('Minimal OpenAPI Spec');
    expect(spec.endpoints.length).toBe(1);
    expect(spec.endpoints[0].path).toBe('/health');
    expect(spec.endpoints[0].method).toBe('get');
  });

  it('handles empty text gracefully without throwing', () => {
    const spec = parseApiSpec('');
    expect(spec.diagnostics.length).toBeGreaterThan(0);
    expect(spec.endpoints.length).toBe(0);
  });
});
