import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const oldReq = new Set(
    oldEp.parameters.filter((p) => p.required).map((p) => `${p.in}:${p.name}`)
  );
  const newReq = new Set(
    newEp.parameters.filter((p) => p.required).map((p) => `${p.in}:${p.name}`)
  );
  for (const r of oldReq) if (!newReq.has(r)) return 'breaking';
  for (const r of newReq) if (!oldReq.has(r)) return 'breaking';
  if (oldEp.deprecated !== newEp.deprecated) return 'non-breaking';
  if (
    (oldEp.summary || '') !== (newEp.summary || '') ||
    (oldEp.description || '') !== (newEp.description || '')
  ) {
    const withoutDocsOld = { ...oldEp, summary: '', description: '' };
    const withoutDocsNew = { ...newEp, summary: '', description: '' };
    if (JSON.stringify(withoutDocsOld) === JSON.stringify(withoutDocsNew))
      return 'documentation-only';
  }
  return 'non-breaking';
}

function hasParseError(spec: ApiSpecModel | null, raw: string): boolean {
  if (!raw.trim()) return false;
  if (!spec) return true;
  if (spec.title === 'Invalid Spec' || spec.title === 'Parse Error') return true;
  return spec.diagnostics.some(
    (d) => d.severity === 'error' && (d.source === 'syntax' || d.id === 'parse-crash')
  );
}

export const DiffView: React.FC<DiffViewProps> = ({ oldText: initialOld, newText: initialNew }) => {
  const [oldText, setOldText] = useState(initialOld);
  const [newText, setNewText] = useState(initialNew);
  const [debouncedOld, setDebouncedOld] = useState(oldText);
  const [debouncedNew, setDebouncedNew] = useState(newText);
  React.useEffect(() => setOldText(initialOld), [initialOld]);
  React.useEffect(() => setNewText(initialNew), [initialNew]);

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
    let oldSpec: ApiSpecModel | null = null;
    let newSpec: ApiSpecModel | null = null;
    let oldParseError = false;
    let newParseError = false;

    if (debouncedOld.trim()) {
      try {
        oldSpec = parseApiSpec(debouncedOld);
        oldParseError = hasParseError(oldSpec, debouncedOld);
      } catch {
        oldSpec = null;
        oldParseError = true;
      }
    }

    if (debouncedNew.trim()) {
      try {
        newSpec = parseApiSpec(debouncedNew);
        newParseError = hasParseError(newSpec, debouncedNew);
      } catch {
        newSpec = null;
        newParseError = true;
      }
    }

    if (!oldSpec || !newSpec) {
      return {
        added: [] as EndpointModel[],
        removed: [] as EndpointModel[],
        changed: [] as string[],
        changedDetails: [] as Array<{ key: string; cls: ChangeClass }>,
        oldSpec,
        newSpec,
        addedSchemas: [] as string[],
        removedSchemas: [] as string[],
        changedSchemas: [] as string[],
        addedSecurity: [] as string[],
        removedSecurity: [] as string[],
        changedSecurity: [] as string[],
        addedServers: [] as typeof oldSpec extends { servers: infer S } ? S : never[],
        removedServers: [] as typeof oldSpec extends { servers: infer S } ? S : never[],
        globalChanges: [] as string[],
        oldParseError,
        newParseError,
      };
    }

    if (oldParseError || newParseError) {
      return {
        added: [] as EndpointModel[],
        removed: [] as EndpointModel[],
        changed: [] as string[],
        changedDetails: [] as Array<{ key: string; cls: ChangeClass }>,
        oldSpec,
        newSpec,
        addedSchemas: [] as string[],
        removedSchemas: [] as string[],
        changedSchemas: [] as string[],
        addedSecurity: [] as string[],
        removedSecurity: [] as string[],
        changedSecurity: [] as string[],
        addedServers: [] as typeof oldSpec extends { servers: infer S } ? S : never[],
        removedServers: [] as typeof oldSpec extends { servers: infer S } ? S : never[],
        globalChanges: [] as string[],
        oldParseError,
        newParseError,
      };
    }

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

    const oldSchemaKeys = Object.keys(oldSpec.schemas);
    const newSchemaKeys = Object.keys(newSpec.schemas);
    const addedSchemas = newSchemaKeys.filter((k) => !(k in oldSpec!.schemas));
    const removedSchemas = oldSchemaKeys.filter((k) => !(k in newSpec!.schemas));
    const changedSchemas = newSchemaKeys.filter(
      (k) =>
        k in oldSpec!.schemas &&
        JSON.stringify(oldSpec!.schemas[k]) !== JSON.stringify(newSpec!.schemas[k])
    );

    const oldSecKeys = Object.keys(oldSpec.securitySchemes);
    const newSecKeys = Object.keys(newSpec.securitySchemes);
    const addedSecurity = newSecKeys.filter((k) => !(k in oldSpec!.securitySchemes));
    const removedSecurity = oldSecKeys.filter((k) => !(k in newSpec!.securitySchemes));
    const changedSecurity = newSecKeys.filter(
      (k) =>
        k in oldSpec!.securitySchemes &&
        JSON.stringify(oldSpec!.securitySchemes[k]) !== JSON.stringify(newSpec!.securitySchemes[k])
    );

    const stringifyServer = (s: { url: string; description?: string; variables?: unknown }) =>
      JSON.stringify(s);
    const oldServerStrings = new Set(oldSpec.servers.map(stringifyServer));
    const newServerStrings = new Set(newSpec.servers.map(stringifyServer));
    const addedServers = newSpec.servers.filter((s) => !oldServerStrings.has(stringifyServer(s)));
    const removedServers = oldSpec.servers.filter((s) => !newServerStrings.has(stringifyServer(s)));

    const globalChanges: string[] = [];
    if (oldSpec.title !== newSpec.title)
      globalChanges.push(`title: "${oldSpec.title}" -> "${newSpec.title}"`);
    if (oldSpec.version !== newSpec.version)
      globalChanges.push(`version: "${oldSpec.version}" -> "${newSpec.version}"`);
    if ((oldSpec.description || '') !== (newSpec.description || ''))
      globalChanges.push('description changed');
    if ((oldSpec.termsOfService || '') !== (newSpec.termsOfService || ''))
      globalChanges.push('termsOfService changed');
    if (JSON.stringify(oldSpec.contact || null) !== JSON.stringify(newSpec.contact || null))
      globalChanges.push('contact changed');
    if (JSON.stringify(oldSpec.license || null) !== JSON.stringify(newSpec.license || null))
      globalChanges.push('license changed');
    if (oldSpec.openApiVersion !== newSpec.openApiVersion)
      globalChanges.push(
        `openApiVersion: "${oldSpec.openApiVersion}" -> "${newSpec.openApiVersion}"`
      );
    if (JSON.stringify(oldSpec.tags) !== JSON.stringify(newSpec.tags))
      globalChanges.push(`tags changed`);
    const oldSec = (oldSpec as unknown as { security?: unknown }).security;
    const newSec = (newSpec as unknown as { security?: unknown }).security;
    if (JSON.stringify(oldSec || null) !== JSON.stringify(newSec || null))
      globalChanges.push('global security changed');

    return {
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
    };
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

  const useCurrentForOld = () => setOldText(initialNew);
  const useCurrentForNew = () => setNewText(initialNew);

  return (
    <div className="p-4 space-y-4 text-xs">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        API Diff - Compare two specs
      </h2>
      <p className="text-slate-600 dark:text-slate-400">
        Choose Old and New specs explicitly. Supports current editor, upload, URL and workspace. Do
        not default to Petstore for user APIs.
      </p>

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
