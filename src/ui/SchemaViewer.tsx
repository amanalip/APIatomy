import React, { useState, useMemo, useEffect } from 'react';
import { SchemaModel } from '../model';
import { Search, Box, ChevronRight, ChevronDown, AlertCircle, Copy, Check, X } from 'lucide-react';
import { copyTextToClipboard } from '../share/urlHash';
import YAML from 'yaml';

interface SchemaViewerProps {
  schemas: Record<string, SchemaModel>;
  selectedSchemaName?: string;
  onSelectSchema?: (schemaName: string, schema: SchemaModel) => void;
}

export const SchemaViewer: React.FC<SchemaViewerProps> = ({
  schemas,
  selectedSchemaName,
  onSelectSchema,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSchemaName, setActiveSchemaName] = useState<string>(
    selectedSchemaName || Object.keys(schemas)[0] || ''
  );
  const [viewMode, setViewMode] = useState<'tree' | 'example'>('tree');
  const [mockFormat, setMockFormat] = useState<'json' | 'yaml'>('json');
  const [copiedExample, setCopiedExample] = useState(false);

  // Sync if selectedSchemaName changes from parent or if current active schema is removed
  useEffect(() => {
    if (selectedSchemaName && schemas[selectedSchemaName]) {
      setActiveSchemaName(selectedSchemaName);
    } else if (!schemas[activeSchemaName]) {
      const firstAvailable = Object.keys(schemas)[0] || '';
      setActiveSchemaName(firstAvailable);
    }
  }, [selectedSchemaName, schemas, activeSchemaName]);

  const schemaNames = useMemo(() => {
    const names = Object.keys(schemas).sort();
    if (!searchQuery.trim()) return names;
    const q = searchQuery.toLowerCase();
    return names.filter((n) => {
      if (n.toLowerCase().includes(q)) return true;
      const s = schemas[n];
      if (s?.title?.toLowerCase().includes(q)) return true;
      if (s?.description?.toLowerCase().includes(q)) return true;
      if (s?.properties && Object.keys(s.properties).some((propKey) => propKey.toLowerCase().includes(q))) {
        return true;
      }
      return false;
    });
  }, [schemas, searchQuery]);

  const activeSchema = schemas[activeSchemaName];

  const generatedMockText = useMemo(() => {
    if (!activeSchema) return mockFormat === 'yaml' ? '' : '{}';
    const mockData = generateMockData(activeSchema, schemas);
    if (mockFormat === 'yaml') {
      try {
        return YAML.stringify(mockData);
      } catch {
        return JSON.stringify(mockData, null, 2);
      }
    }
    return JSON.stringify(mockData, null, 2);
  }, [activeSchema, schemas, mockFormat]);

  const handleCopyMock = async () => {
    const success = await copyTextToClipboard(generatedMockText);
    if (success) {
      setCopiedExample(true);
      setTimeout(() => setCopiedExample(false), 2000);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-150">
      {/* Left List of Schema Names */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white/70 dark:bg-slate-900/40">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schemas..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 rounded-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {schemaNames.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">No schemas found</div>
          ) : (
            schemaNames.map((name) => {
              const isSelected = activeSchemaName === name;
              const s = schemas[name];

              return (
                <button
                  key={name}
                  onClick={() => {
                    setActiveSchemaName(name);
                    onSelectSchema?.(name, s);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition text-left ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Box className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
                    <span className="truncate">{name}</span>
                  </div>

                  {s.isCircular && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-sans border border-amber-200 dark:border-amber-500/40">
                      loop
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Schema Detail / Tree Inspector */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {activeSchema ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <h2 className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">{activeSchemaName}</h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                    {String(activeSchema.type || 'object')}
                  </span>
                  {activeSchema.isCircular && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40">
                      <AlertCircle className="w-3 h-3" />
                      Circular Reference Protected
                    </span>
                  )}
                </div>

                {activeSchema.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {activeSchema.description}
                  </p>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-2.5 py-1 text-xs rounded transition ${
                    viewMode === 'tree'
                      ? 'bg-indigo-600 text-white font-medium shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Structure Tree
                </button>
                <button
                  onClick={() => setViewMode('example')}
                  className={`px-2.5 py-1 text-xs rounded transition ${
                    viewMode === 'example'
                      ? 'bg-indigo-600 text-white font-medium shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Mock JSON
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {viewMode === 'tree' ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-sm">
                  <TreeNodeRenderer
                    schema={activeSchema}
                    schemas={schemas}
                    onNavigateRef={(target) => {
                      setActiveSchemaName(target);
                      if (schemas[target]) onSelectSchema?.(target, schemas[target]);
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">Format:</span>
                      <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-0.5 rounded text-[11px] font-mono">
                        <button
                          onClick={() => setMockFormat('json')}
                          className={`px-2 py-0.5 rounded transition ${
                            mockFormat === 'json'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          JSON
                        </button>
                        <button
                          onClick={() => setMockFormat('yaml')}
                          className={`px-2 py-0.5 rounded transition ${
                            mockFormat === 'yaml'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          YAML
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleCopyMock}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-sm"
                    >
                      {copiedExample ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Copy Mock {mockFormat.toUpperCase()}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed shadow-sm">
                    <code>{generatedMockText}</code>
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-xs">
            Select a schema from the left to view structure and properties.
          </div>
        )}
      </div>
    </div>
  );
};

interface TreeNodeRendererProps {
  schema: SchemaModel;
  schemas: Record<string, SchemaModel>;
  onNavigateRef: (target: string) => void;
  level?: number;
}

const TreeNodeRenderer: React.FC<TreeNodeRendererProps> = ({
  schema,
  schemas,
  onNavigateRef,
  level = 0,
}) => {
  const [collapsedProperties, setCollapsedProperties] = useState<Record<string, boolean>>({});

  const toggleProperty = (name: string) => {
    setCollapsedProperties((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const hasComposition = Boolean(schema.allOf || schema.oneOf || schema.anyOf);
  const hasProperties = Boolean(schema.properties && Object.keys(schema.properties).length > 0);
  const hasItems = Boolean(schema.items);

  if (!hasComposition && !hasProperties && !hasItems) {
    return (
      <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
        Type: <span className="text-blue-600 dark:text-blue-400">{String(schema.type || 'any')}</span>
        {schema.default !== undefined && (
          <span className="ml-3 text-slate-400 dark:text-slate-500">Default: {String(schema.default)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Composition: allOf, oneOf, anyOf */}
      {hasComposition && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
            Composition: {schema.allOf ? 'allOf (All Required)' : schema.oneOf ? 'oneOf (One Required)' : 'anyOf (Any Allowed)'}
          </div>
          <div className="pl-3 border-l-2 border-indigo-500/40 space-y-3">
            {(schema.allOf || schema.oneOf || schema.anyOf || []).map((sub, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">Branch #{idx + 1}</div>
                <TreeNodeRenderer
                  schema={sub}
                  schemas={schemas}
                  onNavigateRef={onNavigateRef}
                  level={level + 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Object with properties */}
      {hasProperties && (
        <div className="space-y-2">
          {Object.entries(schema.properties!).map(([propName, propSchema]) => {
            const isRequired = schema.required?.includes(propName);
            const hasChildren = propSchema.properties || propSchema.items || propSchema.allOf || propSchema.oneOf;
            const isCollapsed = collapsedProperties[propName] ?? false;

            return (
              <div
                key={propName}
                className="rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    {hasChildren && (
                      <button
                        onClick={() => toggleProperty(propName)}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{propName}</span>
                    {isRequired && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-500/30">
                        required
                      </span>
                    )}
                    <span className="text-slate-400 dark:text-slate-500">:</span>
                    <span className="text-blue-600 dark:text-blue-400 text-[11px]">
                      {String(propSchema.type || 'object')}
                      {propSchema.format ? ` <${propSchema.format}>` : ''}
                    </span>

                    {propSchema.minimum !== undefined && (
                      <span className="text-[10px] text-slate-500 font-mono">≥ {propSchema.minimum}</span>
                    )}
                    {propSchema.maximum !== undefined && (
                      <span className="text-[10px] text-slate-500 font-mono">≤ {propSchema.maximum}</span>
                    )}
                    {propSchema.minLength !== undefined && (
                      <span className="text-[10px] text-slate-500 font-mono">minLen: {propSchema.minLength}</span>
                    )}
                    {propSchema.maxLength !== undefined && (
                      <span className="text-[10px] text-slate-500 font-mono">maxLen: {propSchema.maxLength}</span>
                    )}
                    {propSchema.pattern && (
                      <span className="text-[10px] text-slate-500 font-mono" title={`Pattern: ${propSchema.pattern}`}>
                        /{propSchema.pattern}/
                      </span>
                    )}

                    {propSchema.refTarget && (
                      <button
                        onClick={() => onNavigateRef(propSchema.refTarget!)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-semibold"
                      >
                        → {propSchema.refTarget}
                      </button>
                    )}
                  </div>

                  {propSchema.enum && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span>enum:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-400">[{propSchema.enum.join(', ')}]</span>
                    </div>
                  )}
                </div>

                {propSchema.description && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-4">{propSchema.description}</div>
                )}

                {/* Nested properties expansion */}
                {hasChildren && !isCollapsed && (
                  <div className="pl-4 pt-2 border-l border-slate-200 dark:border-slate-800/80 mt-1">
                    <TreeNodeRenderer
                      schema={propSchema.items || propSchema}
                      schemas={schemas}
                      onNavigateRef={onNavigateRef}
                      level={level + 1}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Array items */}
      {hasItems && !hasProperties && (
        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Array of</span>
            <span className="text-blue-600 dark:text-blue-400 font-mono font-semibold">
              {String(schema.items?.type || 'object')}
            </span>
            {schema.items?.refTarget && (
              <button
                onClick={() => onNavigateRef(schema.items!.refTarget!)}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
              >
                ({schema.items.refTarget})
              </button>
            )}
          </div>

          {schema.items?.properties && (
            <div className="pl-3 border-l border-slate-200 dark:border-slate-800">
              <TreeNodeRenderer
                schema={schema.items}
                schemas={schemas}
                onNavigateRef={onNavigateRef}
                level={level + 1}
              />
            </div>
          )}
        </div>
      )}

      {/* Additional properties dictionary map */}
      {schema.additionalProperties && (
        <div className="pt-2 text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pl-3 border-l border-dashed border-slate-200 dark:border-slate-800">
          <span className="text-slate-500">[key: string]:</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {typeof schema.additionalProperties === 'object'
              ? String((schema.additionalProperties as any).type || (schema.additionalProperties as any).refTarget || 'any')
              : 'any'}
          </span>
          {typeof schema.additionalProperties === 'object' && (schema.additionalProperties as any).refTarget && (
            <button
              onClick={() => onNavigateRef((schema.additionalProperties as any).refTarget!)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
            >
              → {(schema.additionalProperties as any).refTarget}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

function generateMockData(schema: SchemaModel, allSchemas: Record<string, SchemaModel>, depth = 0): unknown {
  if (depth > 4) return '...';

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }

  if (schema.refTarget && allSchemas[schema.refTarget]) {
    return generateMockData(allSchemas[schema.refTarget], allSchemas, depth + 1);
  }

  // Handle allOf / oneOf / anyOf composition in mock generation
  if (schema.allOf && schema.allOf.length > 0) {
    const merged: Record<string, unknown> = {};
    for (const sub of schema.allOf) {
      const subData = generateMockData(sub, allSchemas, depth + 1);
      if (typeof subData === 'object' && subData !== null) {
        Object.assign(merged, subData);
      }
    }
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        merged[key] = generateMockData(prop, allSchemas, depth + 1);
      }
    }
    return merged;
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    return generateMockData(schema.oneOf[0], allSchemas, depth + 1);
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    return generateMockData(schema.anyOf[0], allSchemas, depth + 1);
  }

  if (schema.type === 'string') {
    if (schema.format === 'email') return 'alex@example.com';
    if (schema.format === 'date-time') return new Date().toISOString();
    if (schema.format === 'date') return '2026-08-23';
    if (schema.format === 'ipv4') return '192.168.1.1';
    if (schema.format === 'hostname') return 'api.example.com';
    if (schema.format === 'uuid') return 'a1b2c3d4-e5f6-7a8b-9c0d-ef1234567890';
    if (schema.format === 'uri') return 'https://api.example.com';
    return schema.name || 'string_value';
  }

  if (schema.type === 'integer') {
    return schema.minimum ?? 1;
  }

  if (schema.type === 'number') {
    return schema.minimum ?? 19.99;
  }

  if (schema.type === 'boolean') {
    return true;
  }

  if (schema.type === 'array' || schema.items) {
    const count = typeof schema.minItems === 'number' && schema.minItems > 0 ? Math.min(schema.minItems, 5) : 1;
    const itemData = schema.items
      ? generateMockData(schema.items, allSchemas, depth + 1)
      : 'item';
    return Array.from({ length: count }, () => itemData);
  }

  if (schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      obj[key] = generateMockData(prop, allSchemas, depth + 1);
    }
    return obj;
  }

  return {};
}
