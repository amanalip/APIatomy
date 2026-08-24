import React, { useEffect, useState, useRef } from 'react';
import { Search, Layers, Code2, Network, Upload, Share2, GitCompare } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { SAMPLE_SPECS } from '../samples';

interface Command {
  id: string;
  label: string;
  action: () => void;
  icon?: React.ReactNode;
}

interface CommandPaletteProps {
  onClose: () => void;
  onSelectSample?: (sample?: import('../samples').SampleSpecOption) => void;
  onUpload?: () => void;
  onShare?: () => void;
  onViewChange?: (view: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onClose,
  onSelectSample,
  onUpload,
  onShare,
  onViewChange,
}) => {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const baseCommands: Command[] = [
    {
      id: 'endpoints',
      label: 'Go to Endpoints',
      action: () => onViewChange?.('endpoints'),
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'schemas',
      label: 'Go to Schemas',
      action: () => onViewChange?.('schemas'),
      icon: <Code2 className="w-4 h-4" />,
    },
    {
      id: 'graph',
      label: 'Go to Topology Graph',
      action: () => onViewChange?.('graph'),
      icon: <Network className="w-4 h-4" />,
    },
    {
      id: 'diff',
      label: 'Go to Diff',
      action: () => onViewChange?.('diff'),
      icon: <GitCompare className="w-4 h-4" />,
    },
    {
      id: 'upload',
      label: 'Upload spec',
      action: () => {
        const el = document.getElementById('spec-upload-input') as HTMLInputElement | null;
        if (el) el.click();
        else onUpload?.();
      },
      icon: <Upload className="w-4 h-4" />,
    },
    {
      id: 'share',
      label: 'Share spec',
      action: () => onShare?.(),
      icon: <Share2 className="w-4 h-4" />,
    },
  ];

  const sampleCommands: Command[] = SAMPLE_SPECS.map((s) => ({
    id: `sample-${s.id}`,
    label: `Sample: ${s.name}`,
    action: () => onSelectSample?.(s),
    icon: <Search className="w-4 h-4" />,
  }));

  const allCommands = [...baseCommands, ...sampleCommands];
  const filtered = allCommands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => setHighlighted(0), [query]);

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
      <div ref={trapRef} className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden ring-1 ring-black/10">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlighted((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const cmd = filtered[highlighted];
                if (cmd) {
                  cmd.action();
                  onClose();
                }
              }
            }}
            placeholder="Type a command or search"
            className="flex-1 py-1 text-sm bg-transparent outline-none text-slate-800 dark:text-slate-200"
          />
        </div>
        <div className="max-h-64 overflow-auto p-1">
          {filtered.map((cmd, idx) => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg ${idx === highlighted ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
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
