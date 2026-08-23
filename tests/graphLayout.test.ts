import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { computeApiTopologyGraph } from '../src/layout/graphLayout';

describe('Dagre Graph Layout Engine', () => {
  it('computes nodes and edges for horizontal LR layout', () => {
    const specYaml = `
openapi: 3.0.0
info:
  title: Graph API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Users list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      responses:
        '201':
          description: Created
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
`;

    const spec = parseApiSpec(specYaml);
    const layout = computeApiTopologyGraph(spec, { direction: 'LR', nodeWidth: 260, nodeHeight: 90 });

    expect(layout.nodes.length).toBe(3); // 2 endpoints + 1 schema
    expect(layout.edges.length).toBe(2); // 1 produces + 1 consumes

    const userSchemaNode = layout.nodes.find((n) => n.id === 'schema_User');
    expect(userSchemaNode).toBeDefined();
    expect(userSchemaNode?.type).toBe('schemaNode');
    expect((userSchemaNode?.data as any).reuseCount).toBe(2);

    const producesEdge = layout.edges.find((e) => (e.data as any).type === 'produces');
    const consumesEdge = layout.edges.find((e) => (e.data as any).type === 'consumes');

    expect(producesEdge).toBeDefined();
    expect(consumesEdge).toBeDefined();
  });

  it('computes vertical TB layout with orientation metadata', () => {
    const specYaml = `
openapi: 3.0.0
info:
  title: Vertical Graph API
  version: 1.0.0
paths:
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: OK
`;

    const spec = parseApiSpec(specYaml);
    const layout = computeApiTopologyGraph(spec, { direction: 'TB', nodeWidth: 260, nodeHeight: 90 });

    expect(layout.nodes.length).toBe(1);
    expect((layout.nodes[0].data as any).direction).toBe('TB');
  });

  it('handles empty specs without error', () => {
    const spec = parseApiSpec('');
    const layout = computeApiTopologyGraph(spec);
    expect(layout.nodes.length).toBe(0);
    expect(layout.edges.length).toBe(0);
  });
});
