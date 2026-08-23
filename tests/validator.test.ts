import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';

describe('OpenAPI Specification Linter and Diagnostics', () => {
  it('flags path containing query string directly with warning diagnostic', () => {
    const queryPathSpec = `
openapi: 3.0.0
info:
  title: Query in Path API
  version: 1.0.0
paths:
  /search?type={type}:
    get:
      summary: Search with query in path
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(queryPathSpec);
    const queryPathDiag = parsed.diagnostics.find((d) => d.id.startsWith('path-contains-query-'));
    expect(queryPathDiag).toBeDefined();
    expect(queryPathDiag?.severity).toBe('warning');
  });

  it('validates missing root info object and title', () => {
    const missingInfoSpec = `
openapi: 3.0.0
paths:
  /status:
    get:
      summary: Status
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(missingInfoSpec);
    const missingInfoDiag = parsed.diagnostics.find((d) => d.id === 'missing-info-object');
    expect(missingInfoDiag).toBeDefined();
    expect(missingInfoDiag?.severity).toBe('error');
  });

  it('validates missing root paths object', () => {
    const missingPathsSpec = `
openapi: 3.0.0
info:
  title: No Paths
  version: 1.0.0
`;

    const parsed = parseApiSpec(missingPathsSpec);
    const missingPathsDiag = parsed.diagnostics.find((d) => d.id === 'missing-paths-object');
    expect(missingPathsDiag).toBeDefined();
    expect(missingPathsDiag?.severity).toBe('error');
  });

  it('validates invalid path slashes and empty parameter brackets', () => {
    const malformedPathsSpec = `
openapi: 3.0.0
info:
  title: Malformed Paths
  version: 1.0.0
paths:
  no_slash:
    get:
      summary: No slash
      responses:
        '200':
          description: OK
  /users/{}:
    get:
      summary: Empty param
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(malformedPathsSpec);
    const noSlashDiag = parsed.diagnostics.find((d) => d.id.startsWith('invalid-path-slash-'));
    const emptyParamDiag = parsed.diagnostics.find((d) => d.id.startsWith('empty-path-param-'));

    expect(noSlashDiag).toBeDefined();
    expect(emptyParamDiag).toBeDefined();
  });

  it('validates invalid HTTP method verbs', () => {
    const invalidMethodSpec = `
openapi: 3.0.0
info:
  title: Invalid Verb
  version: 1.0.0
paths:
  /data:
    retrieve:
      summary: Invalid retrieve verb
      responses:
        '200':
          description: OK
`;

    const parsed = parseApiSpec(invalidMethodSpec);
    const invalidVerbDiag = parsed.diagnostics.find((d) => d.id.startsWith('invalid-http-method-'));
    expect(invalidVerbDiag).toBeDefined();
    expect(invalidVerbDiag?.severity).toBe('warning');
  });
});
