import { describe, expect, it } from 'vitest';
import { compareSpecTexts } from '../src/model/specDiff';

function spec(operation: Record<string, unknown>) {
  return JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Diff', version: '1' },
    paths: { '/test': { get: { responses: { '200': { description: 'OK' } }, ...operation } } },
  });
}
const response = (type: string) => ({
  responses: {
    '200': { description: 'OK', content: { 'application/json': { schema: { type } } } },
  },
});
const param = (required: boolean, schema = { type: 'string' }) => ({
  parameters: [{ name: 'q', in: 'query', required, schema }],
});
const body = (schema: unknown, required = false) => ({
  requestBody: { required, content: { 'application/json': { schema } } },
});
function classification(oldOp: Record<string, unknown>, newOp: Record<string, unknown>) {
  return compareSpecTexts(spec(oldOp), spec(newOp)).changedDetails[0]?.cls;
}

describe('production semantic diff', () => {
  it('flags incompatible response types and removed responses', () => {
    expect(classification(response('string'), response('integer'))).toBe('breaking');
    expect(classification(response('string'), { responses: {} })).toBe('breaking');
  });
  it('allows required request parameters to become optional', () => {
    expect(classification(param(true), param(false))).toBe('non-breaking');
    expect(classification(param(false), param(true))).toBe('breaking');
    expect(classification({}, param(true))).toBe('breaking');
  });
  it('detects request schema and body requirement tightening', () => {
    expect(
      classification(
        body({ type: 'object' }),
        body({ type: 'object', required: ['name'], properties: { name: { type: 'string' } } })
      )
    ).toBe('breaking');
    expect(classification(body({ type: 'object' }), body({ type: 'object' }, true))).toBe(
      'breaking'
    );
    expect(classification(param(false), param(false, { type: 'integer' }))).toBe('breaking');
  });
  it('checks request enum narrowing and response enum widening', () => {
    const query = (values: string[]) => ({
      parameters: [{ name: 'q', in: 'query', schema: { type: 'string', enum: values } }],
    });
    expect(classification(query(['a', 'b']), query(['a']))).toBe('breaking');
    expect(classification(query(['a']), query(['a', 'b']))).toBe('non-breaking');
  });
  it('detects auth and scope tightening but allows anonymous access', () => {
    expect(classification({}, { security: [{ token: [] }] })).toBe('breaking');
    expect(classification({ security: [{ token: [] }] }, {})).toBe('non-breaking');
    expect(
      classification({ security: [{ token: [] }] }, { security: [{ token: ['write'] }] })
    ).toBe('breaking');
  });
  it('distinguishes documentation from structural edits', () => {
    expect(classification({ summary: 'Before' }, { summary: 'After' })).toBe('documentation-only');
    expect(
      classification(
        { ...response('string'), summary: 'Before' },
        { ...response('integer'), summary: 'After' }
      )
    ).toBe('breaking');
  });
  it('ignores object key ordering and surfaces parse failures', () => {
    expect(
      compareSpecTexts(
        spec({ summary: 'Same', deprecated: true }),
        spec({ deprecated: true, summary: 'Same' })
      ).changed
    ).toEqual([]);
    expect(compareSpecTexts('openapi: [', spec({})).oldParseError).toBe(true);
  });
});
