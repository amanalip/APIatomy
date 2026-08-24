import { useState, useEffect, useRef } from 'react';
import { parseApiSpec } from '../parser';
import { ApiSpecModel } from '../model';
import { getFileMap } from '../parser/fileMap';

function parseSync(rawText: string): ApiSpecModel {
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
      diagnostics: [
        {
          id: 'parse-crash',
          severity: 'error',
          message: `Critical parser crash: ${msg}`,
          line: 1,
          source: 'syntax',
        },
      ],
      rawText,
    } as ApiSpecModel;
  }
}

export function useSpecState(initialText: string) {
  const [rawText, setRawText] = useState(initialText);
  const [spec, setSpec] = useState<ApiSpecModel>(() => parseSync(initialText));
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL('../workers/parserWorker.ts', import.meta.url), {
        type: 'module',
      });
      const worker = workerRef.current;
      worker.onmessage = (
        e: MessageEvent<{ id: number; result?: ApiSpecModel; error?: string }>
      ) => {
        const { id, result, error } = e.data;
        if (id !== requestIdRef.current) return;
        if (result) {
          setSpec(result);
        } else if (error) {
          setSpec(parseSync(rawText));
        }
      };
      worker.onerror = () => {
        setSpec(parseSync(rawText));
      };
    } catch {
      workerRef.current = null;
      setSpec(parseSync(rawText));
    }
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) {
      setSpec(parseSync(rawText));
      return;
    }
    const id = ++requestIdRef.current;
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      try {
        const files: Record<string, string> = {};
        try {
          for (const [k, v] of getFileMap().entries()) files[k] = v;
        } catch {
          // ignore
        }
        workerRef.current?.postMessage({ id, rawText, files });
      } catch {
        setSpec(parseSync(rawText));
      }
    }, 120) as unknown as number;
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [rawText]);

  return { rawText, setRawText, spec };
}
