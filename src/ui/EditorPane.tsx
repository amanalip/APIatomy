import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { EditorState, Compartment, Transaction } from '@codemirror/state';
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { yaml } from '@codemirror/lang-yaml';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '../theme/ThemeContext';
import { Upload } from 'lucide-react';
import { MAX_UPLOAD_SIZE } from '../utils/schemaRefs';

export interface EditorPaneRef {
  jumpToLine: (line: number) => void;
  setContent: (text: string) => void;
}

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  format?: 'yaml' | 'json';
}

export const EditorPane = forwardRef<EditorPaneRef, EditorPaneProps>(
  ({ value, onChange, format = 'yaml' }, ref) => {
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const themeCompartmentRef = useRef<Compartment>(new Compartment());
    const languageCompartmentRef = useRef<Compartment>(new Compartment());
    const [isDragging, setIsDragging] = useState(false);
    const debounceTimerRef = useRef<number | null>(null);
    const onChangeRef = useRef(onChange);
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Expose jumpToLine and setContent methods via ref
    useImperativeHandle(ref, () => ({
      jumpToLine: (line: number) => {
        if (!editorViewRef.current) return;
        const view = editorViewRef.current;
        const lineCount = view.state.doc.lines;
        const targetLine = Math.max(1, Math.min(line, lineCount));
        const lineInfo = view.state.doc.line(targetLine);

        view.dispatch({
          selection: { anchor: lineInfo.from },
          scrollIntoView: true,
          effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
        });
        view.focus();
      },
      setContent: (text: string) => {
        if (!editorViewRef.current) return;
        const view = editorViewRef.current;
        if (view.state.doc.toString() !== text) {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: text },
            annotations: [Transaction.userEvent.of('apiatomy-sync')],
          });
        }
      },
    }));

    // Initialize CodeMirror 6 Editor (language via compartment to avoid teardown on format switch)
    useEffect(() => {
      if (!containerRef.current) return;

      const langExtension = format === 'json' ? json() : yaml();
      const editorTheme = theme === 'dark' ? oneDark : [];

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          // Suppress echo when change originated from external sync (annotation)
          const isExternal = update.transactions.some(
            (tr) => tr.annotation(Transaction.userEvent) === 'apiatomy-sync'
          );
          if (isExternal) return;
          const docString = update.state.doc.toString();
          if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = window.setTimeout(() => {
            onChangeRef.current(docString);
          }, 300);
        }
      });

      const baseTheme = EditorView.theme({
        '&': { height: '100%', fontSize: '12px' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'monospace' },
        '.cm-content': { padding: '12px 0' },
        '.cm-line': { padding: '0 12px' },
      });

      const state = EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          languageCompartmentRef.current.of(langExtension),
          themeCompartmentRef.current.of(editorTheme),
          baseTheme,
          updateListener,
        ],
      });

      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      editorViewRef.current = view;

      return () => {
        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        view.destroy();
        if (editorViewRef.current === view) editorViewRef.current = null;
      };
    }, []);

    // Update theme dynamically (per-instance compartment)
    useEffect(() => {
      if (editorViewRef.current) {
        editorViewRef.current.dispatch({
          effects: themeCompartmentRef.current.reconfigure(theme === 'dark' ? oneDark : []),
        });
      }
    }, [theme]);

    // Update language dynamically without recreating editor
    useEffect(() => {
      if (editorViewRef.current) {
        editorViewRef.current.dispatch({
          effects: languageCompartmentRef.current.reconfigure(format === 'json' ? json() : yaml()),
        });
      }
    }, [format]);

    // Sync external value changes (annotated to suppress onChange echo)
    useEffect(() => {
      if (editorViewRef.current) {
        const currentDoc = editorViewRef.current.state.doc.toString();
        if (currentDoc !== value) {
          editorViewRef.current.dispatch({
            changes: { from: 0, to: currentDoc.length, insert: value },
            annotations: [Transaction.userEvent.of('apiatomy-sync')],
          });
        }
      }
    }, [value]);

    // Handle File Drop - accept only yaml/json/text
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const validExt = /\.(yaml|yml|json)$/i;
        const validMime = /^(application\/json|text\/yaml|text\/plain|application\/x-yaml)/i;
        const nameOk = validExt.test(file.name);
        const mimeOk = !file.type || validMime.test(file.type) || file.type === '';
        if (!nameOk && !mimeOk) {
          alert(`Unsupported file type "${file.name}". Please drop a .yaml, .yml or .json file.`);
          return;
        }
        if (file.size > MAX_UPLOAD_SIZE) {
          alert('File too large. Maximum is 5 MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text && editorViewRef.current) {
            editorViewRef.current.dispatch({
              changes: { from: 0, to: editorViewRef.current.state.doc.length, insert: text },
              annotations: [Transaction.userEvent.of('apiatomy-sync')],
            });
            onChange(text);
          }
        };
        reader.onerror = () => alert('Failed to read dropped file.');
        reader.readAsText(file);
      }
    };

    return (
      <div
        role="region"
        aria-label="Spec editor drop zone"
        aria-dropeffect={isDragging ? 'copy' : undefined}
        className={`relative flex flex-col h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-150 ${
          isDragging ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Editor Container */}
        <div ref={containerRef} className="flex-1 w-full h-full overflow-hidden" />

        {/* Drag Overlay - high contrast with keyboard hint */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-600/20 dark:bg-blue-900/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none z-30 border-2 border-blue-500 border-dashed m-2 rounded-xl">
            <Upload className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Drop your OpenAPI or Swagger spec file here
            </p>
            <p className="text-xs text-slate-700 dark:text-blue-200">
              Accepts .yaml, .yml, .json - max 5 MB - press Esc to cancel
            </p>
          </div>
        )}
      </div>
    );
  }
);

EditorPane.displayName = 'EditorPane';
