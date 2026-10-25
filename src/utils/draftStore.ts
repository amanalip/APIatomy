import { decodeProject, encodeProject, SpecProject } from '../share/project';

export interface LocalDraft {
  project: SpecProject;
  dirty: boolean;
}

async function draftTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('apiatomy_drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('drafts', mode);
      const request = operation(tx.objectStore('drafts'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Draft storage unavailable'));
    });
  } finally {
    db.close();
  }
}

export async function saveDraft(draft: LocalDraft): Promise<void> {
  const text = encodeProject(draft.project);
  await draftTransaction('readwrite', (store) =>
    store.put({ text, dirty: draft.dirty }, 'current')
  );
}

export async function loadDraft(): Promise<LocalDraft | null> {
  const value: unknown = await draftTransaction('readonly', (store) => store.get('current'));
  if (!value || typeof value !== 'object' || !('text' in value) || typeof value.text !== 'string')
    return null;
  return {
    project: decodeProject(value.text),
    dirty: !('dirty' in value) || value.dirty !== false,
  };
}
