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
import { exportGraphToPng } from './exportPng';
import { useTheme } from '../theme/ThemeContext';
import { Download, LayoutGrid, Search, Network } from 'lucide-react';

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

  // Synchronize when spec or layout direction changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [initialNodes, initialEdges, fitView]);

  // Apply filtering and search highlighting
  useEffect(() => {
    const hiddenNodeIds = new Set<string>();

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        let isVisible = true;
        let isMatch = true;

        if (filterType === 'endpoints' && n.type !== 'endpointNode') isVisible = false;
        if (filterType === 'schemas' && n.type !== 'schemaNode') isVisible = false;

        if (selectedTag !== 'all' && n.type === 'endpointNode') {
          const data = n.data as any;
          if (!data.tags || !data.tags.includes(selectedTag)) {
            isVisible = false;
          }
        }

        if (!isVisible) {
          hiddenNodeIds.add(n.id);
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (n.type === 'endpointNode') {
            const data = n.data as any;
            isMatch =
              data.path.toLowerCase().includes(q) ||
              data.method.toLowerCase().includes(q) ||
              data.summary.toLowerCase().includes(q);
          } else if (n.type === 'schemaNode') {
            const data = n.data as any;
            isMatch = data.schemaName.toLowerCase().includes(q);
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
        hidden: hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target),
      }))
    );
  }, [searchQuery, filterType, selectedTag, setNodes, setEdges]);

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
      await exportGraphToPng('api-topology-flow-container', `${spec.title || 'api-topology'}.png`, bg);
    } catch (err) {
      console.error('Failed to export graph to PNG', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="api-topology-flow-container"
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
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find in graph..."
            className="pl-8 pr-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2 py-0.5 rounded ${
              filterType === 'all'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All ({spec.endpoints.length + Object.keys(spec.schemas).length})
          </button>
          <button
            onClick={() => setFilterType('endpoints')}
            className={`px-2 py-0.5 rounded ${
              filterType === 'endpoints'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Endpoints ({spec.endpoints.length})
          </button>
          <button
            onClick={() => setFilterType('schemas')}
            className={`px-2 py-0.5 rounded ${
              filterType === 'schemas'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Schemas ({Object.keys(spec.schemas).length})
          </button>
        </div>

        {/* Tag Filter Dropdown */}
        {allTags.length > 1 && (
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        {/* Layout Switcher */}
        <button
          onClick={toggleDirection}
          title={`Switch layout to ${direction === 'LR' ? 'Vertical (Top-to-Bottom)' : 'Horizontal (Left-to-Right)'}`}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{direction === 'LR' ? 'Horizontal Flow' : 'Vertical Flow'}</span>
        </button>

        {/* Export PNG */}
        <button
          onClick={handleExportPng}
          disabled={isExporting || nodes.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
          title="Export topology diagram as PNG"
        >
          <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{isExporting ? 'Exporting...' : 'Export PNG'}</span>
        </button>
      </div>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-slate-400 dark:text-slate-500">
          <Network className="w-12 h-12 mb-2 stroke-[1.5] text-slate-400" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Graph Nodes Available</p>
          <p className="text-xs text-slate-500 mt-0.5">Add endpoints or schemas to the spec editor to render the topology graph.</p>
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
