import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';
import { ApiSpecModel } from '../model';
import { HTTP_METHODS } from '../model/httpMethods';

export interface LayoutOptions {
  direction: 'LR' | 'TB';
  nodeWidth: number;
  nodeHeight: number;
}

export function computeApiTopologyGraph(
  spec: ApiSpecModel,
  options: LayoutOptions = { direction: 'LR', nodeWidth: 260, nodeHeight: 90 }
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
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

  // Track schema reuse frequency
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

  // Add Endpoint Nodes
  for (const ep of spec.endpoints) {
    const nodeId = `ep_${ep.id}`;
    dagreGraph.setNode(nodeId, { width: 280, height: 90 });

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
        dagreGraph.setEdge(nodeId, schemaNodeId);

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
        dagreGraph.setEdge(nodeId, schemaNodeId);

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

    dagreGraph.setNode(nodeId, { width: 240, height: 80 });

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

    // Edges between Schemas (nested refs)
    const nestedRefs = new Set<string>();
    collectChildSchemaNames(schemaObj, nestedRefs);

    for (const childRef of nestedRefs) {
      if (childRef === schemaName || !spec.schemas[childRef]) continue; // Guard against self loops and missing schemas
      const childNodeId = `schema_${childRef}`;
      const edgeId = `${nodeId}->${childNodeId}:ref`;

      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId);
        dagreGraph.setEdge(nodeId, childNodeId);

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

  // Run Dagre Layout
  dagre.layout(dagreGraph);

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

function collectChildSchemaNames(schema: any, refs: Set<string>): void {
  if (!schema || typeof schema !== 'object') return;

  if (schema.refTarget) {
    refs.add(schema.refTarget);
  }

  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      collectChildSchemaNames(prop, refs);
    }
  }

  if (schema.items) {
    collectChildSchemaNames(schema.items, refs);
  }

  if (schema.allOf) {
    for (const sub of schema.allOf) collectChildSchemaNames(sub, refs);
  }
  if (schema.oneOf) {
    for (const sub of schema.oneOf) collectChildSchemaNames(sub, refs);
  }
  if (schema.anyOf) {
    for (const sub of schema.anyOf) collectChildSchemaNames(sub, refs);
  }
}
