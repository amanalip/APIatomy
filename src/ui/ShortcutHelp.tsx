import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutHelpProps {
  onClose: () => void;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <span className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Keyboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Keyboard shortcuts
          </span>
          <button ref={closeRef} onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="p-4 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">Focus endpoint search</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">/</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">Focus search (alternative)</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Ctrl + K / Cmd + K</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">Toggle editor</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Alt + E</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">Close dialog or drawer</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Esc</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-600 dark:text-slate-400">Resize editor (when focused)</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Arrows / Home / End</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2">Press ? to open this help.</p>
        </div>
      </div>
    </div>
  );
};
