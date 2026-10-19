import { captureProject, SpecProject } from '../share/project';

const DB_NAME = 'apiatomy_workspaces';
const STORE = 'specs';
export interface WorkspaceData extends SpecProject {
  title?: string;
}
interface WorkspaceRecord extends WorkspaceData {
  id: string;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () =>
        reject(tx.error || request.error || new Error('Workspace operation failed'));
    });
  } finally {
    db.close();
  }
}

export async function saveWorkspace(
  id: string,
  specText: string,
  title?: string,
  project = captureProject(specText)
): Promise<void> {
  await transaction('readwrite', (store) =>
    store.put({ ...project, id, specText, title, savedAt: Date.now() })
  );
}

export async function loadWorkspace(id: string): Promise<WorkspaceData | null> {
  const data = await transaction<WorkspaceRecord | undefined>('readonly', (store) => store.get(id));
  if (!data) return null;
  // Older records contained only specText and title.
  return {
    specText: data.specText,
    title: data.title,
    files: data.files || {},
    rootFilename: data.rootFilename,
  };
}

export async function listWorkspaces(): Promise<
  Array<{ id: string; title?: string; savedAt: number }>
> {
  const records = await transaction<WorkspaceRecord[]>('readonly', (store) => store.getAll());
  return records.map(({ id, title, savedAt }) => ({ id, title, savedAt }));
}

export async function deleteWorkspace(id: string): Promise<void> {
  await transaction('readwrite', (store) => store.delete(id));
}
