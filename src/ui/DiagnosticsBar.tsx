import React, { useState } from 'react';
import { DiagnosticItem } from '../model';
import { copyTextToClipboard } from '../share/urlHash';
import { AlertTriangle, XCircle, Info, ChevronUp, ChevronDown, CheckCircle2, Copy, Check } from 'lucide-react';

interface DiagnosticsBarProps {
  diagnostics: DiagnosticItem[];
  onSelectDiagnostic?: (diag: DiagnosticItem) => void;
}

export const DiagnosticsBar: React.FC<DiagnosticsBarProps> = ({
  diagnostics,
  onSelectDiagnostic,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;
  const infoCount = diagnostics.filter((d) => d.severity === 'info').length;

  const filteredDiagnostics = diagnostics.filter((d) => {
    if (activeFilter === 'all') return true;
    return d.severity === activeFilter;
  });

  const handleCopyDiagnostics = async () => {
    if (filteredDiagnostics.length === 0) return;
    const text = filteredDiagnostics
      .map(
        (d) =>
          `[${d.severity.toUpperCase()}] ${d.message}${d.line ? ` (Line ${d.line}${d.column ? `:${d.column}` : ''})` : ''}`
      )
      .join('\n');
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedDiagnostics(true);
      setTimeout(() => setCopiedDiagnostics(false), 2000);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset filter when diagnostics change drastically (e.g., spec reload)
  React.useEffect(() => {
    if (diagnostics.length === 0) setActiveFilter('all');
  }, [diagnostics.length]);

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 z-20 transition-colors duration-150 shadow-lg">
      {/* Diagnostics Bar Toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/90 dark:bg-slate-900/90 text-xs border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 hover:text-slate-900 dark:hover:text-white transition"
        >
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
            {diagnostics.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : errorCount > 0 ? (
              <XCircle className="w-4 h-4 text-red-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <span>Diagnostics</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 font-bold border border-red-200 dark:border-red-500/30">
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-500/30">
                {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
              </span>
            )}
            {infoCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30">
                {infoCount} info
              </span>
            )}
            {diagnostics.length === 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">No issues detected</span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2">
          {isOpen && (
            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800/80 p-0.5 rounded text-[11px]">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2 py-0.5 rounded ${
                  activeFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({diagnostics.length})
              </button>
              <button
                onClick={() => setActiveFilter('error')}
                className={`px-2 py-0.5 rounded ${
                  activeFilter === 'error'
                    ? 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300 font-medium'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Errors ({errorCount})
              </button>
              <button
                onClick={() => setActiveFilter('warning')}
                className={`px-2 py-0.5 rounded ${
                  activeFilter === 'warning'
                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-medium'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Warnings ({warningCount})
              </button>
              <button
                onClick={() => setActiveFilter('info')}
                className={`px-2 py-0.5 rounded ${
                  activeFilter === 'info'
                    ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 font-medium'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Info ({infoCount})
              </button>
            </div>
          )}

          {isOpen && filteredDiagnostics.length > 0 && (
            <button
              onClick={handleCopyDiagnostics}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-300 transition"
              title="Copy diagnostics list to clipboard"
            >
              {copiedDiagnostics ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Drawer Content */}
      {isOpen && (
        <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/95 font-mono text-xs">
          {filteredDiagnostics.length === 0 ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400 font-sans flex items-center justify-center gap-2">
              {diagnostics.length === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>All checks passed! No issues detected in this API specification.</span>
                </>
              ) : (
                <span>No diagnostic entries match the selected filter.</span>
              )}
            </div>
          ) : (
            filteredDiagnostics.map((diag, index) => {
              const isError = diag.severity === 'error';
              const isWarning = diag.severity === 'warning';

              return (
                <div
                  key={`${diag.id}-${index}`}
                  onClick={() => onSelectDiagnostic?.(diag)}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-4">
                    {isError ? (
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    )}

                    <span className="text-slate-800 dark:text-slate-200 truncate font-sans text-xs">
                      {diag.message}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                    {diag.path && (
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] truncate max-w-xs">
                        {diag.path}
                      </span>
                    )}
                    {diag.line && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] border border-slate-200 dark:border-slate-700">
                        Line {diag.line}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
