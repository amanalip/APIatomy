import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Download, Share2, Minimize2, AlertTriangle } from 'lucide-react';
import { copyTextToClipboard } from '../share/urlHash';
import { getShareUrl, getShareSize, downloadShareFile, canUseNativeShare, nativeShare } from '../share/shareService';

interface ShareDialogProps {
  specText: string;
  specTitle?: string;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ specText, specTitle, onClose }) => {
  const [compact, setCompact] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCompact, setCopiedCompact] = useState(false);
  const [nativeSupported] = useState(() => canUseNativeShare());
  const timerRef = useRef<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const url = getShareUrl(specText, compact);
  const size = getShareSize(specText, compact);
  const compactSize = getShareSize(specText, true);
  const isLarge = size.isLarge || size.urlLength > 8000;

  useEffect(() => {
    closeBtnRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async (useCompact: boolean) => {
    const targetUrl = getShareUrl(specText, useCompact);
    const success = await copyTextToClipboard(targetUrl);
    if (success) {
      if (useCompact) {
        setCopiedCompact(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopiedCompact(false), 2000) as unknown as number;
      } else {
        setCopied(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), 2000) as unknown as number;
      }
    }
  };

  const handleNativeShare = async () => {
    await nativeShare(specText, specTitle || 'APIatomy spec');
  };

  const handleDownload = () => {
    const ext = specText.trim().startsWith('{') ? 'json' : 'yaml';
    downloadShareFile(specText, `apiatomy-share.${ext}`);
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Share spec"
    >
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Share</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              Private link &middot; {size.kb} KB
            </span>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close share dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Shareable URL</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 truncate"
                aria-label="Shareable URL"
              />
              <button
                onClick={() => handleCopy(false)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              This link contains the full spec in the URL hash. It never leaves your browser except via the URL you share. The address bar is not updated.
            </p>
            {size.isWarn && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  This link is {size.kb} KB and may be too long for some browsers or chat apps. Consider Compact link or Share File below.
                </span>
              </div>
            )}
            {isLarge && (
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                This spec creates an unusually large URL. We recommend downloading a share file instead.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-950/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compact}
                onChange={(e) => setCompact(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Minimize2 className="w-3 h-3" />
                Compact Private Link &middot; {compactSize.kb} KB
              </span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Minifies and normalizes the spec before compression. Comments and original formatting will not be preserved. Useful when the normal link is large.
            </p>
            {compact && (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={getShareUrl(specText, true)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 truncate"
                />
                <button
                  onClick={() => handleCopy(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  {copiedCompact ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copiedCompact ? 'Copied' : 'Copy compact'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              <Download className="w-3.5 h-3.5" />
              Download Share File
            </button>
            {nativeSupported && (
              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                <Share2 className="w-3.5 h-3.5" />
                System share
              </button>
            )}
          </div>

          {isLarge && (
            <div className="text-xs text-slate-600 dark:text-slate-400 p-2 rounded bg-slate-100 dark:bg-slate-800">
              For very large specs, download the share file and send the file instead of the URL.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
