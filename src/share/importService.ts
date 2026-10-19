import { parseRawText } from '../parser/yamlJson';
import { normalizeFilePath } from '../parser/fileMap';
import { dictionary, hasOwn } from '../utils/dictionary';
import { decodeProject, encodeProject, SpecProject } from './project';
import { MAX_PROJECT_BYTES, MAX_SPEC_BYTES } from './projectLimits';

function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Import cancelled', 'AbortError');
}
async function readFile(file: File, signal?: AbortSignal): Promise<string> {
  checkCancelled(signal);
  if (typeof file.text === 'function') {
    const text = await file.text();
    checkCancelled(signal);
    return text;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => reader.abort();
    const cleanup = () => signal?.removeEventListener('abort', abort);
    signal?.addEventListener('abort', abort, { once: true });
    reader.onload = () => {
      cleanup();
      try {
        checkCancelled(signal);
        resolve(reader.result as string);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => {
      cleanup();
      reject(reader.error || new Error(`Failed to read ${file.name}`));
    };
    reader.onabort = () => {
      cleanup();
      reject(new DOMException('Import cancelled', 'AbortError'));
    };
    reader.readAsText(file);
  });
}

/** Prepare an import without mutating the current project until every input is ready. */
export async function importProjectFiles(
  files: readonly File[],
  signal?: AbortSignal
): Promise<SpecProject> {
  checkCancelled(signal);
  if (!files.length) throw new Error('Choose at least one specification file');
  let total = 0;
  for (const file of files) {
    const limit = files.length === 1 ? MAX_PROJECT_BYTES : MAX_SPEC_BYTES;
    if (file.size > limit) throw new Error(`${file.name} exceeds ${limit / 1024 / 1024} MB`);
    total += file.size;
    if (total > MAX_PROJECT_BYTES) throw new Error('Project exceeds 20 MB');
    if (
      !/\.(yaml|yml|json)$/i.test(file.name) &&
      file.type &&
      !/^(application\/json|text\/(yaml|plain)|application\/x-yaml)/i.test(file.type)
    )
      throw new Error(`Unsupported file type: ${file.name}`);
  }
  const entries = await Promise.all(
    files.map(async (file) => ({
      name: normalizeFilePath(file.webkitRelativePath || file.name),
      text: await readFile(file, signal),
    }))
  );
  checkCancelled(signal);
  const fileMap: Record<string, string> = dictionary();
  for (const entry of entries) {
    if (!entry.name) throw new Error('File name cannot be empty');
    if (hasOwn(fileMap, entry.name)) throw new Error(`Duplicate file path: ${entry.name}`);
    fileMap[entry.name] = entry.text;
  }
  let project: SpecProject;
  if (entries.length === 1) {
    const decoded = decodeProject(entries[0].text);
    const envelope =
      decoded.specText !== entries[0].text ||
      decoded.rootFilename !== undefined ||
      Object.keys(decoded.files).length > 0;
    project = envelope
      ? decoded
      : { specText: decoded.specText, files: fileMap, rootFilename: entries[0].name };
  } else {
    const roots = entries.filter((entry) => {
      const data = parseRawText(entry.text).data;
      return (
        data &&
        ((hasOwn(data, 'openapi') && typeof data.openapi === 'string') || data.swagger === '2.0')
      );
    });
    if (roots.length !== 1)
      throw new Error(
        roots.length
          ? 'Multiple API roots found. Upload one root with its dependencies.'
          : 'No API root found. Include an OpenAPI or Swagger root file.'
      );
    project = { specText: roots[0].text, files: fileMap, rootFilename: roots[0].name };
  }
  const normalized: Record<string, string> = dictionary();
  for (const [name, text] of Object.entries(project.files)) {
    const path = normalizeFilePath(name);
    if (!path || hasOwn(normalized, path))
      throw new Error(`Duplicate or invalid project path: ${name}`);
    normalized[path] = text;
  }
  const rootFilename = project.rootFilename ? normalizeFilePath(project.rootFilename) : undefined;
  if (rootFilename) normalized[rootFilename] = project.specText;
  project = { ...project, files: normalized, rootFilename };
  encodeProject(project); // Validate individual, aggregate, and serialized sizes before committing.
  return project;
}
