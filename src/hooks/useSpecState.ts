import { useState, useEffect, useRef, useMemo } from 'react';
import { parseApiSpec } from '../parser';
import { ApiSpecModel } from '../model';

export function useSpecState(initialText: string) {
  const [rawText, setRawText] = useState(initialText);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL('../workers/parserWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      workerRef.current = null;
    }
    return () => workerRef.current?.terminate();
  }, []);

  const spec: ApiSpecModel = useMemo(() => {
    if (workerRef.current) {
      // fallback to sync for now, worker is async so we still need sync value
      // worker result will be handled via effect if needed
    }
    try {
      return parseApiSpec(rawText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        title: 'Parse Error',
        version: '0.0.0',
        openApiVersion: '3.0.0',
        originalFormat: 'openapi3',
        servers: [],
        tags: [],
        endpoints: [],
        schemas: {},
        securitySchemes: {},
        diagnostics: [{ id: 'parse-crash', severity: 'error', message: `Critical parser crash: ${msg}`, line: 1, source: 'syntax' }],
        rawText,
      } as ApiSpecModel;
    }
  }, [rawText]);

  return { rawText, setRawText, spec };
}
