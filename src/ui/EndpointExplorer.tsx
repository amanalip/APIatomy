import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EndpointModel, HttpMethod } from '../model';
import { HTTP_METHODS } from '../model/httpMethods';
import { Search, ChevronDown, ChevronRight, Tag, Shield, X } from 'lucide-react';
import { VirtualList } from './VirtualList';
import { useResizeObserver } from '../hooks/useResizeObserver';

interface EndpointExplorerProps {
  endpoints: EndpointModel[];
  selectedEndpoint: EndpointModel | null;
  onSelectEndpoint: (endpoint: EndpointModel) => void;
}

export const EndpointExplorer: React.FC<EndpointExplorerProps> = ({
  endpoints,
  selectedEndpoint,
  onSelectEndpoint,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<HttpMethod | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [collapsedTags, setCollapsedTags] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeEndpointRef = useRef<HTMLDivElement>(null);
  const [listContainerRef, listHeight] = useResizeObserver<HTMLDivElement>();

  useEffect(() => {
    if (selectedEndpoint && activeEndpointRef.current) {
      activeEndpointRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedEndpoint?.id]);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        document.activeElement?.classList.contains('cm-content')
      ) {
        return;
      }
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // All unique tags in spec
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const ep of endpoints) {
      for (const t of ep.tags) tags.add(t);
    }
    return Array.from(tags).sort();
  }, [endpoints]);

  // Filtered endpoints
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      // Method filter
      if (selectedMethod !== 'all' && ep.method !== selectedMethod) return false;

      // Tag filter
      if (selectedTag !== 'all' && !ep.tags.includes(selectedTag)) return false;

      // Search query - method uses exact match to avoid false positives (e.g. get in target)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pathMatch = ep.path.toLowerCase().includes(q);
        const summaryMatch = ep.summary?.toLowerCase().includes(q);
        const descMatch = ep.description?.toLowerCase().includes(q);
        const methodMatch = ep.method.toLowerCase() === q;
        const tagMatch = ep.tags.some((t) => t.toLowerCase().includes(q));

        if (!pathMatch && !summaryMatch && !descMatch && !methodMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    });
  }, [endpoints, selectedMethod, selectedTag, searchQuery]);

  // Group by primary or selected tag
  const groupedEndpoints = useMemo(() => {
    const groups: Record<string, EndpointModel[]> = {};

    for (const ep of filteredEndpoints) {
      const tagKey =
        selectedTag !== 'all' && ep.tags.includes(selectedTag)
          ? selectedTag
          : ep.tags[0] || 'Default';

      if (!groups[tagKey]) {
        groups[tagKey] = [];
      }
      groups[tagKey].push(ep);
    }

    return groups;
  }, [filteredEndpoints, selectedTag]);

  const totalByTag = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ep of endpoints) {
      const tags = ep.tags.length > 0 ? ep.tags : ['Default'];
      for (const t of tags) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return counts;
  }, [endpoints]);

  const toggleTagCollapse = (tag: string) => {
    setCollapsedTags((prev) => ({ ...prev, [tag]: !prev[tag] }));
  };

  const handleToggleAllTags = () => {
    const allCollapsed = Object.keys(groupedEndpoints).every((tag) => collapsedTags[tag]);
    const nextState: Record<string, boolean> = {};
    for (const tag of Object.keys(groupedEndpoints)) {
      nextState[tag] = !allCollapsed;
    }
    setCollapsedTags(nextState);
  };

  const methodsList: (HttpMethod | 'all')[] = [
    'all',
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'options',
    'head',
    'trace',
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-150">
      {/* Top Search & Filter Bar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-white/70 dark:bg-slate-900/50 backdrop-blur">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchQuery('');
            }}
            placeholder="Search endpoints by path, summary, or tag... [/]"
            aria-label="Search endpoints"
            className="w-full pl-9 pr-16 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 rounded-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="absolute right-8 top-1.5 hidden sm:flex items-center text-[9px] font-mono px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 pointer-events-none">
            /
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear endpoint search"
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-1 focus-visible:ring-blue-500"
              title="Clear search (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Method filter pills - UX: aria-pressed + per-method count + TRACE support */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
          role="toolbar"
          aria-label="Filter by HTTP method"
        >
          {methodsList.map((m) => {
            const isSelected = selectedMethod === m;
            const count =
              m === 'all' ? endpoints.length : endpoints.filter((e) => e.method === m).length;
            return (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                aria-pressed={isSelected}
                title={
                  m === 'all'
                    ? `Show all ${count} endpoints`
                    : `Filter ${m.toUpperCase()} (${count})`
                }
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition ${
                  isSelected
                    ? m === 'all'
                      ? 'bg-slate-800 dark:bg-slate-700 text-white shadow'
                      : HTTP_METHODS[m as HttpMethod]?.badgeBg || 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {m === 'all' ? `ALL (${count})` : `${m.toUpperCase()} (${count})`}
              </button>
            );
          })}
        </div>

        {/* Tag filter dropdown if multiple tags exist */}
        {allTags.length > 1 && (
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Tags ({endpoints.length})</option>
              {allTags.map((tag) => {
                const count = endpoints.filter((e) => e.tags.includes(tag)).length;
                return (
                  <option key={tag} value={tag}>
                    {tag} ({count})
                  </option>
                );
              })}
            </select>
            {selectedTag !== 'all' && (
              <button
                onClick={() => setSelectedTag('all')}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-lg text-[10px] font-medium whitespace-nowrap"
                title="Reset tag filter to all tags"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleToggleAllTags}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg text-[10px] font-medium whitespace-nowrap"
              title="Toggle Expand/Collapse for all tag groups"
            >
              {Object.keys(groupedEndpoints).every((tag) => collapsedTags[tag])
                ? 'Expand All'
                : 'Collapse All'}
            </button>
          </div>
        )}
      </div>

      {/* Endpoint Cards Grouped by Tag - virtualized for large APIs */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {filteredEndpoints.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <div className="font-medium text-slate-600 dark:text-slate-400">
              No endpoints found matching your filter criteria.
            </div>
            <div className="text-[11px]">
              Showing 0 of {endpoints.length} endpoints - try adjusting search, method, or tag
              filters.
            </div>
            {(searchQuery || selectedMethod !== 'all' || selectedTag !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMethod('all');
                  setSelectedTag('all');
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : filteredEndpoints.length > 100 ? (
          <div ref={listContainerRef} className="flex-1 min-h-[300px]">
            <VirtualList
              items={filteredEndpoints}
              height={Math.max(300, listHeight || 600)}
              itemHeight={92}
              renderItem={(ep) => {
                const isSelected = selectedEndpoint?.id === ep.id;
                const methodConfig = HTTP_METHODS[ep.method] || HTTP_METHODS.get;
                return (
                  <div
                    key={ep.id}
                    data-testid="endpoint-card"
                    ref={isSelected ? activeEndpointRef : undefined}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectEndpoint(ep)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectEndpoint(ep);
                      }
                    }}
                    aria-pressed={isSelected}
                    className={`mx-1 group cursor-pointer rounded-xl border p-2.5 transition flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-md'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded shadow-sm shrink-0 ${methodConfig.badgeBg}`}
                      >
                        {methodConfig.label}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">
                        {ep.path}
                      </span>
                    </div>
                    {ep.summary && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        {ep.summary}
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </div>
        ) : (
          Object.entries(groupedEndpoints).map(([tag, eps]) => {
            const isCollapsed = collapsedTags[tag] ?? false;

            return (
              <div key={tag} className="space-y-2">
                {/* Tag Header */}
                <button
                  onClick={() => toggleTagCollapse(tag)}
                  className="w-full flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition text-left"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-slate-200">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    )}
                    <span className="uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      {tag}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      ({eps.length}
                      {totalByTag[tag] && totalByTag[tag] !== eps.length
                        ? ` / ${totalByTag[tag]}`
                        : ''}
                      )
                    </span>
                  </div>
                </button>

                {/* Tag Endpoints */}
                {!isCollapsed && (
                  <div className="space-y-1.5 pl-2">
                    {eps.map((ep) => {
                      const isSelected = selectedEndpoint?.id === ep.id;
                      const methodConfig = HTTP_METHODS[ep.method] || HTTP_METHODS.get;

                      return (
                        <div
                          key={ep.id}
                          data-testid="endpoint-card"
                          ref={isSelected ? activeEndpointRef : undefined}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectEndpoint(ep)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectEndpoint(ep);
                            }
                          }}
                          aria-pressed={isSelected}
                          aria-label={`${ep.method.toUpperCase()} ${ep.path}${ep.deprecated ? ' deprecated' : ''}`}
                          className={`group cursor-pointer rounded-xl border p-2.5 transition flex flex-col gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-md'
                              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded shadow-sm shrink-0 ${methodConfig.badgeBg}`}
                            >
                              {methodConfig.label}
                            </span>
                            <span
                              className={`font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 truncate flex-1 ${
                                ep.deprecated ? 'line-through opacity-60' : ''
                              }`}
                              title={ep.path}
                            >
                              {ep.path}
                            </span>
                            {ep.deprecated && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-500/30 uppercase tracking-wider">
                                Deprecated
                              </span>
                            )}
                          </div>

                          {ep.summary && (
                            <div
                              className="text-[11px] text-slate-600 dark:text-slate-400 truncate pl-0.5"
                              title={ep.summary}
                            >
                              {ep.summary}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                            {ep.parameters.length > 0 && (
                              <span>
                                {ep.parameters.length} param{ep.parameters.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {ep.requestBody && <span>• Body payload</span>}
                            {ep.responses.length > 0 && (
                              <span>• {ep.responses.length} responses</span>
                            )}
                            {ep.security.length > 0 && (
                              <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400/80 ml-auto font-medium">
                                <Shield className="w-2.5 h-2.5" />
                                Secured
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
