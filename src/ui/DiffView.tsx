import React, { useMemo, useState, useRef } from 'react';
import { parseApiSpec } from '../parser';
import { ApiSpecModel, EndpointModel } from '../model';
import { Upload, FileText } from 'lucide-react';

interface DiffViewProps {
  oldText: string;
  newText: string;
}

type ChangeClass = 'breaking' | 'non-breaking' | 'documentation-only';

function classifyChange(oldEp: EndpointModel, newEp: EndpointModel): ChangeClass {
  if (oldEp.method !== newEp.method || oldEp.path !== newEp.path) return 'breaking';
  const oldReq = new Set(oldEp.parameters.filter((p) => p.required).map((p) => `${p.in}:${p.name}`));
  const newReq = new Set(newEp.parameters.filter((p) => p.required).map((p) => `${p.in}:${p.name}`));
  for (const r of oldReq) if (!newReq.has(r)) return 'breaking';
  for (const r of newReq) if (!oldReq.has(r)) return 'breaking';
  if (oldEp.deprecated !== newEp.deprecated) return 'non-breaking';
  if ((oldEp.summary || '') !== (newEp.summary || '') || (oldEp.description || '') !== (newEp.description || '')) {
    const withoutDocsOld = { ...oldEp, summary: '', description: '' };
    const withoutDocsNew = { ...newEp, summary: '', description: '' };
    if (JSON.stringify(withoutDocsOld) === JSON.stringify(withoutDocsNew)) return 'documentation-only';
  }
  return 'non-breaking';
}

export const DiffView: React.FC<DiffViewProps> = ({ oldText: initialOld, newText: initialNew }) => {
  const [oldText, setOldText] = useState(initialOld);
  const [newText, setNewText] = useState(initialNew);
  React.useEffect(() => setOldText(initialOld), [initialOld]);
  React.useEffect(() => setNewText(initialNew), [initialNew]);
  const oldInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const { added, removed, changed, changedDetails, oldSpec, newSpec } = useMemo(() => {
    let oldSpec: ApiSpecModel | null = null;
    let newSpec: ApiSpecModel | null = null;
    try {
      oldSpec = oldText ? parseApiSpec(oldText) : null;
    } catch {
      // ignore
    }
    try {
      newSpec = newText ? parseApiSpec(newText) : null;
    } catch {
      // ignore
    }
    if (!oldSpec || !newSpec) return { added: [], removed: [], changed: [], changedDetails: [] as Array<{ key: string; cls: ChangeClass }>, oldSpec, newSpec };
    const oldIds = new Set(oldSpec.endpoints.map((e) => `${e.method} ${e.path}`));
    const newIds = new Set(newSpec.endpoints.map((e) => `${e.method} ${e.path}`));
    const added = newSpec.endpoints.filter((e) => !oldIds.has(`${e.method} ${e.path}`));
    const removed = oldSpec.endpoints.filter((e) => !newIds.has(`${e.method} ${e.path}`));
    const changedDetails: Array<{ key: string; cls: ChangeClass }> = [];
    for (const e of newSpec.endpoints) {
      const key = `${e.method} ${e.path}`;
      if (oldIds.has(key)) {
        const oldEp = oldSpec.endpoints.find((o) => `${o.method} ${o.path}` === key)!;
        if (JSON.stringify(oldEp) !== JSON.stringify(e)) {
          changedDetails.push({ key, cls: classifyChange(oldEp, e) });
        }
      }
    }
    const changed = changedDetails.map((d) => d.key);
    return { added, removed, changed, changedDetails, oldSpec, newSpec };
  }, [oldText, newText]);

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

  const useCurrentForOld = () => setOldText(initialNew);
  const useCurrentForNew = () => setNewText(initialNew);

  return (
    <div className="p-4 space-y-4 text-xs">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">API Diff - Compare two specs</h2>
      <p className="text-slate-600 dark:text-slate-400">Choose Old and New specs explicitly. Supports current editor, upload, URL and workspace. Do not default to Petstore for user APIs.</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="font-semibold text-slate-800 dark:text-slate-200">Old spec</div>
          <div className="flex flex-wrap gap-1">
            <button onClick={useCurrentForOld} className="px-2 py-1 rounded bg-white dark:bg-slate-800 border text-[11px] flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Use current
            </button>
            <button onClick={() => oldInputRef.current?.click()} className="px-2 py-1 rounded bg-white dark:bg-slate-800 border text-[11px] flex items-center gap-1">
              <Upload className="w-3 h-3" />
              Upload
            </button>
            <input ref={oldInputRef} type="file" accept=".yaml,.yml,.json" className="hidden" onChange={handleFile(oldText ? setOldText : setOldText)} />
          </div>
          <textarea value={oldText} onChange={(e) => setOldText(e.target.value)} placeholder="Paste Old spec here" className="w-full h-32 p-2 text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded" />
          {oldSpec && <div className="text-[10px] text-slate-500">{oldSpec.endpoints.length} endpoints, {Object.keys(oldSpec.schemas).length} schemas</div>}
        </div>

        <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="font-semibold text-slate-800 dark:text-slate-200">New spec</div>
          <div className="flex flex-wrap gap-1">
            <button onClick={useCurrentForNew} className="px-2 py-1 rounded bg-white dark:bg-slate-800 border text-[11px] flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Use current
            </button>
            <button onClick={() => newInputRef.current?.click()} className="px-2 py-1 rounded bg-white dark:bg-slate-800 border text-[11px] flex items-center gap-1">
              <Upload className="w-3 h-3" />
              Upload
            </button>
            <input ref={newInputRef} type="file" accept=".yaml,.yml,.json" className="hidden" onChange={handleFile(setNewText)} />
          </div>
          <textarea value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Paste New spec here" className="w-full h-32 p-2 text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded" />
          {newSpec && <div className="text-[10px] text-slate-500">{newSpec.endpoints.length} endpoints, {Object.keys(newSpec.schemas).length} schemas</div>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="font-semibold text-emerald-700 dark:text-emerald-300">Added ({added.length})</div>
          {added.map((e) => (
            <div key={e.id} className="font-mono text-emerald-800 dark:text-emerald-200">
              {e.method.toUpperCase()} {e.path}
            </div>
          ))}
          {added.length === 0 && <div className="text-slate-500">None</div>}
        </div>
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="font-semibold text-red-700 dark:text-red-300">Removed ({removed.length}) - breaking</div>
          {removed.map((e) => (
            <div key={e.id} className="font-mono text-red-800 dark:text-red-200">
              {e.method.toUpperCase()} {e.path}
            </div>
          ))}
          {removed.length === 0 && <div className="text-slate-500">None</div>}
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="font-semibold text-amber-700 dark:text-amber-300">Changed ({changed.length})</div>
          {changedDetails.map((d) => (
            <div key={d.key} className="font-mono text-amber-800 dark:text-amber-200 flex justify-between">
              <span>{d.key}</span>
              <span className="text-[10px] px-1 rounded bg-white/50 dark:bg-black/20">{d.cls}</span>
            </div>
          ))}
          {changed.length === 0 && <div className="text-slate-500">None</div>}
        </div>
      </div>

      {oldSpec && newSpec && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Summary</div>
          <div className="text-slate-600 dark:text-slate-400">
            Schemas: {Object.keys(oldSpec.schemas).length} to {Object.keys(newSpec.schemas).length} ({Object.keys(newSpec.schemas).length - Object.keys(oldSpec.schemas).length > 0 ? '+' : ''}
            {Object.keys(newSpec.schemas).length - Object.keys(oldSpec.schemas).length}), Servers: {oldSpec.servers.length} to {newSpec.servers.length}
          </div>
        </div>
      )}
    </div>
  );
};
