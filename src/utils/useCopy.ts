import { useState, useCallback, useEffect, useRef } from 'react';
import { copyTextToClipboard } from '../share/urlHash';

export function useCopy(timeout = 2000): { copied: boolean; copy: (text: string) => Promise<boolean>; setCopied: (v: boolean) => void } {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);
  const copy = useCallback(async (text: string): Promise<boolean> => {
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), timeout);
    }
    return success;
  }, [timeout]);
  return { copied, copy, setCopied } as const;
}
