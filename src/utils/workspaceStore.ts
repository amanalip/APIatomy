import { captureProject, SpecProject } from '../share/project';

const DB_NAME = 'apiatomy_workspaces';
const STORE = 'specs';
const TRASH = 'trash';
export interface DeletedWorkspace {
  token: string;
  id: string;
  deletedAt: number;
}
interface TrashRecord extends DeletedWorkspace {
  workspace: WorkspaceRecord;
}
export interface WorkspaceData extends SpecProject {
  title?: string;
}
interface WorkspaceRecord extends WorkspaceData {
  id: string;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      if (!req.result.objectStoreNames.contains(TRASH))
        req.result.createObjectStore(TRASH, { keyPath: 'token' });
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
  project = captureProject(specText),
  overwrite = true
): Promise<void> {
  await transaction('readwrite', (store) =>
    store[overwrite ? 'put' : 'add']({ ...project, id, specText, title, savedAt: Date.now() })
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

/** Move the complete record without replacing an existing workspace. */
export async function renameWorkspace(id: string, newId: string): Promise<void> {
  if (id === newId) return;
  if (!newId.trim()) throw new Error('Workspace name cannot be empty');
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      let failure: Error | undefined;
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('Rename failed'));
      const source = store.get(id);
      source.onsuccess = () => {
        try {
          if (!source.result) throw new Error('Workspace no longer exists');
          const destination = store.add({ ...source.result, id: newId });
          destination.onerror = () => {
            if (destination.error?.name === 'ConstraintError')
              failure = new Error(`A workspace named "${newId}" already exists`);
          };
          store.delete(id);
        } catch (error) {
          failure = error instanceof Error ? error : new Error('Rename failed');
          tx.abort();
        }
      };
    });
  } finally {
    db.close();
  }
}

async function mutateTrash(
  operation: (live: IDBObjectStore, trash: IDBObjectStore) => void
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE, TRASH], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () =>
        reject(tx.error || new Error('Workspace recovery failed. The original data was retained.'));
      try {
        operation(tx.objectStore(STORE), tx.objectStore(TRASH));
      } catch {
        tx.abort();
      }
    });
  } finally {
    db.close();
  }
}

export async function trashWorkspace(id: string): Promise<string> {
  const token = crypto.randomUUID();
  await mutateTrash((live, trash) => {
    const request = live.get(id);
    request.onsuccess = () => {
      if (!request.result) return;
      trash.add({
        token,
        id,
        deletedAt: Date.now(),
        workspace: request.result,
      } satisfies TrashRecord);
      live.delete(id);
    };
  });
  return token;
}
