import React from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';

export function UnsavedChangesDialog({
  onChoose,
}: {
  onChoose: (choice: 'save' | 'discard' | 'cancel') => void;
}) {
  const ref = useFocusTrap(true);
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onChoose('cancel');
        }
      }}
    >
      <div
        ref={ref}
        className="max-w-md rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 shadow-xl space-y-4"
      >
        <h2 id="unsaved-title" className="font-semibold">
          Save your changes?
        </h2>
        <p className="text-sm">
          Replacing this project will discard unsaved changes. Save a workspace to keep them.
        </p>
        <div className="flex flex-wrap justify-end gap-2 text-sm">
          <button onClick={() => onChoose('cancel')} className="rounded border px-3 py-2">
            Cancel
          </button>
          <button onClick={() => onChoose('discard')} className="rounded border px-3 py-2">
            Discard changes
          </button>
          <button
            onClick={() => onChoose('save')}
            className="rounded bg-blue-600 text-white px-3 py-2"
          >
            Save and continue
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
