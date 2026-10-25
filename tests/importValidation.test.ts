import { afterEach, expect, it } from 'vitest';
import { validateImportProject, validateImportRoot } from '../src/share/validateImport';
import { importProjectFiles } from '../src/share/importService';
import { encodeProject } from '../src/share/project';
import { getFileMap, setFileMap } from '../src/parser/fileMap';
const root = 'openapi: 3.1.0\npaths: {}';
afterEach(() => setFileMap({}));
it.each(['', 'this is not an API', '{}', '[]', '<html>error</html>', 'openapi: [', 'openapi: 2.0.0', 'swagger: "3.0"'])('rejects invalid root %j', (text) => {
  expect(() => validateImportRoot(text)).toThrow();
});
it('permits imperfect APIs and valid scalar schemas in dependencies', () => {
  expect(validateImportProject({ specText: root, files: { 'boolean.json': 'false', 'scalar.yaml': 'type: string' } }).specText).toBe(root);
  expect(() => validateImportRoot('swagger: "2.0"')).not.toThrow();
});
it('rejects malformed dependencies with a filename', () => {
  expect(() => validateImportProject({ specText: root, files: { 'types.yaml': 'type: [' } })).toThrow('types.yaml');
});
it('rejects invalid roots inside envelopes without modifying the active project', async () => {
  setFileMap({ 'current.yaml': root }, 'current.yaml');
  const text = encodeProject({ specText: 'not an API', files: {} });
  await expect(importProjectFiles([new File([text], 'project.json')])).rejects.toThrow();
  expect(getFileMap().get('current.yaml')).toBe(root);
});
