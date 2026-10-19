import { afterEach, expect, it } from 'vitest';
import { importProjectFiles } from '../src/share/importService';
import { encodeProject, restoreProject } from '../src/share/project';
import { getFileMap, getRootFilename, setFileMap } from '../src/parser/fileMap';

const root = 'openapi: 3.1.0\ninfo: { title: Imported, version: "1" }\npaths: {}';
function file(name: string, text: string, relativePath?: string) {
  const value = new File([text], name, { type: 'text/plain' });
  Object.defineProperty(value, 'text', { value: async () => text, configurable: true });
  if (relativePath) Object.defineProperty(value, 'webkitRelativePath', { value: relativePath });
  return value;
}
afterEach(() => setFileMap({}));
it('decodes project files and replaces stale dependencies only when applied', async () => {
  setFileMap({ 'old.yaml': 'stale' }, 'old.yaml');
  const encoded = encodeProject({
    specText: root,
    rootFilename: 'root.yaml',
    files: { 'root.yaml': root, 'models.yaml': 'type: string' },
  });
  const project = await importProjectFiles([file('apiatomy-project.json', encoded)]);
  expect(getFileMap().has('old.yaml')).toBe(true);
  restoreProject(project);
  expect(project.specText).toBe(root);
  expect(getFileMap().has('old.yaml')).toBe(false);
  expect(getFileMap().get('models.yaml')).toBe('type: string');
  expect(getRootFilename()).toBe('root.yaml');
  const plain = await importProjectFiles([file('new.yaml', root)]);
  restoreProject(plain);
  expect([...getFileMap().keys()]).toEqual(['new.yaml']);
});
it('chooses roots structurally rather than matching descriptions or comments', async () => {
  const project = await importProjectFiles([
    file('model.yaml', 'description: OpenAPI schema for a user\ntype: string', 'api/model.yaml'),
    file('root.yaml', root, 'api/root.yaml'),
  ]);
  expect(project.rootFilename).toBe('api/root.yaml');
  expect(project.specText).toBe(root);
});
it('rejects ambiguous roots, duplicate paths, and missing roots without changing project state', async () => {
  setFileMap({ 'old.yaml': 'stale' });
  await expect(
    importProjectFiles([file('one.yaml', root), file('two.yaml', root)])
  ).rejects.toThrow('Multiple API roots');
  await expect(
    importProjectFiles([file('one.yaml', root), file('one.yaml', 'type: string')])
  ).rejects.toThrow('Duplicate file path');
  await expect(
    importProjectFiles([file('one.yaml', 'type: string'), file('two.yaml', 'type: number')])
  ).rejects.toThrow('No API root');
  expect([...getFileMap().keys()]).toEqual(['old.yaml']);
});
it('cancels pending file reads without applying their results', async () => {
  let resolve!: (value: string) => void;
  const value = file('root.yaml', root);
  Object.defineProperty(value, 'text', {
    value: () =>
      new Promise<string>((res) => {
        resolve = res;
      }),
    configurable: true,
  });
  const controller = new AbortController();
  const pending = importProjectFiles([value], controller.signal);
  controller.abort();
  resolve(root);
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});
it('supports the FileReader fallback and accepts invalid standalone specs for editor diagnostics', async () => {
  const malformed = 'openapi: [';
  const project = await importProjectFiles([new File([malformed], 'broken.yaml')]);
  expect(project.specText).toBe(malformed);
});
it('can import exported project files larger than 5 MB', async () => {
  const encoded = encodeProject({
    specText: root,
    files: { 'a.yaml': 'x'.repeat(3 * 1024 * 1024), 'b.yaml': 'y'.repeat(3 * 1024 * 1024) },
  });
  const project = await importProjectFiles([file('project.json', encoded)]);
  expect(project.files['b.yaml'].length).toBe(3 * 1024 * 1024);
});
