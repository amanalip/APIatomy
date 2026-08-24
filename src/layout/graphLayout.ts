import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';
import { ApiSpecModel } from '../model';
import { HTTP_METHODS } from '../model/httpMethods';
import { collectSchemaRefs } from '../utils/schemaRefs';

export interface LayoutOptions {
  direction: 'LR' | 'TB';
  nodeWidth: number;
  nodeHeight: number;
}

export function computeApiTopologyGraph(
  spec: ApiSpecModel,
  options: LayoutOptions = { direction: 'LR', nodeWidth: 260, nodeHeight: 90 }
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true, compound: false });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: options.direction,
    align: 'UL',
    nodesep: 60,
    ranksep: 100,
  });

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  // Track schema reuse frequency (endpoint refs + nested schema refs)
  const schemaReuseCount: Record<string, number> = {};
  for (const ep of spec.endpoints) {
    for (const ref of ep.consumedSchemaRefs) {
      if (spec.schemas[ref]) {
        schemaReuseCount[ref] = (schemaReuseCount[ref] || 0) + 1;
      }
    }
    for (const ref of ep.producedSchemaRefs) {
      if (spec.schemas[ref]) {
        schemaReuseCount[ref] = (schemaReuseCount[ref] || 0) + 1;
      }
    }
  }
  // Include indirect references via schema composition (unified util)
  for (const [ownerName, schema] of Object.entries(spec.schemas)) {
    const nested = new Set<string>();
    collectSchemaRefs(schema, nested);
    for (const ref of nested) {
      if (ref === ownerName) continue;
      if (spec.schemas[ref]) {
        schemaReuseCount[ref] = (schemaReuseCount[ref] || 0) + 1;
      }
    }
  }

  // Add Endpoint Nodes - respect LayoutOptions dimensions
  const endpointWidth = options.nodeWidth;
  const endpointHeight = options.nodeHeight;
  const schemaWidth = Math.max(180, options.nodeWidth - 40);
  const schemaHeight = Math.max(60, options.nodeHeight - 10);

  for (const ep of spec.endpoints) {
    const nodeId = `ep_${ep.id}`;
    dagreGraph.setNode(nodeId, { width: endpointWidth, height: endpointHeight });

    nodes.push({
      id: nodeId,
      type: 'endpointNode',
      position: { x: 0, y: 0 },
      data: {
        endpoint: ep,
        method: ep.method,
        path: ep.path,
        summary: ep.summary || ep.description || `${ep.method.toUpperCase()} ${ep.path}`,
        tags: ep.tags,
        direction: options.direction,
      },
    });

    // Edges from Endpoint to Consumed Schemas (Request)
    for (const schemaName of ep.consumedSchemaRefs) {
      if (!spec.schemas[schemaName]) continue; // Guard against broken/missing schema references
      const schemaNodeId = `schema_${schemaName}`;
      const edgeId = `${nodeId}->${schemaNodeId}:consumes`;

      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId);
        dagreGraph.setEdge(nodeId, schemaNodeId, {}, edgeId);

        edges.push({
          id: edgeId,
          source: nodeId,
          target: schemaNodeId,
          type: 'customEdge',
          animated: true,
          style: { stroke: HTTP_METHODS[ep.method]?.accent || '#3b82f6', strokeWidth: 1.5 },
          data: {
            label: 'consumes',
            type: 'consumes',
            method: ep.method,
          },
        });
      }
    }

    // Edges from Endpoint to Produced Schemas (Response)
    for (const schemaName of ep.producedSchemaRefs) {
      if (!spec.schemas[schemaName]) continue; // Guard against broken/missing schema references
      const schemaNodeId = `schema_${schemaName}`;
      const edgeId = `${nodeId}->${schemaNodeId}:produces`;

      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId);
        dagreGraph.setEdge(nodeId, schemaNodeId, {}, edgeId);

        edges.push({
          id: edgeId,
          source: nodeId,
          target: schemaNodeId,
          type: 'customEdge',
          style: { stroke: '#10b981', strokeWidth: 1.5 },
          data: {
            label: 'produces',
            type: 'produces',
            method: ep.method,
          },
        });
      }
    }
  }

  // Add Schema Nodes
  for (const [schemaName, schemaObj] of Object.entries(spec.schemas)) {
    const nodeId = `schema_${schemaName}`;
    const reuse = schemaReuseCount[schemaName] || 0;
    const propCount = schemaObj.properties ? Object.keys(schemaObj.properties).length : 0;

    dagreGraph.setNode(nodeId, { width: schemaWidth, height: schemaHeight });

    nodes.push({
      id: nodeId,
      type: 'schemaNode',
      position: { x: 0, y: 0 },
      data: {
        schemaName,
        schema: schemaObj,
        propertyCount: propCount,
        reuseCount: reuse,
        isCircular: schemaObj.isCircular,
        direction: options.direction,
      },
    });

    // Edges between Schemas (nested refs) via unified util
    const nestedRefs = new Set<string>();
    collectSchemaRefs(schemaObj, nestedRefs);

    for (const childRef of nestedRefs) {
      if (childRef === schemaName || !spec.schemas[childRef]) continue; // Guard against self loops and missing schemas
      const childNodeId = `schema_${childRef}`;
      const edgeId = `${nodeId}->${childNodeId}:ref`;

      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId);
        dagreGraph.setEdge(nodeId, childNodeId, {}, edgeId);

        edges.push({
          id: edgeId,
          source: nodeId,
          target: childNodeId,
          type: 'customEdge',
          style: { stroke: '#94a3b8', strokeDasharray: '4 4', strokeWidth: 1.5 },
          data: {
            label: 'references',
            type: 'references',
          },
        });
      }
    }
  }

  // Run Dagre Layout (guard circular)
  try {
    dagre.layout(dagreGraph);
  } catch (e) {
    console.warn('Dagre layout failed, falling back to unpositioned nodes', e);
  }

  // Apply positions back to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPos = dagreGraph.node(node.id);
    const width = nodeWithPos?.width || 240;
    const height = nodeWithPos?.height || 80;

    return {
      ...node,
      position: {
        x: (nodeWithPos?.x || 0) - width / 2,
        y: (nodeWithPos?.y || 0) - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
