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
