import React, { useState, useEffect, useRef } from 'react';
import { EndpointModel, SchemaModel } from './model';
import { PETSTORE_SPEC } from './samples/petstore';
import { SampleSpecOption } from './samples';
import { decompressSpecFromHash } from './share/urlHash';
import { decodeAppState } from './share/shareService';
import { useSpecState } from './hooks/useSpecState';
import { setFileMap } from './parser/fileMap';
import { useResizableEditor } from './hooks/useResizableEditor';
import { useDiagnosticNavigation } from './hooks/useDiagnosticNavigation';
import { Header } from './ui/Header';
import { EditorPane, EditorPaneRef } from './ui/EditorPane';
import { EndpointExplorer } from './ui/EndpointExplorer';
import { EndpointDetails } from './ui/EndpointDetails';
import { SchemaViewer } from './ui/SchemaViewer';
import { DiagnosticsBar } from './ui/DiagnosticsBar';
import { Onboarding } from './ui/Onboarding';
import { UrlImportDialog } from './ui/UrlImportDialog';
import { CommandPalette } from './ui/CommandPalette';
import { DiffView } from './ui/DiffView';
import { WorkspaceDialog } from './ui/WorkspaceDialog';
const TopologyGraph = React.lazy(() => import('./graph/TopologyGraph').then((m) => ({ default: m.TopologyGraph })) );

export function App() {
  const initialText = (() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const decompressed = decompressSpecFromHash(window.location.hash);
      if (decompressed) return decompressed;
    }
    return PETSTORE_SPEC;
  })();
  const { rawText, setRawText, spec } = useSpecState(initialText);

  const [activeView, setActiveView] = useState<'endpoints' | 'schemas' | 'graph' | 'diff'>('endpoints');
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointModel | null>(null);
  const [selectedSchemaName, setSelectedSchemaName] = useState<string | undefined>(undefined);
  const { editorWidth, setEditorWidth, handleMouseDownResize } = useResizableEditor(420);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [diffOldText, setDiffOldText] = useState<string | null>(null);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const editorPaneRef = useRef<EditorPaneRef>(null);

  // Keep selected endpoint in sync when spec changes
  useEffect(() => {
    if (selectedEndpoint) {
      const refreshed = spec.endpoints.find((e) => e.id === selectedEndpoint.id);
      setSelectedEndpoint(refreshed || null);
    }
  }, [spec]);

  // Keep latest rawText in ref to avoid stale closure on hashchange
  const rawTextRef = useRef(rawText);
  useEffect(() => { rawTextRef.current = rawText; }, [rawText]);

  // Listen to hash changes in browser
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        const decompressed = decompressSpecFromHash(window.location.hash);
        if (decompressed && decompressed !== rawTextRef.current) {
          setRawText(decompressed);
          editorPaneRef.current?.setContent(decompressed);
        }
      } else {
        // Hash cleared: stay on current editor content (no stale spec)
        // Do not reset to PETSTORE_SPEC to avoid losing user edits
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);



  const handleSelectSample = (sample: SampleSpecOption) => {
    setRawText(sample.spec);
    editorPaneRef.current?.setContent(sample.spec);
    setSelectedEndpoint(null);
    setSourceUrl(null);
    setFileMap({});
    window.location.hash = '';
  };

  const handleUploadText = (text: string) => {
    setRawText(text);
    editorPaneRef.current?.setContent(text);
    setSelectedEndpoint(null);
    setSourceUrl(null);
    if (typeof window !== 'undefined' && window.location.hash) {
      window.location.hash = '';
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch {
        window.location.hash = '';
      }
    }
  };

  const handleLoadFromUrl = (text: string, url: string) => {
    setRawText(text);
    editorPaneRef.current?.setContent(text);
    setSelectedEndpoint(null);
    setSourceUrl(url);
    setFileMap({});
    if (typeof window !== 'undefined' && window.location.hash) {
      window.location.hash = '';
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch {
        window.location.hash = '';
      }
    }
  };

  const { handleSelectDiagnostic } = useDiagnosticNavigation(editorPaneRef, setIsEditorOpen);

  const handleNavigateToSchema = (schemaName: string, _schema: SchemaModel) => {
    setSelectedSchemaName(schemaName);
    setActiveView('schemas');
  };

  const hasRestoredStateRef = useRef(false);
  useEffect(() => {
    if (hasRestoredStateRef.current) return;
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const state = decodeAppState(hash);
      if (state) {
        if (typeof state.view === 'string' && ['endpoints', 'schemas', 'graph', 'diff'].includes(state.view as string)) {
          setActiveView(state.view as 'endpoints' | 'schemas' | 'graph' | 'diff');
        }
        if (typeof state.endpointId === 'string') {
          const ep = spec.endpoints.find((e) => e.id === state.endpointId);
          if (ep) setSelectedEndpoint(ep);
        }
        if (typeof state.schemaName === 'string' && spec.schemas[state.schemaName as string]) {
          setSelectedSchemaName(state.schemaName as string);
        }
        hasRestoredStateRef.current = true;
      }
    } catch {
      // ignore
    }
  }, [spec.endpoints, spec.schemas]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.classList.contains('cm-content'));
      if (!isInput && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (activeView === 'diff' && diffOldText === null) {
      setDiffOldText(PETSTORE_SPEC);
    }
  }, [activeView, diffOldText]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-150">
      <Onboarding />
      {/* Header Navigation */}
      <Header
        spec={spec}
        activeView={activeView}
        setActiveView={setActiveView}
        onSelectSample={handleSelectSample}
        onUploadText={handleUploadText}
        onOpenUrl={() => setIsUrlDialogOpen(true)}
        onOpenWorkspace={() => setIsWorkspaceOpen(true)}
        isEditorOpen={isEditorOpen}
        setIsEditorOpen={setIsEditorOpen}
        sourceUrl={sourceUrl}
        appState={{ view: activeView, endpointId: selectedEndpoint?.id, schemaName: selectedSchemaName }}
      />

      {/* Main Split-Pane Workspace */}
      <div id="main-content" className="flex-1 flex overflow-hidden relative">
        {/* Mobile backdrop */}
        {isEditorOpen && (
          <div className="fixed inset-0 z-10 bg-slate-900/30 backdrop-blur-sm lg:hidden" onClick={() => setIsEditorOpen(false)} aria-hidden="true" />
        )}
        {/* Left: Code Editor Pane - full screen drawer on mobile, side pane on large */}
        {isEditorOpen && (
          <div
            style={typeof window !== 'undefined' && window.innerWidth >= 1024 ? { width: `${editorWidth}px` } : undefined}
            className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 lg:static lg:inset-auto lg:z-auto lg:h-full lg:shrink-0 lg:relative transition-colors duration-150 w-full lg:w-auto"
          >
            <button
              onClick={() => setIsEditorOpen(false)}
              className="lg:hidden absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow"
              aria-label="Close editor"
            >
              <span className="text-xs px-1">Close</span>
            </button>
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-mono text-[11px] font-medium">
                Spec Editor ({spec.originalFormat === 'swagger2' ? 'Swagger 2.0' : 'OpenAPI 3.x'})
              </span>
              <span className="text-[10px] text-slate-500">Live Parser</span>
            </div>

            <div className="flex-1 overflow-hidden">
              <EditorPane
                ref={editorPaneRef}
                value={rawText}
                onChange={(newText) => setRawText(newText)}
                format={(() => {
                  // Strip BOM(s) before detection (handles concatenated files)
                  const t = rawText.replace(/^\uFEFF+/, '').trim();
                  const isJson = t.startsWith('{') || t.startsWith('[');
                  if (isJson) return 'json';
                  return 'yaml';
                })()}
              />
            </div>

            {/* Resizer Handle - hidden on mobile, visible on large */}
            <div
              onMouseDown={handleMouseDownResize}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize editor pane"
              tabIndex={0}
              aria-valuemin={280}
              aria-valuemax={Math.max(280, typeof window !== 'undefined' ? window.innerWidth - 360 : 800)}
              aria-valuenow={editorWidth}
              aria-valuetext={`${editorWidth}px editor width`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setEditorWidth((w) => Math.max(280, w - 20));
                else if (e.key === 'ArrowRight') setEditorWidth((w) => Math.min(Math.max(280, window.innerWidth - 360), w + 20));
                else if (e.key === 'Home') setEditorWidth(280);
                else if (e.key === 'End') setEditorWidth(Math.max(280, window.innerWidth - 360));
                else if (e.key === 'Enter') setEditorWidth(420);
              }}
              className="hidden lg:flex absolute top-0 right-0 w-2.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition z-20 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none items-center justify-center group"
              title="Drag to resize editor pane (or use Arrow keys when focused, Home/End for min/max, Enter to reset)"
            >
              <span className="w-0.5 h-6 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-500 transition" />
            </div>
          </div>
        )}

        {/* Right: Visual Explorer Workspace */}
        <div className="flex-1 flex overflow-hidden relative bg-slate-50 dark:bg-slate-950 transition-colors duration-150">
          {/* View 1: Endpoints Explorer */}
          {activeView === 'endpoints' && (
            <div className="flex-1 flex h-full overflow-hidden">
              <div className={`${selectedEndpoint ? 'hidden lg:block lg:w-1/2' : 'w-full'} h-full transition-all duration-150`}>
                <EndpointExplorer
                  endpoints={spec.endpoints}
                  selectedEndpoint={selectedEndpoint}
                  onSelectEndpoint={(ep) => setSelectedEndpoint(ep)}
                />
              </div>

              {selectedEndpoint && (
                <div className="w-full lg:w-1/2 h-full">
                  <EndpointDetails
                    endpoint={selectedEndpoint}
                    servers={spec.servers}
                    schemas={spec.schemas}
                    securitySchemes={spec.securitySchemes}
                    onClose={() => setSelectedEndpoint(null)}
                    onSelectSchema={handleNavigateToSchema}
                  />
                </div>
              )}
            </div>
          )}

          {/* View 2: Schema Viewer */}
          {activeView === 'schemas' && (
            <div className="flex-1 h-full">
              <SchemaViewer
                schemas={spec.schemas}
                selectedSchemaName={selectedSchemaName}
                onSelectSchema={(name) => setSelectedSchemaName(name)}
              />
            </div>
          )}

          {/* View 3: API Topology Graph - lazy loaded */}
          {activeView === 'graph' && (
            <div className="flex-1 h-full">
              <React.Suspense fallback={<div className="p-4 text-xs text-slate-500">Loading graph...</div>}>
                <TopologyGraph
                  spec={spec}
                  onSelectEndpoint={(ep) => {
                    setSelectedEndpoint(ep);
                    setActiveView('endpoints');
                  }}
                  onSelectSchema={(schemaName, schema) => {
                    handleNavigateToSchema(schemaName, schema);
                  }}
                />
              </React.Suspense>
            </div>
          )}

          {/* View 4: Diff */}
          {activeView === 'diff' && (
            <div className="flex-1 h-full overflow-auto bg-white dark:bg-slate-950">
              <DiffView oldText={diffOldText ?? PETSTORE_SPEC} newText={rawText} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Diagnostics Drawer */}
      <DiagnosticsBar
        diagnostics={spec.diagnostics}
        onSelectDiagnostic={handleSelectDiagnostic}
      />
      {isUrlDialogOpen && (
        <UrlImportDialog
          onClose={() => setIsUrlDialogOpen(false)}
          onLoad={(text, url) => handleLoadFromUrl(text, url)}
        />
      )}
      {isWorkspaceOpen && (
        <WorkspaceDialog
          currentText={rawText}
          currentTitle={spec.title}
          onClose={() => setIsWorkspaceOpen(false)}
          onLoad={(text) => {
            setRawText(text);
            editorPaneRef.current?.setContent(text);
            setIsWorkspaceOpen(false);
          }}
        />
      )}
      {isPaletteOpen && (
        <CommandPalette
          onClose={() => setIsPaletteOpen(false)}
          onSelectSample={() => setIsPaletteOpen(false)}
          onUpload={() => {
            setIsPaletteOpen(false);
            setIsEditorOpen(true);
          }}
          onShare={() => {
            setIsPaletteOpen(false);
          }}
          onViewChange={(view) => {
            if (view === 'diff' && !diffOldText) setDiffOldText(rawText);
            setActiveView(view as 'endpoints' | 'schemas' | 'graph' | 'diff');
          }}
        />
      )}
    </div>
  );
}

export default App;
