import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { PETSTORE_SPEC } from '../src/samples/petstore';
import { GITHUB_SPEC } from '../src/samples/github';
import { STRIPE_SPEC } from '../src/samples/stripe';
import { MINIMAL_SPEC } from '../src/samples/minimal';
import { BROKEN_SPEC } from '../src/samples/broken';

describe('Built-in Sample Specifications Suite', () => {
  it('parses Petstore sample specification with 0 fatal parse errors', () => {
    const spec = parseApiSpec(PETSTORE_SPEC);

    expect(spec.title).toContain('Swagger Petstore');
    expect(spec.endpoints.length).toBeGreaterThan(5);
    expect(Object.keys(spec.schemas).length).toBeGreaterThan(3);

    const hasSyntaxError = spec.diagnostics.some((d) => d.source === 'syntax');
    expect(hasSyntaxError).toBe(false);
  });

  it('parses GitHub sample specification with expected endpoints', () => {
    const spec = parseApiSpec(GITHUB_SPEC);

    expect(spec.title).toContain('GitHub');
    expect(spec.endpoints.some((e) => e.path.includes('/issues'))).toBe(true);
    expect(spec.schemas['Issue']).toBeDefined();
  });

  it('parses Stripe sample specification with polymorphic payment schemas', () => {
    const spec = parseApiSpec(STRIPE_SPEC);

    expect(spec.title).toContain('Stripe');
    expect(spec.schemas['PaymentMethodDetails']).toBeDefined();
    expect(spec.schemas['PaymentMethodDetails'].properties?.['data']?.oneOf).toBeDefined();
  });

  it('parses Minimal sample specification cleanly', () => {
    const spec = parseApiSpec(MINIMAL_SPEC);

    expect(spec.title).toBe('Minimal OpenAPI Spec');
    expect(spec.endpoints.length).toBe(1);
    expect(spec.endpoints[0].path).toBe('/health');
  });

  it('parses Broken sample specification and generates diagnostics', () => {
    const spec = parseApiSpec(BROKEN_SPEC);

    expect(spec.diagnostics.length).toBeGreaterThan(0);
    const hasBrokenRef = spec.diagnostics.some((d) => d.id.startsWith('broken-ref-'));
    expect(hasBrokenRef).toBe(true);
  });
});
