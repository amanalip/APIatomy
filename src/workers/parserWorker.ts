import { parseApiSpec } from '../parser';

self.onmessage = (e: MessageEvent<{ id: number; rawText: string }>) => {
  const { id, rawText } = e.data;
  try {
    const result = parseApiSpec(rawText);
    (self as unknown as Worker).postMessage({ id, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
