import { useEffect, useState } from 'react';
import { captureProject, encodeProject } from '../share/project';

/** Comparison snapshots belong to the app, independently of the mounted view. */
export function useComparisonInputs(currentText: string, active: boolean) {
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState<string | null>(null);
  useEffect(() => {
    if (active && newText === null) setNewText(encodeProject(captureProject(currentText)));
  }, [active, currentText, newText]);
  return { oldText, newText: newText ?? '', setOldText, setNewText };
}
