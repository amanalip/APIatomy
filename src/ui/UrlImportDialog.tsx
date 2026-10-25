import { decodeProject } from '../share/project';
import { validateImportProject } from '../share/validateImport';
import { readImportResponse } from '../utils/readImportResponse';
import { createPortal } from 'react-dom';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Link2, Loader2, AlertTriangle } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface UrlImportDialogProps {
  onClose: () => void;
  onLoad: (text: string, url: string) => void | boolean | Promise<void | boolean>;
}

export const UrlImportDialog: React.FC<UrlImportDialogProps> = ({ onClose, onLoad }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap(true);

  const abortRef = useRef<AbortController | null>(null);
  const closedRef = useRef(false);
  const closeDialog = useCallback(() => {
    closedRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    onClose();
  }, [onClose]);
  useEffect(() => {
    closedRef.current = false;
    inputRef.current?.focus();
    return () => {
      closedRef.current = true;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeDialog]);

  const handleFetch = async () => {
    if (closedRef.current || abortRef.current) return;
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a URL');
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Unsupported URL');
    } catch {
      setError('Invalid URL');
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(trimmed, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Request failed ${res.status} ${res.statusText}`);
      }
      const text = await readImportResponse(res, controller.signal);
      if (closedRef.current || controller.signal.aborted || abortRef.current !== controller) return;
      if (!text.trim()) throw new Error('Empty response');
      validateImportProject(decodeProject(text));
      if (closedRef.current || controller.signal.aborted || abortRef.current !== controller) return;
      if ((await onLoad(text, trimmed)) !== false) closeDialog();
    } catch (err) {
      if (closedRef.current || abortRef.current !== controller) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (controller.signal.aborted) {
        setError('Request timed out or cancelled');
      } else if (msg.includes('Failed to fetch') || msg.includes('CORS')) {
        setError(
          'Fetch failed. The server may block cross origin requests. Use Upload for local files.'
        );
      } else {
        setError(msg);
      }
    } finally {
      window.clearTimeout(timeout);
      if (!closedRef.current && abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) closeDialog();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="Load from URL"
    >
      <div
        ref={trapRef}
        className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden ring-1 ring-black/10"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <span className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Open from URL
          </span>
          <button
            onClick={closeDialog}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Load a public OpenAPI spec by URL. The spec is fetched directly in your browser.
          </p>
          <input
            aria-label="Specification URL"
            ref={inputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFetch();
            }}
            placeholder="https://example.com/openapi.yaml"
            className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
          />
          {error && (
            <div className="flex gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                if (loading && abortRef.current) {
                  abortRef.current.abort();
                  abortRef.current = null;
                  setLoading(false);
                  setError('Request cancelled');
                } else {
                  closeDialog();
                }
              }}
              className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              {loading ? 'Cancel' : 'Close'}
            </button>
            <button
              onClick={handleFetch}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Link2 className="w-3.5 h-3.5" />
              )}
              Load
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
