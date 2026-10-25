import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { captureProject, SpecProject } from '../share/project';
import { getFileRevision, subscribeFileMap } from '../parser/fileMap';
import { loadDraft, saveDraft } from '../utils/draftStore';

export function useDraftRecovery(rawText: string, onRecover: (project: SpecProject) => void) {
  const revision = useSyncExternalStore(subscribeFileMap, getFileRevision);
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Checking local recovery');
  const latest = useRef({ rawText, onRecover, revision });
  useEffect(() => {
    latest.current = { rawText, onRecover, revision };
  });
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const initial = latest.current.rawText;
    const initialRevision = latest.current.revision;
    const shared = Boolean(window.location.hash);
    loadDraft()
      .then((draft) => {
        if (cancelled) return;
        if (
          draft &&
          !shared &&
          latest.current.rawText === initial &&
          latest.current.revision === initialRevision
        ) {
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
    setStatus('Saving local draft...');
    let active = true;
    const timer = window.setTimeout(() => {
      queue.current = queue.current
        .then(() => saveDraft({ project, dirty }))
        .then(() => {
          if (active) setStatus('Draft stored locally');
        })
        .catch(() => {
          if (active) setStatus('Local recovery unavailable. Save or download your work.');
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [rawText, revision, dirty, ready]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return { dirty, setDirty, status, ready };
}
