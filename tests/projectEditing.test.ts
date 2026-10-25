import { afterEach, expect, it } from 'vitest';
import { setFileMap, getFileMap } from '../src/parser/fileMap';
import { editProjectFile } from '../src/share/projectEditing';
import { captureProject, encodeProject, decodeProject, restoreProject } from '../src/share/project';
import { parseApiSpec } from '../src/parser';
const root = 'openapi: 3.0.3\ninfo: {title: Files, version: "1"}\npaths: {}\ncomponents:\n  schemas:\n    Pet:\n      $ref: ./models/pet.yaml#/Pet';
afterEach(() => setFileMap({}));
it('edits nested files and round-trips the authoritative root with dependencies', () => {
  setFileMap({ 'api/root.yaml': 'old root', 'api/models/pet.yaml': 'Pet: {type: string}', 'other/pet.yaml': 'Pet: {type: boolean}' }, 'api/root.yaml');
  editProjectFile('api/models/pet.yaml', 'Pet: {type: integer}', root);
  expect(parseApiSpec(root).schemas.Pet.type).toBe('integer');
  const project = decodeProject(encodeProject(captureProject(root)));
  setFileMap({});
  restoreProject(project);
  expect(project.specText).toBe(root);
  expect(getFileMap().get('other/pet.yaml')).toBe('Pet: {type: boolean}');
  expect(parseApiSpec(root).schemas.Pet.type).toBe('integer');
});
it('retains state on size failures and rejects editing unknown or root paths', () => {
  setFileMap({ 'root.yaml': root, 'model.yaml': 'type: string' }, 'root.yaml');
  expect(() => editProjectFile('model.yaml', 'x'.repeat(5 * 1024 * 1024 + 1), root)).toThrow('5 MB');
  expect(getFileMap().get('model.yaml')).toBe('type: string');
  expect(() => editProjectFile('root.yaml', 'x', root)).toThrow();
  expect(() => editProjectFile('unknown.yaml', 'x', root)).toThrow();
});
it('reports incomplete dependency syntax and missing references with containing filenames', () => {
  setFileMap({ 'api/root.yaml': root, 'api/models/pet.yaml': 'Pet: {type: [' }, 'api/root.yaml');
  expect(parseApiSpec(root).diagnostics).toContainEqual(expect.objectContaining({ filename: 'api/models/pet.yaml', severity: 'error' }));
  editProjectFile('api/models/pet.yaml', 'Pet:\n  $ref: ./missing.yaml#/Pet', root);
  expect(parseApiSpec(root).diagnostics).toContainEqual(expect.objectContaining({ filename: 'api/models/pet.yaml', reference: './missing.yaml#/Pet' }));
});
