import React, { useEffect, useState, useRef } from 'react';
import { Search, Layers, Code2, Network, Upload, Share2 } from 'lucide-react';

interface Command {
  id: string;
  label: string;
  action: () => void;
  icon?: React.ReactNode;
}

interface CommandPaletteProps {
  onClose: () => void;
  onSelectSample?: () => void;
  onUpload?: () => void;
  onShare?: () => void;
  onViewChange?: (view: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose, onSelectSample, onUpload, onShare, onViewChange }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const commands: Command[] = [
    { id: 'endpoints', label: 'Go to Endpoints', action: () => onViewChange?.('endpoints'), icon: <Layers className="w-4 h-4" /> },
    { id: 'schemas', label: 'Go to Schemas', action: () => onViewChange?.('schemas'), icon: <Code2 className="w-4 h-4" /> },
    { id: 'graph', label: 'Go to Topology Graph', action: () => onViewChange?.('graph'), icon: <Network className="w-4 h-4" /> },
    { id: 'upload', label: 'Upload spec', action: () => onUpload?.(), icon: <Upload className="w-4 h-4" /> },
    { id: 'share', label: 'Share spec', action: () => onShare?.(), icon: <Share2 className="w-4 h-4" /> },
    { id: 'samples', label: 'Open samples', action: () => onSelectSample?.(), icon: <Search className="w-4 h-4" /> },
  ];

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/75 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden ring-1 ring-black/10">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search"
            className="flex-1 py-1 text-sm bg-transparent outline-none text-slate-800 dark:text-slate-200"
          />
        </div>
        <div className="max-h-64 overflow-auto p-1">
          {filtered.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {cmd.icon}
              <span>{cmd.label}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="p-3 text-xs text-slate-500">No results</div>}
        </div>
      </div>
    </div>
  );
};
