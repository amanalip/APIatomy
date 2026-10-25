import { useEffect, useState } from 'react';
import { captureProject, encodeProject } from '../share/project';

/** Comparison snapshots belong to the app, independently of the mounted view. */
export function useComparisonInputs(currentText: string, active: boolean) {
  const [oldText, setOldText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState<string | null>(null);
  useEffect(() => {
    if (active && newText === null) {
      try {
        setNewText(encodeProject(captureProject(currentText)));
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Cannot snapshot current project');
        setNewText('');
      }
    }
  }, [active, currentText, newText]);
  return { error, oldText, newText: newText ?? '', setOldText, setNewText };
}
