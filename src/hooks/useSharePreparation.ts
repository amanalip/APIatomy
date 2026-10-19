import { useEffect, useState } from 'react';
import { SpecProject } from '../share/project';
import { PreparedShare, prepareShare } from '../share/sharePreparation';

export function useSharePreparation(project: SpecProject) {
  const [prepared, setPrepared] = useState<{
    project: SpecProject;
    result?: PreparedShare;
    error?: string;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    let worker: Worker | undefined;
    let timeout: number | undefined;
    const finish = (result?: PreparedShare, error?: string) => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timeout);
      worker?.terminate();
      setPrepared({ project, result, error });
    };
    const fallback = () => {
      if (cancelled) return;
      try {
        finish(prepareShare(project));
      } catch (err) {
        finish(undefined, err instanceof Error ? err.message : 'Unable to prepare share link');
      }
    };
    // Estimate size without serializing, parsing, or compressing the project on the main thread.
    const length =
      project.specText.length +
      Object.values(project.files).reduce((sum, text) => sum + text.length, 0);
    if (length < 80000) fallback();
    else {
      try {
        worker = new Worker(new URL('../workers/compressWorker.ts', import.meta.url), {
          type: 'module',
        });
        worker.onmessage = (event: MessageEvent<{ result?: PreparedShare; error?: string }>) => {
          if (event.data.result) finish(event.data.result);
          else fallback();
        };
        worker.onerror = fallback;
        timeout = window.setTimeout(fallback, 15000);
        worker.postMessage({ project });
      } catch {
        fallback();
      }
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      worker?.terminate();
    };
  }, [project]);
  const current = prepared?.project === project ? prepared : null;
  return { result: current?.result, error: current?.error, isPreparing: !current };
}
