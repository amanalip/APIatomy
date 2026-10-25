import { act } from 'react';
import { afterEach, expect, it } from 'vitest';
import { useComparisonInputs } from '../src/hooks/useComparisonInputs';
import { setFileMap } from '../src/parser/fileMap';
import { decodeProject } from '../src/share/project';
import { mount } from './reactHarness';

let view: ReturnType<typeof mount>;
afterEach(() => { view?.unmount(); setFileMap({}); });
let state: ReturnType<typeof useComparisonInputs>;
function Harness({ text, active }: { text: string; active: boolean }) { state = useComparisonInputs(text, active); return null; }
it('retains both snapshots across navigation and main-editor edits', () => {
  view = mount(<Harness text="first" active={false} />);
  expect(state.newText).toBe('');
  view.rerender(<Harness text="current" active />);
  expect(state.newText).toBe('current');
  act(() => { state.setOldText('baseline'); state.setNewText('independent'); });
  view.rerender(<Harness text="edited" active={false} />);
  view.rerender(<Harness text="edited" active />);
  expect(state.oldText).toBe('baseline');
  expect(state.newText).toBe('independent');
  act(() => state.setNewText(''));
  expect(state.oldText).toBe('baseline');
  expect(state.newText).toBe('');
});
it('captures root filenames and dependencies once per comparison initialization', () => {
  setFileMap({ 'api/type.yaml': 'type: string' }, 'api/root.yaml');
  view = mount(<Harness text="openapi: 3.0.3" active />);
  const snapshot = decodeProject(state.newText);
  setFileMap({});
  expect(snapshot.rootFilename).toBe('api/root.yaml');
  expect(snapshot.files['api/type.yaml']).toBe('type: string');
  expect(decodeProject(state.newText)).toEqual(snapshot);
});
