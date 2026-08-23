import React, { useState, useRef, useEffect } from 'react';
import { ApiSpecModel } from '../model';
import { SAMPLE_SPECS, SampleSpecOption } from '../samples';
import { compressSpecToHash, copyTextToClipboard } from '../share/urlHash';
import { useTheme } from '../theme/ThemeContext';
import {
  Share2,
  Upload,
  Sun,
  Moon,
  Check,
  Code2,
  FileJson,
  Layers,
  Network,
  ChevronDown,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  spec: ApiSpecModel;
  activeView: 'endpoints' | 'schemas' | 'graph';
  setActiveView: (view: 'endpoints' | 'schemas' | 'graph') => void;
  onSelectSample: (sample: SampleSpecOption) => void;
  onUploadText: (text: string) => void;
  isEditorOpen: boolean;
  setIsEditorOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  spec,
  activeView,
  setActiveView,
  onSelectSample,
  onUploadText,
  isEditorOpen,
  setIsEditorOpen,
}) => {
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isSampleDropdownOpen, setIsSampleDropdownOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isEditorOpenRef = useRef(isEditorOpen);
  useEffect(() => { isEditorOpenRef.current = isEditorOpen; }, [isEditorOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSampleDropdownOpen(false);
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target as Node)) {
        setIsMobileNavOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSampleDropdownOpen(false);
        setIsMobileNavOpen(false);
      }
      if (event.altKey && (event.key === 'e' || event.key === 'E')) {
        event.preventDefault();
        setIsEditorOpen(!isEditorOpenRef.current);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setIsEditorOpen]);

  const handleShare = async () => {
    const hash = compressSpecToHash(spec.rawText);
    const fullUrl = `${window.location.origin}${window.location.pathname}${hash}`;
    // Use replaceState to avoid polluting browser history (back button)
    try {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
    } catch {
      window.location.hash = hash;
    }

    const success = await copyTextToClipboard(fullUrl);
    if (success) {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const handleCopyJson = async () => {
    const jsonStr = JSON.stringify(spec, null, 2);
    const success = await copyTextToClipboard(jsonStr);
    if (success) {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) onUploadText(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between text-slate-800 dark:text-slate-100 shrink-0 z-30 select-none transition-colors duration-150">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-3 py-1 rounded text-xs z-50">
        Skip to content
      </a>
      {/* Brand & Spec Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">APIatomy</span>
              {spec.version && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                  v{spec.version}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[160px] sm:max-w-[200px]" title={spec.title || 'Untitled API'}>
              {spec.title || 'Untitled API'}
            </div>
          </div>
        </div>

        {/* Desktop View Switcher Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 ml-4">
          {([
            { id: 'endpoints' as const, label: `Endpoints (${spec.endpoints.length})`, Icon: Layers },
            { id: 'schemas' as const, label: `Schemas (${Object.keys(spec.schemas).length})`, Icon: Code2 },
            { id: 'graph' as const, label: 'Topology Graph', Icon: Network },
          ]).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition ${
                activeView === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Mobile View Dropdown Button */}
        <div className="relative md:hidden ml-1" ref={mobileNavRef}>
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <Menu className="w-3.5 h-3.5 text-slate-500" />
            <span className="capitalize">{activeView}</span>
          </button>

          {isMobileNavOpen && (
            <div className="absolute left-0 mt-2 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 space-y-1 z-50">
              {([
                { id: 'endpoints' as const, label: `Endpoints (${spec.endpoints.length})`, Icon: Layers },
                { id: 'schemas' as const, label: `Schemas (${Object.keys(spec.schemas).length})`, Icon: Code2 },
                { id: 'graph' as const, label: 'Topology Graph', Icon: Network },
              ]).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveView(id);
                    setIsMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left ${
                    activeView === id ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Toggle Editor */}
        <button
          onClick={() => setIsEditorOpen(!isEditorOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition ${
            isEditorOpen
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/60 font-semibold'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
          title="Toggle OpenAPI YAML / JSON Code Editor (Alt+E)"
        >
          <Code2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span className="hidden sm:inline">Editor</span>
        </button>

        {/* Sample Spec Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsSampleDropdownOpen(!isSampleDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition"
          >
            <span>Samples</span>
            <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
          </button>

          {isSampleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 space-y-1 z-50">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Preset Specifications
              </div>
              {SAMPLE_SPECS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    onSelectSample(sample);
                    setIsSampleDropdownOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition flex flex-col gap-0.5"
                >
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{sample.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {sample.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upload Spec */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition"
          title="Upload OpenAPI or Swagger file (.yaml, .yml, .json)"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Upload</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Copy Normalized JSON */}
        <button
          onClick={handleCopyJson}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition"
          title="Copy normalized AST JSON to clipboard"
        >
          {copiedJson ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <FileJson className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          )}
          <span className="hidden md:inline">{copiedJson ? 'Copied' : 'JSON'}</span>
        </button>

        {/* Share Link */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition"
          title="Create shareable compressed link (encoded in URL hash with zero backend)"
        >
          {copiedShare ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span className="hidden xs:inline">Link Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span className="hidden xs:inline">Share</span>
            </>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 transition focus-visible:ring-2 focus-visible:ring-blue-500"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* GitHub Link */}
        <a
          href="https://github.com/amanalip/APIatomy"
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 transition hidden sm:flex items-center justify-center"
          title="View on GitHub"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </a>
      </div>
    </header>
  );
};
