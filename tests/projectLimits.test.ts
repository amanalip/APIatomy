import { afterEach, expect, it } from 'vitest';
import LZString from 'lz-string';
import { decompressBounded } from '../src/share/boundedDecompress';
import { captureProject, decodeProject, encodeProject } from '../src/share/project';
import { MAX_PROJECT_BYTES, MAX_SPEC_BYTES, textBytes } from '../src/share/projectLimits';
import { setFileMap } from '../src/parser/fileMap';
import { getShareHash } from '../src/share/shareService';
import { prepareShare } from '../src/share/sharePreparation';
import { decompressSpecFromHash } from '../src/share/urlHash';

afterEach(() => setFileMap({}));
it('stores root text once and reconstructs both old and new project envelopes', () => {
  const project = {
    specText: 'ROOT',
    rootFilename: 'root.yaml',
    files: { 'root.yaml': 'STALE', 'other.yaml': 'EXTERNAL' },
  };
  const encoded = encodeProject(project);
  expect(JSON.parse(encoded).files).toEqual({ 'other.yaml': 'EXTERNAL' });
  expect(decodeProject(encoded).files).toEqual({ 'root.yaml': 'ROOT', 'other.yaml': 'EXTERNAL' });
  expect(decodeProject(JSON.stringify({ apiatomyProject: 1, ...project })).files['root.yaml']).toBe(
    'ROOT'
  );
});
it('round-trips the 2.7 MB uploaded-spec regression through a small link', () => {
  const root = JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Big', version: '1', description: 'x'.repeat(2700000) },
    paths: {},
  });
  setFileMap({ 'root.json': root }, 'root.json');
  const project = captureProject(root);
  expect(textBytes(encodeProject(project))).toBeLessThan(MAX_SPEC_BYTES);
  const result = prepareShare(project);
  expect(result.hash.length).toBeLessThan(8000);
  expect(decodeProject(decompressSpecFromHash(result.hash)!).specText).toBe(root);
  expect(decodeProject(encodeProject(project)).files['root.json']).toBe(root);
}, 30000);
it('enforces UTF-8 limits for specs and aggregate projects before sharing', () => {
  const oversized = 'é'.repeat(MAX_SPEC_BYTES / 2 + 1);
  expect(() => decodeProject(oversized)).toThrow('Specification exceeds 5 MB');
  expect(getShareHash(oversized)).toBe('');
  const files = Object.fromEntries(
    Array.from({ length: 5 }, (_, i) => [`${i}.yaml`, 'x'.repeat(MAX_SPEC_BYTES)])
  );
  expect(() => encodeProject({ specText: 'root', files })).toThrow('Project exceeds 20 MB');
  expect(() => decodeProject('x'.repeat(MAX_PROJECT_BYTES + 1))).toThrow(
    'Project file exceeds 20 MB'
  );
});
it('accepts project envelopes larger than the standalone spec limit', () => {
  const project = {
    specText: 'root',
    files: { 'a.yaml': 'x'.repeat(3 * 1024 * 1024), 'b.yaml': 'y'.repeat(3 * 1024 * 1024) },
  };
  const encoded = encodeProject(project);
  expect(textBytes(encoded)).toBeGreaterThan(MAX_SPEC_BYTES);
  expect(decodeProject(encoded).files).toEqual(project.files);
});
it('decodes legacy LZ-string links and stops at the output budget', () => {
  for (const input of [
    '',
    'hello',
    'a'.repeat(10000),
    'Unicode: é 中文 🧪',
    JSON.stringify({ raw: 'x', paths: {} }),
  ]) {
    const compressed = LZString.compressToEncodedURIComponent(input);
    expect(decompressBounded(compressed, Math.max(1, input.length))).toBe(input);
    if (input.length) expect(decompressBounded(compressed, input.length - 1)).toBeNull();
  }
  expect(decompressBounded('invalid!', 100)).toBeNull();
  expect(decompressBounded('a', 100)).toBe(LZString.decompressFromEncodedURIComponent('a'));
});
