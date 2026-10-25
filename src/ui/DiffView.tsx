import { captureProject, encodeProject } from '../share/project';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { compareSpecTexts } from '../model/specDiff';
import { Upload, FileText } from 'lucide-react';

interface DiffViewProps {
  oldText: string;
  newText: string;
  currentText: string;
  onOldChange: (text: string) => void;
  onNewChange: (text: string) => void;
}

export const DiffView: React.FC<DiffViewProps> = ({
  oldText,
  newText,
  currentText,
  onOldChange: setOldText,
  onNewChange: setNewText,
}) => {
  const [debouncedOld, setDebouncedOld] = useState(oldText);
  const [debouncedNew, setDebouncedNew] = useState(newText);

  useEffect(() => {
    const isLarge =
      oldText.length + newText.length > 80000 || oldText.length > 50000 || newText.length > 50000;
    const delay = isLarge ? 300 : 150;
    const timer = window.setTimeout(() => {
      setDebouncedOld(oldText);
      setDebouncedNew(newText);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [oldText, newText]);

  const oldInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const {
    added,
    removed,
    changed,
    changedDetails,
    oldSpec,
    newSpec,
    addedSchemas,
    removedSchemas,
    changedSchemas,
    addedSecurity,
    removedSecurity,
    changedSecurity,
    addedServers,
    removedServers,
    globalChanges,
    oldParseError,
    newParseError,
  } = useMemo(() => {
    return compareSpecTexts(debouncedOld, debouncedNew);
  }, [debouncedOld, debouncedNew]);

  const handleFile = (setter: (t: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) setter(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [inputError, setInputError] = useState<string | null>(null);
  const useCurrent = (setter: (text: string) => void) => {
    try {
      setter(encodeProject(captureProject(currentText)));
      setInputError(null);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : 'Unable to snapshot current project');
    }
  };
  const useCurrentForOld = () => useCurrent(setOldText);
  const useCurrentForNew = () => useCurrent(setNewText);

  return (
    <div className="p-4 space-y-4 text-xs">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        API Diff - Compare two specs
      </h2>
      <p className="text-slate-600 dark:text-slate-400">
        Choose Old and New specs explicitly. Supports current editor, upload, URL and workspace. Do
        not default to Petstore for user APIs.
      </p>

      {inputError && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {inputError}
        </p>
      )}
      {(oldParseError || newParseError) && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-1">
          {oldParseError && (
            <div className="text-red-700 dark:text-red-300 font-medium">
              Old spec has parse errors
            </div>
          )}
          {newParseError && (
            <div className="text-red-700 dark:text-red-300 font-medium">
              New spec has parse errors
            </div>
          )}
          <div className="text-[11px] text-red-600 dark:text-red-400">
            Fix syntax errors to see accurate diff. Diagnostics are shown below.
          </div>
          {oldSpec && oldSpec.diagnostics.filter((d) => d.severity === 'error').length > 0 && (
            <div className="text-[10px] font-mono text-red-800 dark:text-red-200">
              Old errors:{' '}
              {oldSpec.diagnostics
                .filter((d) => d.severity === 'error')
                .map((d) => d.message)
                .join('; ')}
            </div>
          )}
          {newSpec && newSpec.diagnostics.filter((d) => d.severity === 'error').length > 0 && (
            <div className="text-[10px] font-mono text-red-800 dark:text-red-200">
              New errors:{' '}
              {newSpec.diagnostics
                .filter((d) => d.severity === 'error')
                .map((d) => d.message)
                .join('; ')}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="font-semibold text-slate-800 dark:text-slate-200">Old spec</div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={useCurrentForOld}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border text-[11px] flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              Use current
            </button>
            <button
              onClick={() => oldInputRef.current?.click()}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border text-[11px] flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
            <input
              ref={oldInputRef}
              type="file"
              accept=".yaml,.yml,.json"
              className="hidden"
              onChange={handleFile(oldText ? setOldText : setOldText)}
            />
          </div>
          <button
            onClick={() => setOldText('')}
            className="text-xs text-blue-700 dark:text-blue-300 hover:underline"
          >
            Clear old specification
          </button>
          <textarea
            value={oldText}
            onChange={(e) => setOldText(e.target.value)}
            placeholder="Paste Old spec here"
            className="w-full h-32 p-2 text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded"
          />
          {oldSpec && (
            <div className="text-[10px] text-slate-500">
              {oldSpec.endpoints.length} endpoints, {Object.keys(oldSpec.schemas).length} schemas
            </div>
          )}
        </div>

        <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="font-semibold text-slate-800 dark:text-slate-200">New spec</div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={useCurrentForNew}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border text-[11px] flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              Use current
            </button>
            <button
              onClick={() => newInputRef.current?.click()}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border text-[11px] flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
            <input
              ref={newInputRef}
              type="file"
              accept=".yaml,.yml,.json"
              className="hidden"
              onChange={handleFile(setNewText)}
            />
          </div>
          <button
            onClick={() => setNewText('')}
            className="text-xs text-blue-700 dark:text-blue-300 hover:underline"
          >
            Clear new specification
          </button>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Paste New spec here"
            className="w-full h-32 p-2 text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded"
          />
          {newSpec && (
            <div className="text-[10px] text-slate-500">
              {newSpec.endpoints.length} endpoints, {Object.keys(newSpec.schemas).length} schemas
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="font-semibold text-emerald-700 dark:text-emerald-300">
            Added ({added.length})
          </div>
          {added.map((e) => (
            <div key={e.id} className="font-mono text-emerald-800 dark:text-emerald-200">
              {e.method.toUpperCase()} {e.path}
            </div>
          ))}
          {added.length === 0 && <div className="text-slate-500">None</div>}
        </div>
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="font-semibold text-red-700 dark:text-red-300">
            Removed ({removed.length}) - breaking
          </div>
          {removed.map((e) => (
            <div key={e.id} className="font-mono text-red-800 dark:text-red-200">
              {e.method.toUpperCase()} {e.path}
            </div>
          ))}
          {removed.length === 0 && <div className="text-slate-500">None</div>}
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="font-semibold text-amber-700 dark:text-amber-300">
            Changed ({changed.length})
          </div>
          {changedDetails.map((d) => (
            <div
              key={d.key}
              className="font-mono text-amber-800 dark:text-amber-200 flex justify-between"
            >
              <span>{d.key}</span>
              <span className="text-[10px] px-1 rounded bg-white/50 dark:bg-black/20">{d.cls}</span>
            </div>
          ))}
          {changed.length === 0 && <div className="text-slate-500">None</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Schemas</div>
          <div className="text-slate-600 dark:text-slate-400">
            Added ({addedSchemas.length}): {addedSchemas.join(', ') || 'None'}
          </div>
          <div className="text-slate-600 dark:text-slate-400">
            Removed ({removedSchemas.length}): {removedSchemas.join(', ') || 'None'}
          </div>
          <div className="text-amber-700 dark:text-amber-300">
            Changed ({changedSchemas.length}): {changedSchemas.join(', ') || 'None'}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Security Schemes</div>
          <div className="text-slate-600 dark:text-slate-400">
            Added ({addedSecurity.length}): {addedSecurity.join(', ') || 'None'}
          </div>
          <div className="text-slate-600 dark:text-slate-400">
            Removed ({removedSecurity.length}): {removedSecurity.join(', ') || 'None'}
          </div>
          <div className="text-amber-700 dark:text-amber-300">
            Changed ({changedSecurity.length}): {changedSecurity.join(', ') || 'None'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Servers</div>
          {addedServers.length === 0 && removedServers.length === 0 ? (
            <div className="text-slate-500">No server changes</div>
          ) : (
            <>
              {addedServers.length > 0 && (
                <div className="text-emerald-700 dark:text-emerald-300">
                  Added: {addedServers.map((s) => s.url).join(', ')}
                </div>
              )}
              {removedServers.length > 0 && (
                <div className="text-red-700 dark:text-red-300">
                  Removed: {removedServers.map((s) => s.url).join(', ')}
                </div>
              )}
            </>
          )}
          {oldSpec &&
            newSpec &&
            oldSpec.servers.length === newSpec.servers.length &&
            addedServers.length === 0 &&
            removedServers.length === 0 && (
              <div className="text-slate-500">
                Servers: {oldSpec.servers.length} to {newSpec.servers.length}
              </div>
            )}
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Global Metadata</div>
          {globalChanges.length === 0 ? (
            <div className="text-slate-500">No global changes</div>
          ) : (
            globalChanges.map((g) => (
              <div key={g} className="text-amber-700 dark:text-amber-300">
                {g}
              </div>
            ))
          )}
        </div>
      </div>

      {oldSpec && newSpec && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Summary</div>
          <div className="text-slate-600 dark:text-slate-400">
            Schemas: {Object.keys(oldSpec.schemas).length} to {Object.keys(newSpec.schemas).length}{' '}
            (
            {Object.keys(newSpec.schemas).length - Object.keys(oldSpec.schemas).length > 0
              ? '+'
              : ''}
            {Object.keys(newSpec.schemas).length - Object.keys(oldSpec.schemas).length}), Servers:{' '}
            {oldSpec.servers.length} to {newSpec.servers.length}, Security:{' '}
            {Object.keys(oldSpec.securitySchemes).length} to{' '}
            {Object.keys(newSpec.securitySchemes).length}
          </div>
        </div>
      )}
    </div>
  );
};
