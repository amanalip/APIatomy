import { createPortal } from 'react-dom';
import React, { useEffect, useState, useRef } from 'react';
import { X, Save, FolderOpen, Trash2, Edit2 } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { listWorkspaces, saveWorkspace, loadWorkspace } from '../utils/workspaceStore';

interface WorkspaceDialogProps {
  currentText: string;
  currentTitle?: string;
  onClose: () => void;
  onLoad: (text: string) => void;
}

export const WorkspaceDialog: React.FC<WorkspaceDialogProps> = ({
  currentText,
  currentTitle,
  onClose,
  onLoad,
}) => {
  const [workspaces, setWorkspaces] = useState<
    Array<{ id: string; title?: string; savedAt: number }>
  >([]);
  const [saving, setSaving] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap(true);

  const refresh = async () => {
    const list = await listWorkspaces();
    setWorkspaces(list);
  };

  useEffect(() => {
    refresh();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async () => {
    const id = prompt('Workspace name:', currentTitle || 'my-spec');
    if (!id) return;
    setSaving(true);
    await saveWorkspace(id, currentText, currentTitle);
    await refresh();
    setSaving(false);
  };

  const handleOpen = async (id: string) => {
    const ws = await loadWorkspace(id);
    if (ws) {
      onLoad(ws.specText);
      onClose();
    }
  };

  const handleDelete = async (id: string) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const req = indexedDB.open('apiatomy_workspaces', 1);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    const tx = db.transaction('specs', 'readwrite');
    tx.objectStore('specs').delete(id);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    refresh();
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="Workspaces"
    >
      <div
        ref={trapRef}
        className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden ring-1 ring-black/10"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <span className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Workspaces
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Stored only in this browser. Explicit save, no autosave.
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save locally'}
          </button>
          <div className="space-y-1 max-h-64 overflow-auto">
            {workspaces.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4">No saved workspaces</div>
            ) : (
              workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {ws.id}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(ws.savedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpen(ws.id)}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-600"
                      title="Open workspace"
                    >
                      <FolderOpen className="w-3 h-3" />
                    </button>
                    <button
                      onClick={async () => {
                        const newName = prompt('Rename workspace:', ws.id);
                        if (!newName || newName === ws.id) return;
                        const data = await loadWorkspace(ws.id);
                        if (data) {
                          await saveWorkspace(newName, data.specText, data.title);
                          await handleDelete(ws.id);
                        }
                      }}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-600"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(ws.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-800"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
