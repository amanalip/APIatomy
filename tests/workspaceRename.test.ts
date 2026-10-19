import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import {
  deleteWorkspace,
  loadWorkspace,
  renameWorkspace,
  saveWorkspace,
} from '../src/utils/workspaceStore';

const project = {
  specText: 'SOURCE',
  rootFilename: 'root.yaml',
  files: { 'root.yaml': 'SOURCE', 'models.yaml': 'type: string' },
};
afterEach(async () => {
  vi.restoreAllMocks();
  for (const id of ['source', 'destination']) await deleteWorkspace(id);
});
it('renames a complete project without changing its contents', async () => {
  await saveWorkspace('source', project.specText, 'Title', project);
  await renameWorkspace('source', 'destination');
  expect(await loadWorkspace('source')).toBeNull();
  expect(await loadWorkspace('destination')).toEqual({ ...project, title: 'Title' });
});
it('rejects collisions without changing either workspace', async () => {
  await saveWorkspace('source', project.specText, 'Title', project);
  await saveWorkspace('destination', 'DESTINATION', 'Other', {
    specText: 'DESTINATION',
    files: {},
  });
  await expect(renameWorkspace('source', 'destination')).rejects.toThrow('already exists');
  expect((await loadWorkspace('source'))?.specText).toBe('SOURCE');
  expect((await loadWorkspace('destination'))?.specText).toBe('DESTINATION');
});
it('rolls back the new record if removing the original fails', async () => {
  await saveWorkspace('source', project.specText, 'Title', project);
  vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementationOnce(() => {
    throw new Error('Injected failure');
  });
  await expect(renameWorkspace('source', 'destination')).rejects.toThrow('Injected failure');
  expect((await loadWorkspace('source'))?.files).toEqual(project.files);
  expect(await loadWorkspace('destination')).toBeNull();
});
it('handles missing sources, unchanged names, and empty names', async () => {
  await expect(renameWorkspace('source', 'destination')).rejects.toThrow('no longer exists');
  await expect(renameWorkspace('source', 'source')).resolves.toBeUndefined();
  await expect(renameWorkspace('source', ' ')).rejects.toThrow('cannot be empty');
});
