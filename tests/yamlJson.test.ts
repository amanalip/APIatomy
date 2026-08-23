import { describe, it, expect } from 'vitest';
import { parseRawText } from '../src/parser/yamlJson';

describe('YAML / JSON Parser Engine', () => {
  it('parses valid JSON string into object data', () => {
    const jsonStr = JSON.stringify({ openapi: '3.0.0', info: { title: 'Test', version: '1.0' } });
    const res = parseRawText(jsonStr);

    expect(res.data).toBeDefined();
    expect(res.format).toBe('json');
    expect(res.diagnostics.length).toBe(0);
    expect(res.data?.openapi).toBe('3.0.0');
  });

  it('rejects JSON root arrays with error diagnostic', () => {
    const jsonArray = '[1, 2, 3]';
    const res = parseRawText(jsonArray);

    expect(res.data).toBeNull();
    expect(res.diagnostics.some((d) => d.id === 'json-root-object')).toBe(true);
  });

  it('parses valid YAML string into object data', () => {
    const yamlStr = `
openapi: 3.0.0
info:
  title: YAML Spec
  version: 1.0.0
paths: {}
`;
    const res = parseRawText(yamlStr);

    expect(res.data).toBeDefined();
    expect(res.format).toBe('yaml');
    expect(res.diagnostics.length).toBe(0);
    expect(res.data?.openapi).toBe('3.0.0');
  });

  it('handles empty input string gracefully', () => {
    const res = parseRawText('');
    expect(res.data).toBeNull();
    expect(res.diagnostics.length).toBe(1);
    expect(res.diagnostics[0].id).toBe('empty-spec');
  });

  it('reports syntax errors with line and column positions', () => {
    const badYaml = `
openapi: 3.0.0
info:
  title: Bad YAML
  version: 1.0
paths:
  /test:
    get:
      summary: [unclosed array
`;
    const res = parseRawText(badYaml);
    expect(res.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });
});
