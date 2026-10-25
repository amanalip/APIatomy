import { useEffect, useRef, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { useToast } from './Toast';

export function FolderImport({ onImportFiles }: { onImportFiles: (files: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [supported] = useState(
    () => typeof document !== 'undefined' && 'webkitdirectory' in document.createElement('input')
  );
  const { showToast } = useToast();
  useEffect(() => {
    if (supported) ref.current?.setAttribute('webkitdirectory', '');
  }, [supported]);
  return (
    <>
      <button
        aria-label={supported ? 'Import project folder' : 'Import project files'}
        title={
          supported
            ? 'Import a folder preserving nested paths'
            : 'Folder selection is unavailable. Select the root and dependency files together.'
        }
        onClick={() => ref.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-xs"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{supported ? 'Folder' : 'Files'}</span>
      </button>
      <input
        id="project-folder-input"
        aria-label="Project folder files"
        ref={ref}
        type="file"
        multiple
        accept=".yaml,.yml,.json"
        className="hidden"
        onChange={(event) => {
          const all = Array.from(event.currentTarget.files || []);
          event.currentTarget.value = '';
          const files = all.filter((file) => /\.(json|ya?ml)$/i.test(file.name));
          if (!files.length) {
            showToast('Choose a folder containing YAML or JSON API files', 'error');
            return;
          }
          if (all.length !== files.length)
            showToast(`Skipped ${all.length - files.length} non-API files`, 'info');
          onImportFiles(files);
        }}
      />
    </>
  );
}
