import React, { useState, useEffect, useRef, useMemo } from 'react';
import { parseApiSpec } from './parser';
import { ApiSpecModel, DiagnosticItem, EndpointModel, SchemaModel } from './model';
import { PETSTORE_SPEC } from './samples/petstore';
import { SampleSpecOption } from './samples';
import { decompressSpecFromHash } from './share/urlHash';
import { Header } from './ui/Header';
import { EditorPane, EditorPaneRef } from './ui/EditorPane';
import { EndpointExplorer } from './ui/EndpointExplorer';
import { EndpointDetails } from './ui/EndpointDetails';
import { SchemaViewer } from './ui/SchemaViewer';
import { TopologyGraph } from './graph/TopologyGraph';
import { DiagnosticsBar } from './ui/DiagnosticsBar';

export function App() {
  const [rawText, setRawText] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const decompressed = decompressSpecFromHash(window.location.hash);
      if (decompressed) return decompressed;
    }
    return PETSTORE_SPEC;
  });

  const [activeView, setActiveView] = useState<'endpoints' | 'schemas' | 'graph'>('endpoints');
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointModel | null>(null);
  const [selectedSchemaName, setSelectedSchemaName] = useState<string | undefined>(undefined);
  const [editorWidth, setEditorWidth] = useState(420); // default px width for left pane
  const isResizingRef = useRef(false);

  const editorPaneRef = useRef<EditorPaneRef>(null);

  // Parse OpenAPI spec from text with error boundary
  const spec: ApiSpecModel = useMemo(() => {
    try {
      return parseApiSpec(rawText);
    } catch (err) {
      console.error('parseApiSpec crashed', err);
      return parseApiSpec('openapi: 3.0.0\ninfo:\n  title: Parse Error\n  version: 0.0.0\npaths: {}');
    }
  }, [rawText]);

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
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Split-pane resizing logic with unmount cleanup
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(280, Math.min(moveEvent.clientX, window.innerWidth - 360));
      setEditorWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      isResizingRef.current = false;
    };
  }, []);

  const handleSelectSample = (sample: SampleSpecOption) => {
    setRawText(sample.spec);
    editorPaneRef.current?.setContent(sample.spec);
    setSelectedEndpoint(null);
    window.location.hash = '';
  };

  const handleUploadText = (text: string) => {
    setRawText(text);
    editorPaneRef.current?.setContent(text);
    setSelectedEndpoint(null);
  };

  const handleSelectDiagnostic = (diag: DiagnosticItem) => {
    setIsEditorOpen(true);
    const targetLine = diag.line ?? 1;
    setTimeout(() => {
      editorPaneRef.current?.jumpToLine(targetLine);
    }, 50);
  };

  const handleNavigateToSchema = (schemaName: string, _schema: SchemaModel) => {
    setSelectedSchemaName(schemaName);
    setActiveView('schemas');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-150">
      {/* Header Navigation */}
      <Header
        spec={spec}
        activeView={activeView}
        setActiveView={setActiveView}
        onSelectSample={handleSelectSample}
        onUploadText={handleUploadText}
        isEditorOpen={isEditorOpen}
        setIsEditorOpen={setIsEditorOpen}
      />

      {/* Main Split-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Code Editor Pane */}
        {isEditorOpen && (
          <div
            style={{ width: `${editorWidth}px` }}
            className="h-full flex flex-col border-r border-slate-200 dark:border-slate-800 shrink-0 relative bg-white dark:bg-slate-950 transition-colors duration-150"
          >
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
                format={spec.originalFormat === 'swagger2' ? 'yaml' : rawText.trim().startsWith('{') ? 'json' : 'yaml'}
              />
            </div>

            {/* Resizer Handle */}
            <div
              onMouseDown={handleMouseDownResize}
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition z-20"
              title="Drag to resize editor pane"
            />
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

          {/* View 3: API Topology Graph */}
          {activeView === 'graph' && (
            <div className="flex-1 h-full">
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
            </div>
          )}
        </div>
      </div>

      {/* Bottom Diagnostics Drawer */}
      <DiagnosticsBar
        diagnostics={spec.diagnostics}
        onSelectDiagnostic={handleSelectDiagnostic}
      />
    </div>
  );
}

export default App;
