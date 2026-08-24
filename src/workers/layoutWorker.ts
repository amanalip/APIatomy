import { computeApiTopologyGraph } from '../layout/graphLayout';

self.onmessage = (e: MessageEvent<{ spec: unknown; direction: string }>) => {
  try {
    const { spec, direction } = e.data as unknown as {
      spec: Parameters<typeof computeApiTopologyGraph>[0];
      direction: 'LR' | 'TB';
    };
    const result = computeApiTopologyGraph(spec as never, {
      direction,
      nodeWidth: 280,
      nodeHeight: 90,
    });
    (self as unknown as Worker).postMessage(result);
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: String(err) });
  }
};
