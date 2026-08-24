import { getGraphLayout } from '../layout/graphLayout';

self.onmessage = (e: MessageEvent<{ nodes: unknown[]; edges: unknown[]; direction: string }>) => {
  try {
    const { nodes, edges, direction } = e.data as unknown as { nodes: Parameters<typeof getGraphLayout>[0]; edges: Parameters<typeof getGraphLayout>[1]; direction: 'LR' | 'TB' };
    const result = getGraphLayout(nodes as never, edges as never, direction);
    (self as unknown as Worker).postMessage(result);
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: String(err) });
  }
};
