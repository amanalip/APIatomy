import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { compareSpecTexts } from '../src/model/specDiff';
import { parseApiSpec } from '../src/parser';
import { getFileMap, getRootFilename, setFileMap } from '../src/parser/fileMap';
import { captureProject, decodeProject, encodeProject, restoreProject } from '../src/share/project';
import { getShareUrl } from '../src/share/shareService';
import { decompressSpecFromHash } from '../src/share/urlHash';
import {
  saveWorkspace,
  loadWorkspace,
  listWorkspaces,
  deleteWorkspace,
} from '../src/utils/workspaceStore';

const root = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'Project', version: '1' },
  paths: {},
  components: {
    schemas: {
      User: { $ref: './models/user.yaml#/User' },
    },
  },
});
const files = {
  'api/root.json': root,
  'api/models/user.yaml':
    'User:\n  type: object\n  properties:\n    address:\n      $ref: ../common/address.yaml#/Address',
  'api/common/address.yaml': 'Address:\n  type: string\n  description: Correct address',
  'other/address.yaml': 'Address:\n  type: integer',
};
function expectResolved() {
  const spec = parseApiSpec(root);
  expect(spec.schemas.User.properties?.address.type).toBe('string');
  expect(spec.schemas.User.properties?.address.description).toBe('Correct address');
  expect(getRootFilename()).toBe('api/root.json');
}
afterEach(() => setFileMap({}));

describe('multi-file project persistence', () => {
  it('round-trips workspace data and keeps files when saving under a new name', async () => {
    setFileMap(files, 'api/root.json');
    await saveWorkspace('project', root, 'Project');
    setFileMap({});
    const saved = (await loadWorkspace('project'))!;
    restoreProject(saved);
    expectResolved();
    expect(saved.files).toEqual(files);
    await saveWorkspace('renamed', saved.specText, saved.title, saved);
    await deleteWorkspace('project');
    expect((await loadWorkspace('renamed'))?.files).toEqual(files);
    expect((await listWorkspaces()).map((w) => w.id)).toContain('renamed');
    await deleteWorkspace('renamed');
    expect(await loadWorkspace('renamed')).toBeNull();
  });
  it.each([false, true])('round-trips shared links (compact: %s)', (compact) => {
    setFileMap(files, 'api/root.json');
    const shared = getShareUrl(root, compact);
    const payload = decompressSpecFromHash(new URL(shared).hash)!;
    setFileMap({});
    const project = decodeProject(payload);
    restoreProject(project);
    expectResolved();
    expect(Object.fromEntries(getFileMap())).toEqual(files);
  });
  it('round-trips downloaded project contents and the latest root edits', () => {
    setFileMap(files, 'api/root.json');
    const edited = root.replace('Project', 'Edited');
    const project = decodeProject(encodeProject(captureProject(edited)));
    expect(project.specText).toBe(edited);
    expect(project.files['api/root.json']).toBe(edited);
    restoreProject(project);
    expectResolved();
  });
  it('accepts legacy plain specs and rejects malformed project envelopes', () => {
    expect(decodeProject(root)).toEqual({ specText: root, files: {} });
    expect(() => decodeProject('{"apiatomyProject":1,"files":{}}')).toThrow('Invalid');
  });
  it('compares independently scoped projects without leaking uploaded files', () => {
    setFileMap(files, 'api/root.json');
    const before = encodeProject(captureProject(root));
    setFileMap(
      { ...files, 'api/common/address.yaml': 'Address:\n  type: integer' },
      'api/root.json'
    );
    const after = encodeProject(captureProject(root));
    const diff = compareSpecTexts(before, after);
    expect(diff.changedSchemas).toContain('User');
    expect(diff.oldSpec?.schemas.User.properties?.address.type).toBe('string');
    expect(diff.newSpec?.schemas.User.properties?.address.type).toBe('integer');
  });
  it('loads pre-project workspace records', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('apiatomy_workspaces', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('specs', { keyPath: 'id' });
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('specs', 'readwrite');
        tx.objectStore('specs').put({ id: 'legacy', specText: root, title: 'Legacy', savedAt: 1 });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    expect(await loadWorkspace('legacy')).toMatchObject({
      specText: root,
      files: {},
      title: 'Legacy',
    });
    await deleteWorkspace('legacy');
  });
});
