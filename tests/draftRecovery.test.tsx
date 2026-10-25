import 'fake-indexeddb/auto';
import { act, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { loadDraft, saveDraft } from '../src/utils/draftStore';
import { useDraftRecovery } from '../src/hooks/useDraftRecovery';
import { mount } from './reactHarness';
import { restoreProject } from '../src/share/project';

let view: ReturnType<typeof mount> | undefined;
afterEach(() => { view?.unmount(); view = undefined; vi.restoreAllMocks(); history.replaceState(null, '', '/'); });
const project = { specText: 'openapi: 3.0.3', rootFilename: 'api/root.yaml', files: { 'api/types/pet.yaml': 'type: string' } };

it('round trips root context and dependencies independently of workspaces', async () => {
  await saveDraft({ project, dirty: true });
  expect(await loadDraft()).toEqual({ project: { ...project, files: { ...project.files, 'api/root.yaml': project.specText } }, dirty: true });
});

it('recovers a draft and warns before leaving unsaved work', async () => {
  await saveDraft({ project, dirty: true });
  function Harness() {
    const [text, setText] = useState('sample');
    const draft = useDraftRecovery(text, (p) => { restoreProject(p); setText(p.specText); });
    return <div>{text} {draft.dirty ? 'dirty' : 'clean'}</div>;
  }
  view = mount(<Harness />);
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  expect(view.container.textContent).toContain('openapi: 3.0.3 dirty');
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});

it('does not replace a shared API with the local draft', async () => {
  history.replaceState(null, '', '/#shared');
  await saveDraft({ project, dirty: true });
  const recover = vi.fn();
  function Harness() { useDraftRecovery('shared content', recover); return null; }
  view = mount(<Harness />);
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  expect(recover).not.toHaveBeenCalled();
});
