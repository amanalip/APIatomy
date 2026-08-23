import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { yaml } from '@codemirror/lang-yaml';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '../theme/ThemeContext';
import { Upload } from 'lucide-react';

export interface EditorPaneRef {
  jumpToLine: (line: number) => void;
  setContent: (text: string) => void;
}

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  format?: 'yaml' | 'json';
}

const themeCompartment = new Compartment();

export const EditorPane = forwardRef<EditorPaneRef, EditorPaneProps>(
  ({ value, onChange, format = 'yaml' }, ref) => {
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const debounceTimerRef = useRef<number | null>(null);

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
          });
        }
      },
    }));

    // Initialize CodeMirror 6 Editor
    useEffect(() => {
      if (!containerRef.current) return;

      const langExtension = format === 'json' ? json() : yaml();
      const editorTheme = theme === 'dark' ? oneDark : [];

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const docString = update.state.doc.toString();
          if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = window.setTimeout(() => {
            onChange(docString);
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
          langExtension,
          themeCompartment.of(editorTheme),
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
        }
        view.destroy();
      };
    }, [format]);

    // Update theme dynamically
    useEffect(() => {
      if (editorViewRef.current) {
        editorViewRef.current.dispatch({
          effects: themeCompartment.reconfigure(theme === 'dark' ? oneDark : []),
        });
      }
    }, [theme]);

    // Sync external value changes when not focused/modified
    useEffect(() => {
      if (editorViewRef.current) {
        const currentDoc = editorViewRef.current.state.doc.toString();
        if (currentDoc !== value) {
          editorViewRef.current.dispatch({
            changes: { from: 0, to: currentDoc.length, insert: value },
          });
        }
      }
    }, [value]);

    // Handle File Drop
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text && editorViewRef.current) {
            editorViewRef.current.dispatch({
              changes: { from: 0, to: editorViewRef.current.state.doc.length, insert: text },
            });
            onChange(text);
          }
        };
        reader.readAsText(file);
      }
    };

    return (
      <div
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

        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-900/40 dark:bg-blue-950/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none z-30">
            <Upload className="w-12 h-12 text-blue-500 dark:text-blue-400 mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Drop your OpenAPI or Swagger spec file here</p>
            <p className="text-xs text-blue-600 dark:text-blue-300">Accepts .yaml, .yml, .json</p>
          </div>
        )}
      </div>
    );
  }
);

EditorPane.displayName = 'EditorPane';
