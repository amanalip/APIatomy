import { useRef, useEffect } from 'react';
import { DiagnosticItem } from '../model';
import { EditorPaneRef } from '../ui/EditorPane';

export function useDiagnosticNavigation(editorPaneRef: React.RefObject<EditorPaneRef>, setIsEditorOpen: (open: boolean) => void) {
  const diagTimerRef = useRef<number | null>(null);

  const handleSelectDiagnostic = (diag: DiagnosticItem) => {
    setIsEditorOpen(true);
    const targetLine = diag.line ?? 1;
    if (diagTimerRef.current) window.clearTimeout(diagTimerRef.current);
    diagTimerRef.current = window.setTimeout(() => {
      if (editorPaneRef.current) {
        editorPaneRef.current.jumpToLine(targetLine);
      } else {
        const retry = window.setTimeout(() => editorPaneRef.current?.jumpToLine(targetLine), 150);
        diagTimerRef.current = retry as unknown as number;
      }
    }, 150) as unknown as number;
  };

  useEffect(() => {
    return () => {
      if (diagTimerRef.current) window.clearTimeout(diagTimerRef.current);
    };
  }, []);

  return { handleSelectDiagnostic };
}
