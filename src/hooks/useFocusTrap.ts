import { useEffect, useRef } from 'react';

let activePortalTraps = 0;
let previousRootInert = false;
let previousRootHidden: string | null = null;

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const container = containerRef.current;
    if (!container) return;

    const root = document.getElementById('root');
    const isPortal = root && !root.contains(container);
    if (isPortal) {
      if (activePortalTraps++ === 0) {
        previousRootInert = root.inert;
        previousRootHidden = root.getAttribute('aria-hidden');
      }
      root.inert = true;
      root.setAttribute('aria-hidden', 'true');
    }
    const getFocusable = () =>
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', onKey);
    getFocusable()[0]?.focus();

    return () => {
      container.removeEventListener('keydown', onKey);
      if (isPortal && --activePortalTraps === 0) {
        root.inert = previousRootInert;
        if (previousRootHidden === null) root.removeAttribute('aria-hidden');
        else root.setAttribute('aria-hidden', previousRootHidden);
      }
      previousFocusRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}
