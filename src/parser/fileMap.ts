const fileMap = new Map<string, string>();

export function setFileMap(files: Record<string, string>): void {
  fileMap.clear();
  for (const [name, content] of Object.entries(files)) {
    fileMap.set(name, content);
    const base = name.split('/').pop() || name;
    if (base !== name) fileMap.set(base, content);
  }
}

export function getFileMap(): Map<string, string> {
  return fileMap;
}

export function getFileContent(refPath: string): string | undefined {
  const clean = refPath.split('#')[0];
  if (!clean) return undefined;
  const base = clean.split('/').pop() || clean;
  return fileMap.get(clean) || fileMap.get(base);
}
