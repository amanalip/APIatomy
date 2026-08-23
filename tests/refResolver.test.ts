import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { resolveJsonPointer } from '../src/parser/refResolver';

const CIRCULAR_SPEC = `
openapi: 3.0.3
info:
  title: Circular Reference Spec
  version: 1.0.0
paths:
  /nodes:
    get:
      summary: Get linked tree nodes
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TreeNode'
components:
  schemas:
    TreeNode:
      type: object
      properties:
        id:
          type: string
        children:
          type: array
          items:
            $ref: '#/components/schemas/TreeNode'
        parent:
          $ref: '#/components/schemas/TreeNode'
`;

describe('Ref Resolver & Circular Detection', () => {
  it('resolves self-referencing and circular schemas without infinite loop', () => {
    const spec = parseApiSpec(CIRCULAR_SPEC);

    expect(spec.schemas['TreeNode']).toBeDefined();
    const treeNode = spec.schemas['TreeNode'];

    expect(treeNode.properties?.['children']?.items?.isCircular).toBe(true);
    expect(treeNode.properties?.['children']?.items?.refTarget).toBe('TreeNode');
    expect(treeNode.properties?.['parent']?.isCircular).toBe(true);
    expect(treeNode.properties?.['parent']?.refTarget).toBe('TreeNode');
  });

  it('correctly unescapes and URI-decodes JSON pointer tokens', () => {
    const doc = {
      paths: {
        '/users/{id}': {
          get: { summary: 'Get user' },
        },
      },
      components: {
        schemas: {
          'Order Model': { type: 'object' },
        },
      },
    };

    expect(resolveJsonPointer(doc, '#/paths/~1users~1%7Bid%7D/get/summary')).toBe('Get user');
    expect(resolveJsonPointer(doc, '#/components/schemas/Order%20Model/type')).toBe('object');
  });
});
