import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { deleteWorkspace, loadWorkspace, saveWorkspace, trashWorkspace, restoreDeletedWorkspace, listDeletedWorkspaces } from '../src/utils/workspaceStore';
const project = { specText: 'openapi: 3.0.3', files: { 'api/model.yaml': 'type: string' }, rootFilename: 'api/root.yaml' };
afterEach(async () => {
  await deleteWorkspace('recover');
  for (const item of await listDeletedWorkspaces()) { await deleteWorkspace(item.id); await restoreDeletedWorkspace(item.token); await deleteWorkspace(item.id); }
});
it('undo restores complete records and removes recovery metadata', async () => {
  await saveWorkspace('recover', project.specText, 'Original', project, false);
  const token = await trashWorkspace('recover');
  expect(await loadWorkspace('recover')).toBeNull();
  expect(await listDeletedWorkspaces()).toContainEqual(expect.objectContaining({ token, id: 'recover' }));
  await restoreDeletedWorkspace(token);
  expect(await loadWorkspace('recover')).toEqual({ ...project, title: 'Original' });
  expect(await listDeletedWorkspaces()).toEqual([]);
});
it('undo collisions retain both the new workspace and the deleted project', async () => {
  await saveWorkspace('recover', project.specText, undefined, project);
  const token = await trashWorkspace('recover');
  await saveWorkspace('recover', 'new content');
  await expect(restoreDeletedWorkspace(token)).rejects.toThrow();
  expect((await loadWorkspace('recover'))?.specText).toBe('new content');
  expect((await listDeletedWorkspaces())[0].token).toBe(token);
  await deleteWorkspace('recover');
  await restoreDeletedWorkspace(token);
  expect((await loadWorkspace('recover'))?.files).toEqual(project.files);
});
it('insert-only saves reject name collisions while explicit updates replace the complete project', async () => {
  await saveWorkspace('recover', 'original', undefined, { specText: 'original', files: {} }, false);
  await expect(saveWorkspace('recover', 'collision', undefined, project, false)).rejects.toThrow();
  expect((await loadWorkspace('recover'))?.specText).toBe('original');
  await saveWorkspace('recover', project.specText, 'Updated', project, true);
  expect((await loadWorkspace('recover'))?.title).toBe('Updated');
});
