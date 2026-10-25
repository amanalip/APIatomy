import React from 'react';

export function DraftStatus({
  dirty,
  status,
  onSave,
}: {
  dirty: boolean;
  status: string;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-3 py-1 text-xs bg-white dark:bg-slate-950">
      <span role="status" className="text-slate-600 dark:text-slate-300">
        <strong>{dirty ? 'Unsaved changes' : 'No unsaved changes'}</strong>
        <span className="ml-2">{status}</span>
      </span>
      <button
        onClick={onSave}
        className="rounded px-2 py-1 text-blue-700 dark:text-blue-300 hover:underline"
      >
        Save workspace
      </button>
    </div>
  );
}
