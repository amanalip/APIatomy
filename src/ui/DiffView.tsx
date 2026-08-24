import React, { useMemo } from 'react';
import { parseApiSpec } from '../parser';
import { ApiSpecModel } from '../model';

interface DiffViewProps {
  oldText: string;
  newText: string;
}

export const DiffView: React.FC<DiffViewProps> = ({ oldText, newText }) => {
  const { added, removed, changed } = useMemo(() => {
    let oldSpec: ApiSpecModel | null = null;
    let newSpec: ApiSpecModel | null = null;
    try {
      oldSpec = parseApiSpec(oldText);
    } catch {
      // ignore parse error for diff
    }
    try {
      newSpec = parseApiSpec(newText);
    } catch {
      // ignore parse error for diff
    }
    if (!oldSpec || !newSpec) return { added: [], removed: [], changed: [] };
    const oldIds = new Set(oldSpec.endpoints.map((e) => `${e.method} ${e.path}`));
    const newIds = new Set(newSpec.endpoints.map((e) => `${e.method} ${e.path}`));
    const added = newSpec.endpoints.filter((e) => !oldIds.has(`${e.method} ${e.path}`));
    const removed = oldSpec.endpoints.filter((e) => !newIds.has(`${e.method} ${e.path}`));
    const changed: string[] = [];
    for (const e of newSpec.endpoints) {
      const key = `${e.method} ${e.path}`;
      if (oldIds.has(key)) {
        const oldEp = oldSpec.endpoints.find((o) => `${o.method} ${o.path}` === key);
        if (oldEp && JSON.stringify(oldEp) !== JSON.stringify(e)) changed.push(key);
      }
    }
    return { added, removed, changed };
  }, [oldText, newText]);

  return (
    <div className="p-4 space-y-4 text-xs">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">API Diff</h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="font-semibold text-emerald-700 dark:text-emerald-300">Added ({added.length})</div>
          {added.map((e) => (
            <div key={e.id} className="font-mono text-emerald-800 dark:text-emerald-200">
              {e.method.toUpperCase()} {e.path}
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="font-semibold text-red-700 dark:text-red-300">Removed ({removed.length})</div>
          {removed.map((e) => (
            <div key={e.id} className="font-mono text-red-800 dark:text-red-200">
              {e.method.toUpperCase()} {e.path}
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="font-semibold text-amber-700 dark:text-amber-300">Changed ({changed.length})</div>
          {changed.map((k) => (
            <div key={k} className="font-mono text-amber-800 dark:text-amber-200">
              {k}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
