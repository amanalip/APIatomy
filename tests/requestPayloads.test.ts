import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { generateMockExample } from '../src/model/mockGenerator';
import { buildCurlCommand } from '../src/ui/CurlGenerator';
import { SchemaModel } from '../src/model';
const schema: SchemaModel = { type: 'object', required: ['id', 'password'], properties: { id: { type: 'integer', readOnly: true }, password: { type: 'string', writeOnly: true }, nested: { type: 'array', items: { type: 'object', properties: { secret: { type: 'string', writeOnly: true }, visible: { type: 'boolean' } } } } } };
function endpoint(content: unknown) { return parseApiSpec(JSON.stringify({ openapi: '3.0.3', info: { title: 'Payloads', version: '1' }, paths: { '/test': { post: { requestBody: { content }, responses: { 200: { description: 'ok' } } } } } })).endpoints[0]; }
function args(command: string) { return execFileSync('/bin/sh', ['-c', `curl() { printf '%s\\0' "$@"; }; ${command}`], { encoding: 'utf8' }).split('\0').slice(0, -1); }
it('excludes direction-specific nested fields without mutating the input', () => {
  const original = structuredClone(schema);
  const request = generateMockExample(schema, {}, 'request');
  expect(request.issues).toEqual([]);
  expect(request.value).not.toHaveProperty('id');
  expect(request.value).toHaveProperty('password');
  const response = generateMockExample(schema, {}, 'response');
  expect(response.issues).toEqual([]);
  expect(response.value).toHaveProperty('id');
  expect(response.value).not.toHaveProperty('password');
  expect((response.value as any).nested[0]).not.toHaveProperty('secret');
  expect(schema).toEqual(original);
});
it('preserves explicit literal examples and filters referenced compositions', () => {
  expect(generateMockExample({ ...schema, example: false }, {}, 'request').value).toBe(false);
  const result = generateMockExample({ allOf: [{ refTarget: 'Shared' }] }, { Shared: schema }, 'request');
  expect(result.value).not.toHaveProperty('id');
});
it('selects XML honestly and preserves explicit XML arguments literally', () => {
  const ep = endpoint({ 'application/json': { schema }, 'application/xml': { schema: { type: 'object' } } });
  const xml = args(buildCurlCommand(ep, 'https://example.com', undefined, undefined, 0, 'application/xml'));
  expect(xml).toContain('Content-Type: application/xml');
  expect(xml).toContain('@payload.xml');
  expect(xml).not.toContain('field=value');
  ep.requestBody!.content[1].example = '<x>$(literal)\'text</x>';
  expect(args(buildCurlCommand(ep, 'https://example.com', undefined, undefined, 0, 'application/xml'))).toContain('<x>$(literal)\'text</x>');
});
it('uses request direction for JSON and typed values for forms', () => {
  const ep = endpoint({ 'application/json': { schema }, 'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { count: { type: 'integer', example: 0 }, flag: { type: 'boolean', example: false }, id: { type: 'string', readOnly: true } } } } });
  const json = args(buildCurlCommand(ep, 'https://example.com'));
  expect(JSON.parse(json[json.indexOf('-d') + 1])).not.toHaveProperty('id');
  const form = args(buildCurlCommand(ep, 'https://example.com', undefined, undefined, 0, 'application/x-www-form-urlencoded'));
  expect(form).toContain('count=0');
  expect(form).toContain('flag=false');
  expect(form).not.toContain('id=value');
});
it('uses safe literal multipart values and binary file arguments', () => {
  const ep = endpoint({ 'multipart/form-data': { schema: { type: 'object', properties: { note: { type: 'string', example: '@literal' }, file: { type: 'string', format: 'binary' } } } } });
  const values = args(buildCurlCommand(ep, 'https://example.com'));
  expect(values).toContain('--form-string');
  expect(values).toContain('note=@literal');
  expect(values).toContain('file=@filename.ext');
  const binary = endpoint({ 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } });
  expect(args(buildCurlCommand(binary, 'https://example.com'))).toContain('@payload.bin');
});
