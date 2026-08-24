import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Keyboard } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ShortcutHelpProps {
  onClose: () => void;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        ref={trapRef}
        className="w-full max-w-md rounded-xl bg-white border-2 border-blue-500 shadow-2xl overflow-hidden ring-4 ring-blue-500/20"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <span className="text-sm font-semibold flex items-center gap-2 text-slate-900">
            <Keyboard className="w-4 h-4 text-blue-600" />
            Keyboard shortcuts
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-700" />
          </button>
        </div>
        <div className="p-4 space-y-2 text-xs bg-white">
          <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              Focus endpoint search
            </span>
            <span className="font-mono px-2 py-1 rounded bg-slate-800 dark:bg-slate-900 text-white border border-slate-700 text-[11px] shadow-sm">
              /
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              Focus search (alternative)
            </span>
            <span className="font-mono px-2 py-1 rounded bg-slate-800 dark:bg-slate-900 text-white border border-slate-700 text-[11px] shadow-sm">
              Ctrl + K / Cmd + K
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-200 font-medium">Toggle editor</span>
            <span className="font-mono px-2 py-1 rounded bg-slate-800 dark:bg-slate-900 text-white border border-slate-700 text-[11px] shadow-sm">
              Alt + E
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              Close dialog or drawer
            </span>
            <span className="font-mono px-2 py-1 rounded bg-slate-800 dark:bg-slate-900 text-white border border-slate-700 text-[11px] shadow-sm">
              Esc
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              Resize editor (when focused)
            </span>
            <span className="font-mono px-2 py-1 rounded bg-slate-800 dark:bg-slate-900 text-white border border-slate-700 text-[11px] shadow-sm">
              Arrows / Home / End
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
            Press ? to open this help.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
