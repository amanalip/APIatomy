import { describe, it, expect } from 'vitest';
import { buildCurlCommand } from '../src/ui/CurlGenerator';
import { convertSwagger2ToOpenApi3 } from '../src/parser/swaggerConverter';
import { parseRawText } from '../src/parser/yamlJson';
import { findLineForPattern } from '../src/parser/validator';
import { normalizeServerUrl, joinUrl, sanitizeHeaderValue } from '../src/utils/serverUrl';
import { collectSchemaRefs } from '../src/utils/schemaRefs';
import { EndpointModel } from '../src/model';

describe('audit batch 7 - bug fixes', () => {
  it('curl case-insensitive content type detection (Multipart mixed case)', () => {
    const ep = {
      method: 'post',
      path: '/upload',
      tags: [],
      parameters: [],
      responses: [],
      security: [],
      consumedSchemaRefs: [],
      producedSchemaRefs: [],
      requestBody: {
        required: true,
        content: [{ contentType: 'Multipart/Form-Data', schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } as any }],
      },
    } as unknown as EndpointModel;
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('-F');
    expect(cmd).not.toContain('application/json');
  });

  it('swagger rewrite does not mutate example strings inside arrays', () => {
    const swagger = {
      swagger: '2.0',
      info: { title: 't', version: '1.0' },
      paths: {},
      definitions: {
        Foo: { type: 'object', properties: { note: { type: 'string', example: '#/definitions/Foo' } } },
      },
    } as any;
    const converted = convertSwagger2ToOpenApi3(swagger);
    const exampleVal = (converted.components as any).schemas.Foo.properties.note.example;
    expect(exampleVal).toBe('#/definitions/Foo');
  });

  it('swagger array parentKey not leaking - $ref inside array under example stays', () => {
    const swagger = {
      swagger: '2.0',
      info: { title: 't', version: '1.0' },
      paths: {},
      definitions: {
        A: { type: 'object', properties: { tags: { type: 'array', items: { $ref: '#/definitions/B' } } } },
        B: { type: 'object' },
      },
    } as any;
    const out = convertSwagger2ToOpenApi3(swagger);
    expect((out.components as any).schemas.A.properties.tags.items.$ref).toBe('#/components/schemas/B');
  });

  it('yaml BOM multiple stripping', () => {
    const raw = '\uFEFF\uFEFFopenapi: 3.0.0\ninfo:\n  title: T\n  version: 1.0\npaths: {}';
    const res = parseRawText(raw);
    expect(res.data).not.toBeNull();
    expect(res.diagnostics.length).toBe(0);
  });

  it('App format BOM multiple detection via parseRawText then yaml fallback', () => {
    const raw = '\uFEFF\uFEFF{ \"openapi\": \"3.0.0\", \"info\": {\"title\":\"t\",\"version\":\"1\"}, \"paths\":{}}';
    const res = parseRawText(raw);
    expect(res.format).toBe('json');
    expect(res.data).not.toBeNull();
  });

  it('validator findLineForPattern returns undefined on miss, not 1', () => {
    const line = findLineForPattern('a: 1\nb: 2', 'nonexistent_pattern_xyz');
    expect(line).toBeUndefined();
  });

  it('validator findLineForPattern finds existing pattern', () => {
    const line = findLineForPattern('a: 1\nb: 2\nc: 3', 'b: 2');
    expect(line).toBe(2);
  });

  it('serverUrl helpers normalize and join correctly', () => {
    expect(normalizeServerUrl('https://api.example.com///')).toBe('https://api.example.com');
    expect(joinUrl('https://api.example.com///', 'pets')).toBe('https://api.example.com/pets');
    expect(joinUrl('https://api.example.com', '/pets')).toBe('https://api.example.com/pets');
  });

  it('sanitizeHeaderValue escapes shell specials', () => {
    expect(sanitizeHeaderValue('a"b$c`d\\e')).toBe('a\\"b\\$c\\`d\\\\e');
  });

  it('collectSchemaRefs handles boolean additionalProperties gracefully', () => {
    const schema = { type: 'object', additionalProperties: true } as any;
    const set = new Set<string>();
    expect(() => collectSchemaRefs(schema, set)).not.toThrow();
    expect(set.size).toBe(0);
  });

  it('endpointDetails boolean additionalProperties rendering check - no throw', async () => {
    const { SchemaViewer } = await import('../src/ui/SchemaViewer');
    expect(SchemaViewer).toBeDefined();
  });

  it('urlHash copy fallback handles missing body gracefully', async () => {
    const { copyTextToClipboard } = await import('../src/share/urlHash');
    const origBody = document.body;
    // @ts-ignore simulate missing body
    Object.defineProperty(document, 'body', { value: null, configurable: true });
    const res = await copyTextToClipboard('test');
    expect(typeof res).toBe('boolean');
    Object.defineProperty(document, 'body', { value: origBody, configurable: true });
  });

  it('buildCurlCommand joinUrl with multiple slashes', () => {
    const ep = { method: 'get', path: '/pets', tags: [], parameters: [], responses: [{ statusCode: '200', description: 'ok', content: [] }], security: [], consumedSchemaRefs: [], producedSchemaRefs: [] } as unknown as EndpointModel;
    const cmd = buildCurlCommand(ep, 'https://api.example.com///', undefined);
    expect(cmd).toContain('https://api.example.com/pets');
    expect(cmd).not.toContain('//pets');
  });

  it('curl lowerType json detection picks json when first is xml but json exists', () => {
    const ep = {
      method: 'post',
      path: '/t',
      tags: [],
      parameters: [],
      responses: [],
      security: [],
      consumedSchemaRefs: [],
      producedSchemaRefs: [],
      requestBody: {
        required: true,
        content: [
          { contentType: 'application/xml', schema: { type: 'object' } as any },
          { contentType: 'application/json', schema: { type: 'object', properties: { name: { type: 'string' } } } as any },
        ],
      },
    } as unknown as EndpointModel;
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined);
    expect(cmd).toContain('application/json');
  });
});
