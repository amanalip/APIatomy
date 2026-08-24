import { useEffect, useRef, useState } from 'react';

export function useResizeObserver<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    setHeight(el.clientHeight || 600);
    return () => observer.disconnect();
  }, []);

  return [ref as React.RefObject<T>, height];
}
