import { useState, useCallback } from 'react';
import { copyTextToClipboard } from '../share/urlHash';

export function useCopy(timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    }
    return success;
  }, [timeout]);
  return { copied, copy, setCopied } as const;
}
