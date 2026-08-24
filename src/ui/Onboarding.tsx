import React, { useEffect, useState } from 'react';
import { Upload, Layers, Code2, Network, X, Shield } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

const STORAGE_KEY = 'apiatomy_onboarding_seen';

export const Onboarding: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const trapRef = useFocusTrap(visible);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur">
      <div
        ref={trapRef}
        className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-5 ring-1 ring-black/10"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Welcome to APIatomy
          </h2>
          <button
            onClick={dismiss}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close onboarding"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <li className="flex gap-2 items-center">
            <span className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </span>
            <span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Paste or upload
              </span>{' '}
              your OpenAPI YAML or JSON
            </span>
          </li>
          <li className="flex gap-2 items-center">
            <span className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Explore endpoints
              </span>{' '}
              by tag and method
            </span>
          </li>
          <li className="flex gap-2 items-center">
            <span className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <Code2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </span>
            <span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Inspect schemas
              </span>{' '}
              with mock data
            </span>
          </li>
          <li className="flex gap-2 items-center">
            <span className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <Network className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </span>
            <span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Visualize graph
              </span>{' '}
              of endpoint and schema links
            </span>
          </li>
        </ol>
        <div className="mt-4 flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Privacy: specs stay in your browser. Sharing creates a private link with the spec in the
            URL hash. No backend.
          </span>
        </div>
        <button
          onClick={dismiss}
          className="mt-4 w-full py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500"
        >
          Get started
        </button>
      </div>
    </div>
  );
};
