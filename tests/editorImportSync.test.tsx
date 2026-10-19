import { act, createRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorPane, type EditorPaneRef } from '../src/ui/EditorPane';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { mount } from './reactHarness';

let view: ReturnType<typeof mount>;
afterEach(() => {
  view?.unmount();
  vi.useRealTimers();
});
it('discards a pending edit when an imported document replaces it', () => {
  vi.useFakeTimers();
  const ref = createRef<EditorPaneRef>();
  const onChange = vi.fn();
  view = mount(
    <ThemeProvider>
      <EditorPane ref={ref} value="original" onChange={onChange} onImportFiles={vi.fn()} />
    </ThemeProvider>
  );
  const editor = EditorView.findFromDOM(document.querySelector('.cm-editor')!)!;
  act(() =>
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'stale edit' } })
  );
  act(() => ref.current!.setContent('imported project'));
  act(() => vi.advanceTimersByTime(350));
  expect(onChange).not.toHaveBeenCalled();
  expect(editor.state.doc.toString()).toBe('imported project');
  act(() =>
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'fresh edit' } })
  );
  act(() => vi.advanceTimersByTime(350));
  expect(onChange).toHaveBeenCalledWith('fresh edit');
});
