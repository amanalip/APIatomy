import React, { useState } from 'react';
import { DiagnosticItem } from '../model';
import { AlertTriangle, XCircle, Info, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';

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

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;
  const infoCount = diagnostics.filter((d) => d.severity === 'info').length;

  const filteredDiagnostics = diagnostics.filter((d) => {
    if (activeFilter === 'all') return true;
    return d.severity === activeFilter;
  });

  return (
    <div className="border-t border-slate-800 bg-slate-950 text-slate-200 z-20">
      {/* Diagnostics Bar Toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 text-xs border-b border-slate-800">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 hover:text-white transition"
        >
          <div className="flex items-center gap-1.5 font-medium">
            {diagnostics.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : errorCount > 0 ? (
              <XCircle className="w-4 h-4 text-red-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span>Diagnostics</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-bold">
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
              </span>
            )}
            {infoCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400">
                {infoCount} info
              </span>
            )}
            {diagnostics.length === 0 && (
              <span className="text-emerald-400 text-[11px]">No issues detected</span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2">
          {isOpen && (
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded text-[11px]">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2 py-0.5 rounded ${
                  activeFilter === 'all' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400'
                }`}
              >
                All ({diagnostics.length})
              </button>
              <button
                onClick={() => setActiveFilter('error')}
                className={`px-2 py-0.5 rounded ${
                  activeFilter === 'error' ? 'bg-red-900/60 text-red-300 font-medium' : 'text-slate-400'
                }`}
              >
                Errors ({errorCount})
              </button>
              <button
                onClick={() => setActiveFilter('warning')}
                className={`px-2 py-0.5 rounded ${
                  activeFilter === 'warning' ? 'bg-amber-900/60 text-amber-300 font-medium' : 'text-slate-400'
                }`}
              >
                Warnings ({warningCount})
              </button>
            </div>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Drawer Content */}
      {isOpen && (
        <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/95 font-mono text-xs">
          {filteredDiagnostics.length === 0 ? (
            <div className="p-3 text-center text-slate-500 font-sans">
              No diagnostic entries match the selected filter.
            </div>
          ) : (
            filteredDiagnostics.map((diag, index) => {
              const isError = diag.severity === 'error';
              const isWarning = diag.severity === 'warning';

              return (
                <div
                  key={`${diag.id}-${index}`}
                  onClick={() => onSelectDiagnostic?.(diag)}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-900/80 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-4">
                    {isError ? (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    )}

                    <span className="text-slate-200 truncate font-sans text-xs">
                      {diag.message}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                    {diag.path && (
                      <span className="text-slate-500 text-[10px] truncate max-w-xs">
                        {diag.path}
                      </span>
                    )}
                    {diag.line && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
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
