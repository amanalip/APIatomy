import { parseApiSpec } from '../parser';
import { setFileMap } from '../parser/fileMap';

self.onmessage = (
  e: MessageEvent<{ id: number; rawText: string; files?: Record<string, string> }>
) => {
  const { id, rawText, files } = e.data;
  try {
    if (files && Object.keys(files).length > 0) setFileMap(files);
    else setFileMap({});
    const result = parseApiSpec(rawText);
    (self as unknown as Worker).postMessage({ id, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
