import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Node,
  useReactFlow,
  ReactFlowProvider,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ApiSpecModel, EndpointModel, SchemaModel } from '../model';
import { computeApiTopologyGraph } from '../layout/graphLayout';
import { EndpointNode } from './EndpointNode';
import { SchemaNode } from './SchemaNode';
import { CustomEdge } from './CustomEdge';
import { useTheme } from '../theme/ThemeContext';
import { Download, LayoutGrid, Search, Network, Maximize2, FileImage } from 'lucide-react';

const nodeTypes: NodeTypes = {
  endpointNode: EndpointNode as any,
  schemaNode: SchemaNode as any,
};

const edgeTypes: EdgeTypes = {
  customEdge: CustomEdge as any,
};

interface TopologyGraphProps {
  spec: ApiSpecModel;
  onSelectEndpoint?: (endpoint: EndpointModel) => void;
  onSelectSchema?: (schemaName: string, schema: SchemaModel) => void;
}

const TopologyCanvas: React.FC<TopologyGraphProps> = ({
  spec,
  onSelectEndpoint,
  onSelectSchema,
}) => {
  const { theme } = useTheme();
  const { fitView } = useReactFlow();
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'endpoints' | 'schemas'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const isDark = theme === 'dark';

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const ep of spec.endpoints) {
      for (const t of ep.tags) tags.add(t);
    }
    return Array.from(tags).sort();
  }, [spec.endpoints]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = computeApiTopologyGraph(spec, {
      direction,
      nodeWidth: 280,
      nodeHeight: 90,
    });
    return { initialNodes: nodes, initialEdges: edges };
  }, [spec, direction]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Synchronize when spec or layout direction changes with cleanup
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    const t = setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 50);
    return () => clearTimeout(t);
  }, [initialNodes, initialEdges, fitView]);

  // Apply filtering and search highlighting - deterministic hidden set prevents stale closure race
  useEffect(() => {
    // Hidden set derived from initialNodes (source of truth) to avoid mutating Set inside setNodes callback
    const hiddenIds = new Set<string>();
    for (const n of initialNodes) {
      let isVisible = true;
      if (filterType === 'endpoints' && n.type !== 'endpointNode') isVisible = false;
      if (filterType === 'schemas' && n.type !== 'schemaNode') isVisible = false;
      if (selectedTag !== 'all' && n.type === 'endpointNode') {
        const data = n.data as any;
        if (!data.tags || !data.tags.includes(selectedTag)) isVisible = false;
      }
      if (!isVisible) hiddenIds.add(n.id);
    }

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        const isVisible = !hiddenIds.has(n.id);
        let isMatch = true;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (n.type === 'endpointNode') {
            const data = n.data as any;
            isMatch =
              data.path.toLowerCase().includes(q) ||
              data.method.toLowerCase().includes(q) ||
              (data.summary || '').toLowerCase().includes(q);
          } else if (n.type === 'schemaNode') {
            const data = n.data as any;
            isMatch = (data.schemaName || '').toLowerCase().includes(q);
          }
        }
        return {
          ...n,
          hidden: !isVisible,
          style: {
            ...n.style,
            opacity: searchQuery.trim() ? (isMatch ? 1 : 0.2) : 1,
            transition: 'opacity 0.2s ease',
          },
        };
      })
    );

    setEdges((prevEdges) =>
      prevEdges.map((e) => ({
        ...e,
        hidden: hiddenIds.has(e.source) || hiddenIds.has(e.target),
      }))
    );
  }, [searchQuery, filterType, selectedTag, initialNodes, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'endpointNode' && node.data?.endpoint) {
        onSelectEndpoint?.(node.data.endpoint as EndpointModel);
      } else if (node.type === 'schemaNode' && node.data?.schemaName) {
        onSelectSchema?.(
          node.data.schemaName as string,
          node.data.schema as SchemaModel
        );
      }
    },
    [onSelectEndpoint, onSelectSchema]
  );

  const toggleDirection = () => {
    setDirection((prev) => (prev === 'LR' ? 'TB' : 'LR'));
  };

  const handleExportPng = async () => {
    try {
      setIsExporting(true);
      const bg = isDark ? '#020617' : '#f8fafc';
      const { exportGraphToPng } = await import('./exportPng');
      await exportGraphToPng('api-topology-flow-container', `${spec.title || 'api-topology'}.png`, bg);
    } catch (err) {
      console.error('Failed to export graph to PNG', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSvg = async () => {
    try {
      setIsExporting(true);
      const { exportGraphSvg } = await import('./exportSvg');
      const container = document.getElementById('api-topology-flow-container');
      if (container) await exportGraphSvg(container as HTMLElement, `${spec.title || 'api-topology'}.svg`);
    } catch (err) {
      console.error('Failed to export graph to SVG', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="api-topology-flow-container"
      data-testid="graph"
      className="w-full h-full relative bg-slate-50 dark:bg-slate-950 transition-colors duration-150"
    >
      {/* Floating Toolbar */}
      <div
        data-export-ignore="true"
        className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        {/* Search in graph */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
          <input
            aria-label="Search graph nodes"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery(''); }}
            placeholder="Find in graph..."
            className="pl-8 pr-7 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-1 focus-visible:ring-blue-500"
              title="Clear graph search (Esc)"
              aria-label="Clear graph search"
            >
              <Search className="w-3 h-3 rotate-45 opacity-0" />
              <span className="absolute inset-0 flex items-center justify-center text-[10px]">✕</span>
            </button>
          )}
        </div>

        {/* Filter buttons - UX: aria-pressed + counts */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs" role="group" aria-label="Filter graph by node type">
          <button
            aria-pressed={filterType === 'all'}
            onClick={() => setFilterType('all')}
            className={`px-2 py-0.5 rounded transition ${filterType === 'all' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            All ({spec.endpoints.length + Object.keys(spec.schemas).length})
          </button>
          <button
            aria-pressed={filterType === 'endpoints'}
            onClick={() => setFilterType('endpoints')}
            className={`px-2 py-0.5 rounded transition ${filterType === 'endpoints' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Endpoints ({spec.endpoints.length})
          </button>
          <button
            aria-pressed={filterType === 'schemas'}
            onClick={() => setFilterType('schemas')}
            className={`px-2 py-0.5 rounded transition ${filterType === 'schemas' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Schemas ({Object.keys(spec.schemas).length})
          </button>
        </div>

        {/* Tag Filter Dropdown with counts */}
        {allTags.length > 1 && (
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            aria-label="Filter graph by tag"
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Tags ({spec.endpoints.length})</option>
            {allTags.map((t) => {
              const cnt = spec.endpoints.filter((e) => e.tags.includes(t)).length;
              return (
                <option key={t} value={t}>
                  {t} ({cnt})
                </option>
              );
            })}
          </select>
        )}

        {/* Edge Legend */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2 ml-1" aria-label="Edge legend">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 rounded"></span>consumes</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 rounded"></span>produces</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-400 border-t border-dashed border-slate-400"></span>references</span>
        </div>

        {/* Reset / Fit View */}
        <button
          aria-label="Fit view to all visible nodes"
          onClick={() => fitView({ padding: 0.2, duration: 400 })}
          title="Fit view to all visible nodes"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
        >
          <Maximize2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Fit View</span>
        </button>

        {/* Layout Switcher */}
        <button
          aria-label="Switch layout direction"
          aria-pressed={direction === 'TB'}
          onClick={toggleDirection}
          title={`Switch layout to ${direction === 'LR' ? 'Vertical (Top-to-Bottom)' : 'Horizontal (Left-to-Right)'}`}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{direction === 'LR' ? 'Horizontal Flow' : 'Vertical Flow'}</span>
        </button>

        {/* Export PNG and SVG - lazy loaded */}
        <button
          aria-label="Export topology diagram as PNG"
          onClick={handleExportPng}
          disabled={isExporting || nodes.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
          title="Export topology diagram as PNG"
        >
          <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{isExporting ? 'Exporting...' : 'PNG'}</span>
        </button>
        <button
          aria-label="Export topology diagram as SVG"
          onClick={handleExportSvg}
          disabled={isExporting || nodes.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
          title="Export topology diagram as SVG"
        >
          <FileImage className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>SVG</span>
        </button>
      </div>

      {initialNodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <Network className="w-12 h-12 mb-2 stroke-[1.5] text-slate-400" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Graph Nodes Available</p>
          <p className="text-xs text-slate-500 mt-0.5 text-center max-w-sm">Add endpoints or schemas to the spec editor to render the topology graph. Open the editor and load a sample spec from the header.</p>
          {searchQuery || filterType !== 'all' || selectedTag !== 'all' ? (
            <button
              onClick={() => { setSearchQuery(''); setFilterType('all'); setSelectedTag('all'); }}
              className="mt-3 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition font-medium"
            >
              Clear Graph Filters
            </button>
          ) : null}
        </div>
      )}
      {initialNodes.length > 0 && nodes.filter((n) => !n.hidden).length === 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-amber-50 dark:bg-amber-950/90 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs px-3 py-2 rounded-lg shadow">
          No nodes match current filters - <button onClick={() => { setSearchQuery(''); setFilterType('all'); setSelectedTag('all'); }} className="underline font-semibold">Clear filters</button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={isDark ? '#334155' : '#cbd5e1'}
        />
        <Controls className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !shadow-lg [&>button]:!bg-slate-100 dark:[&>button]:!bg-slate-800 [&>button]:!border-slate-200 dark:[&>button]:!border-slate-700 [&>button]:!fill-slate-700 dark:[&>button]:!fill-slate-300 hover:[&>button]:!bg-slate-200 dark:hover:[&>button]:!bg-slate-700" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'endpointNode') return '#3b82f6';
            return '#818cf8';
          }}
          maskColor={isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(241, 245, 249, 0.75)'}
          className="!bg-white dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-800 !rounded-xl overflow-hidden shadow-xl"
        />
      </ReactFlow>
    </div>
  );
};

export const TopologyGraph: React.FC<TopologyGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <TopologyCanvas {...props} />
    </ReactFlowProvider>
  );
};
