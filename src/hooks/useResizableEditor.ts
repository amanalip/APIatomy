import { useState, useRef, useEffect } from 'react';

export function useResizableEditor(defaultWidth = 420) {
  const [editorWidth, setEditorWidth] = useState(defaultWidth);
  const isResizingRef = useRef(false);
  const activeMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const activeUpRef = useRef<(() => void) | null>(null);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const minWidth = 280;
      const maxWidth = Math.max(minWidth, window.innerWidth - 360);
      const newWidth = Math.max(minWidth, Math.min(moveEvent.clientX, maxWidth));
      setEditorWidth(newWidth);
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      activeMoveRef.current = null;
      activeUpRef.current = null;
    };
    activeMoveRef.current = handleMouseMove;
    activeUpRef.current = handleMouseUp;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      isResizingRef.current = false;
      if (activeMoveRef.current) window.removeEventListener('mousemove', activeMoveRef.current);
      if (activeUpRef.current) window.removeEventListener('mouseup', activeUpRef.current);
    };
  }, []);

  return { editorWidth, setEditorWidth, handleMouseDownResize };
}
