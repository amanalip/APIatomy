import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { captureProject, SpecProject } from '../share/project';
import { getFileRevision, subscribeFileMap } from '../parser/fileMap';
import { loadDraft, saveDraft } from '../utils/draftStore';

export function useDraftRecovery(rawText: string, onRecover: (project: SpecProject) => void) {
  const revision = useSyncExternalStore(subscribeFileMap, getFileRevision);
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Checking local recovery');
  const latest = useRef({ rawText, onRecover });
  latest.current = { rawText, onRecover };
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const initial = latest.current.rawText;
    const shared = Boolean(window.location.hash);
    loadDraft()
      .then((draft) => {
        if (cancelled) return;
        if (draft && !shared && latest.current.rawText === initial) {
          latest.current.onRecover(draft.project);
          setDirty(draft.dirty);
          setStatus('Recovered local draft');
        } else setStatus('Local recovery ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('Local recovery unavailable. Save or download your work.');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const project = captureProject(rawText);
    const timer = window.setTimeout(() => {
      queue.current = queue.current
        .then(() => saveDraft({ project, dirty }))
        .then(() => setStatus('Draft stored locally'))
        .catch(() => setStatus('Local recovery unavailable. Save or download your work.'));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [rawText, revision, dirty, ready]);

  return { dirty, setDirty, status, ready };
}
