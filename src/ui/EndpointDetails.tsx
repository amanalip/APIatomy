import React, { useState } from 'react';
import { EndpointModel, ServerModel, SchemaModel, SecuritySchemeModel } from '../model';
import { HTTP_METHODS, getStatusCategory } from '../model/httpMethods';
import { CurlGenerator } from './CurlGenerator';
import { X, Shield, ArrowRight, FileCode, CheckCircle2, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';

interface EndpointDetailsProps {
  endpoint: EndpointModel;
  servers: ServerModel[];
  schemas: Record<string, SchemaModel>;
  securitySchemes?: Record<string, SecuritySchemeModel>;
  onClose: () => void;
  onSelectSchema?: (schemaName: string, schema: SchemaModel) => void;
}

export const EndpointDetails: React.FC<EndpointDetailsProps> = ({
  endpoint,
  servers,
  schemas,
  onClose,
  onSelectSchema,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'curl'>('details');
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({
    '200': true,
    '201': true,
  });

  const methodConfig = HTTP_METHODS[endpoint.method] || HTTP_METHODS.get;

  const toggleResponse = (code: string) => {
    setExpandedResponses((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden shadow-2xl transition-colors duration-150">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/70 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded shadow-sm ${methodConfig.badgeBg}`}
            >
              {methodConfig.label}
            </span>
            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-200 break-all">
              {endpoint.path}
            </span>
            {endpoint.deprecated && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/40">
                Deprecated
              </span>
            )}
          </div>

          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {endpoint.summary || endpoint.path}
          </h2>

          {endpoint.description && endpoint.description !== endpoint.summary && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              {endpoint.description}
            </p>
          )}

          {endpoint.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {endpoint.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/60 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
        <button
          onClick={() => setActiveTab('details')}
          className={`py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'details'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Request & Responses
        </button>
        <button
          onClick={() => setActiveTab('curl')}
          className={`py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'curl'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          cURL Snippet
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'curl' ? (
          <CurlGenerator endpoint={endpoint} servers={servers} />
        ) : (
          <>
            {/* Deprecation Warning */}
            {endpoint.deprecated && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="font-semibold">This endpoint is deprecated.</span>
                  <span className="ml-1 text-slate-600 dark:text-slate-400">It may be removed or replaced in future revisions of this API.</span>
                </div>
              </div>
            )}

            {/* Security */}
            {endpoint.security.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Security & Authentication</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  {endpoint.security.map((sec, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-amber-700 dark:text-amber-300 font-medium">{sec.name}</span>
                      {sec.scopes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {sec.scopes.map((scope) => (
                            <span
                              key={scope}
                              className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-mono"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">No specific scopes required</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parameters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Parameters ({endpoint.parameters.length})</span>
              </div>

              {endpoint.parameters.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                  No parameters defined for this endpoint.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">In</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {endpoint.parameters.map((p) => (
                        <tr key={`${p.in}-${p.name}`} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/40">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.required && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-500/30">
                                  req
                                </span>
                              )}
                              {p.deprecated && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-500/30">
                                  dep
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {p.in}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-slate-400 text-[11px]">
                            <div>
                              {String(p.schema?.type || 'string')}
                              {p.schema?.format ? ` (${p.schema.format})` : ''}
                            </div>
                            {p.schema?.enum && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                enum: [{p.schema.enum.join(', ')}]
                              </div>
                            )}
                            {p.style && (
                              <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                                style: {p.style}{p.explode ? ' (explode)' : ''}
                              </div>
                            )}
                            {p.allowReserved && (
                              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-sans mt-0.5">
                                allowReserved
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                            {p.description || <span className="italic text-slate-400 dark:text-slate-600">No description</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Request Body */}
            {endpoint.requestBody && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <FileCode className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span>Request Body</span>
                  {endpoint.requestBody.required && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-bold ml-1 border border-red-200 dark:border-red-500/30">
                      Required
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  {endpoint.requestBody.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{endpoint.requestBody.description}</p>
                  )}

                  {endpoint.requestBody.content.map((c, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[11px] font-mono font-medium">
                          {c.contentType}
                        </span>

                        {c.schema?.refTarget && (
                          <button
                            onClick={() => {
                              const target = schemas[c.schema!.refTarget!];
                              if (target) onSelectSchema?.(c.schema!.refTarget!, target);
                            }}
                            className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                          >
                            <span>Schema: {c.schema.refTarget}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {c.schema && (
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300 overflow-x-auto">
                          <SchemaPropertyTree
                            schema={c.schema}
                            schemas={schemas}
                            onSelectSchema={onSelectSchema}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responses */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Responses ({endpoint.responses.length})</span>
              </div>

              <div className="space-y-2">
                {[...endpoint.responses]
                  .sort((a, b) => {
                    const aNum = parseInt(a.statusCode, 10);
                    const bNum = parseInt(b.statusCode, 10);
                    if (isNaN(aNum) && isNaN(bNum)) return a.statusCode.localeCompare(b.statusCode);
                    if (isNaN(aNum)) return 1;
                    if (isNaN(bNum)) return -1;
                    return aNum - bNum;
                  })
                  .map((resp) => {
                    const statusInfo = getStatusCategory(resp.statusCode);
                    const isExpanded = expandedResponses[resp.statusCode] ?? false;

                  return (
                    <div
                      key={resp.statusCode}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 overflow-hidden shadow-sm"
                    >
                      <button
                        onClick={() => toggleResponse(resp.statusCode)}
                        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900/60 transition text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}
                          >
                            {resp.statusCode}
                          </span>
                          <span className="text-xs text-slate-800 dark:text-slate-300 truncate font-medium">
                            {resp.description || statusInfo.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {resp.content.length > 0 && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {resp.content[0].contentType}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 space-y-3">
                          {resp.headers && Object.keys(resp.headers).length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                Response Headers
                              </span>
                              <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1.5 divide-y divide-slate-200/60 dark:divide-slate-800/60">
                                {Object.entries(resp.headers).map(([hKey, hVal]: [string, any]) => (
                                  <div key={hKey} className="pt-1 first:pt-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{hKey}</span>
                                      <span className="text-blue-600 dark:text-blue-400 text-[10px]">
                                        {hVal.schema?.type || (typeof hVal.type === 'string' ? hVal.type : 'string')}
                                      </span>
                                    </div>
                                    {hVal.description && (
                                      <div className="text-[11px] font-sans text-slate-500 dark:text-slate-400 mt-0.5">
                                        {hVal.description}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {resp.content.length === 0 && (!resp.headers || Object.keys(resp.headers).length === 0) && (
                            <div className="text-xs text-slate-500 italic">
                              No response body or headers specified.
                            </div>
                          )}

                          {resp.content.map((c, idx) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px] font-mono font-medium">
                                  {c.contentType}
                                </span>
                                {c.schema?.refTarget && (
                                  <button
                                    onClick={() => {
                                      const target = schemas[c.schema!.refTarget!];
                                      if (target) onSelectSchema?.(c.schema!.refTarget!, target);
                                    }}
                                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                                  >
                                    <span>Schema: {c.schema.refTarget}</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {c.schema ? (
                                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300 overflow-x-auto">
                                  <SchemaPropertyTree
                                    schema={c.schema}
                                    schemas={schemas}
                                    onSelectSchema={onSelectSchema}
                                  />
                                </div>
                              ) : c.example ? (
                                <pre className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300 overflow-x-auto">
                                  <code>{typeof c.example === 'object' ? JSON.stringify(c.example, null, 2) : String(c.example)}</code>
                                </pre>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface SchemaPropertyTreeProps {
  schema: SchemaModel;
  schemas: Record<string, SchemaModel>;
  onSelectSchema?: (schemaName: string, schema: SchemaModel) => void;
}

const SchemaPropertyTree: React.FC<SchemaPropertyTreeProps> = ({
  schema,
  schemas,
  onSelectSchema,
}) => {
  if (schema.properties && Object.keys(schema.properties).length > 0) {
    return (
      <div className="space-y-1">
        {Object.entries(schema.properties).map(([propName, propSchema]) => {
          const isRequired = schema.required?.includes(propName);
          return (
            <div key={propName} className="flex items-baseline gap-2 py-0.5 text-xs">
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{propName}</span>
              {isRequired && <span className="text-red-500 dark:text-red-400 text-[10px] font-bold">*</span>}
              <span className="text-slate-400 dark:text-slate-500">:</span>
              <span className="text-blue-600 dark:text-blue-400 text-[11px] font-mono">
                {String(propSchema.type || 'object')}
                {propSchema.format ? ` (${propSchema.format})` : ''}
              </span>
              {propSchema.refTarget && (
                <button
                  onClick={() => {
                    const target = schemas[propSchema.refTarget!];
                    if (target) onSelectSchema?.(propSchema.refTarget!, target);
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] flex items-center gap-0.5"
                >
                  <span>→ {propSchema.refTarget}</span>
                </button>
              )}
              {propSchema.description && (
                <span className="text-slate-500 text-[11px] truncate" title={propSchema.description}>
                  // {propSchema.description}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (schema.items) {
    return (
      <div className="text-xs text-slate-700 dark:text-slate-300">
        <span className="text-slate-500 dark:text-slate-400">Array of </span>
        <span className="text-blue-600 dark:text-blue-400 font-semibold">{String(schema.items.type || 'object')}</span>
        {schema.items.refTarget && (
          <button
            onClick={() => {
              const target = schemas[schema.items!.refTarget!];
              if (target) onSelectSchema?.(schema.items!.refTarget!, target);
            }}
            className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
          >
            ({schema.items.refTarget})
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-xs text-slate-500 dark:text-slate-400">
      Type: <span className="text-blue-600 dark:text-blue-400">{String(schema.type || 'any')}</span>
    </div>
  );
};
