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
import { Download, LayoutGrid, Search } from 'lucide-react';

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
  const { fitView } = useReactFlow();
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'endpoints' | 'schemas'>('all');

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
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        let isVisible = true;
        let isMatch = true;

        if (filterType === 'endpoints' && n.type !== 'endpointNode') isVisible = false;
        if (filterType === 'schemas' && n.type !== 'schemaNode') isVisible = false;

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
  }, [searchQuery, filterType, setNodes]);

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

  const handleExportPng = async () => {
    setIsExporting(true);
    await exportGraphToPng('api-topology-canvas', `${spec.title.toLowerCase().replace(/\s+/g, '-')}-topology.png`);
    setIsExporting(false);
  };

  const toggleDirection = () => {
    setDirection((prev) => (prev === 'LR' ? 'TB' : 'LR'));
  };

  return (
    <div id="api-topology-canvas" className="w-full h-full relative bg-slate-950">
      {/* Top Toolbar overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-lg">
        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes in graph..."
            className="pl-8 pr-3 py-1 bg-slate-800/80 border border-slate-700 text-xs text-slate-100 rounded-lg placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-800/60 p-0.5 rounded-lg border border-slate-700/60 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2 py-0.5 rounded ${
              filterType === 'all'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({spec.endpoints.length + Object.keys(spec.schemas).length})
          </button>
          <button
            onClick={() => setFilterType('endpoints')}
            className={`px-2 py-0.5 rounded ${
              filterType === 'endpoints'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Endpoints ({spec.endpoints.length})
          </button>
          <button
            onClick={() => setFilterType('schemas')}
            className={`px-2 py-0.5 rounded ${
              filterType === 'schemas'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Schemas ({Object.keys(spec.schemas).length})
          </button>
        </div>

        {/* Layout Switcher */}
        <button
          onClick={toggleDirection}
          title={`Switch layout to ${direction === 'LR' ? 'Vertical (Top-to-Bottom)' : 'Horizontal (Left-to-Right)'}`}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
          <span>{direction === 'LR' ? 'Horizontal Flow' : 'Vertical Flow'}</span>
        </button>

        {/* Export PNG */}
        <button
          onClick={handleExportPng}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-50"
          title="Export topology diagram as PNG"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>{isExporting ? 'Exporting...' : 'Export PNG'}</span>
        </button>
      </div>

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
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls className="!bg-slate-900 !border-slate-800 !shadow-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!fill-slate-300 hover:[&>button]:!bg-slate-700" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'endpointNode') return '#3b82f6';
            return '#818cf8';
          }}
          maskColor="rgba(15, 23, 42, 0.75)"
          className="!bg-slate-900 !border !border-slate-800 !rounded-xl overflow-hidden shadow-xl"
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
