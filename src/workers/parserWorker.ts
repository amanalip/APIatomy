import { parseApiSpec } from '../parser';
import { setFileMap } from '../parser/fileMap';

self.onmessage = (
  e: MessageEvent<{
    id: number;
    rawText: string;
    files?: Record<string, string>;
    rootFilename?: string;
  }>
) => {
  const { id, rawText, files, rootFilename } = e.data;
  try {
    if (files && Object.keys(files).length > 0) setFileMap(files, rootFilename);
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
