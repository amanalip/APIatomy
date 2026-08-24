const DB_NAME = 'apiatomy_workspaces';
const STORE = 'specs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveWorkspace(id: string, specText: string, title?: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put({ id, specText, title, savedAt: Date.now() });
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function loadWorkspace(id: string): Promise<{ specText: string; title?: string } | null> {
  const db = await openDb();
  const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result ? { specText: req.result.specText, title: req.result.title } : null);
    req.onerror = () => reject(req.error);
  });
}

export async function listWorkspaces(): Promise<Array<{ id: string; title?: string; savedAt: number }>> {
  const db = await openDb();
  const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result.map((r: unknown) => r as { id: string; title?: string; savedAt: number }));
    req.onerror = () => reject(req.error);
  });
}
