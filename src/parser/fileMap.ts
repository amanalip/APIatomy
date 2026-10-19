const fileMap = new Map<string, string>();
let rootFilename: string | undefined;
let revision = 0;
const listeners = new Set<() => void>();

export function normalizeFilePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
}

export function resolveFilePath(refPath: string, basePath?: string): string {
  const clean = refPath.split('#')[0];
  return normalizeFilePath(
    `${basePath?.includes('/') ? basePath.slice(0, basePath.lastIndexOf('/') + 1) : ''}${clean}`
  );
}

export function setFileMap(files: Record<string, string>, root?: string): void {
  fileMap.clear();
  for (const [name, content] of Object.entries(files))
    fileMap.set(normalizeFilePath(name), content);
  rootFilename = root ? normalizeFilePath(root) : undefined;
  revision++;
  for (const listener of listeners) listener();
}

export function getRootFilename(): string | undefined {
  return rootFilename;
}
export function getFileRevision(): number {
  return revision;
}
export function subscribeFileMap(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function getFileMap(): Map<string, string> {
  return new Map(fileMap);
}

export function getFileContent(
  refPath: string,
  basePath?: string,
  files = fileMap
): string | undefined {
  const clean = refPath.split('#')[0];
  if (!clean) return undefined;
  const resolved = resolveFilePath(refPath, basePath);
  if (files.has(resolved)) return files.get(resolved);
  // File pickers may expose only basenames. Never guess between duplicate names.
  const base = clean.split('/').pop();
  const matches = [...files].filter(([name]) => name.split('/').pop() === base);
  return matches.length === 1 ? matches[0][1] : undefined;
}
