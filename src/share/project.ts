import { MAX_SPEC_BYTES, MAX_PROJECT_BYTES, assertTextLimit, textBytes } from './projectLimits';
import { getFileMap, getRootFilename, setFileMap } from '../parser/fileMap';
import { isRecord } from '../utils/typeGuards';

export interface SpecProject {
  specText: string;
  files: Record<string, string>;
  rootFilename?: string;
}

export function captureProject(specText: string): SpecProject {
  const files = Object.fromEntries(getFileMap());
  const rootFilename = getRootFilename();
  if (rootFilename) files[rootFilename] = specText;
  return { specText, files, rootFilename };
}

export function restoreProject(project: SpecProject): void {
  setFileMap(project.files, project.rootFilename);
}

export function validateProject(project: SpecProject): void {
  assertTextLimit(project.specText, MAX_SPEC_BYTES, 'Specification');
  let total = textBytes(project.specText);
  for (const [name, text] of Object.entries(project.files)) {
    assertTextLimit(text, MAX_SPEC_BYTES, 'Project file');
    if (name !== project.rootFilename) total += textBytes(name) + textBytes(text);
    if (total > MAX_PROJECT_BYTES) throw new Error('Project exceeds 20 MB');
  }
}

export function encodeProject(project: SpecProject): string {
  validateProject(project);
  if (!Object.keys(project.files).length && !project.rootFilename) return project.specText;
  // specText is the authoritative root; store it once, even in a one-file project.
  const files = Object.fromEntries(
    Object.entries(project.files).filter(([name]) => name !== project.rootFilename)
  );
  const text = JSON.stringify({
    apiatomyProject: 1,
    specText: project.specText,
    files,
    rootFilename: project.rootFilename,
  });
  assertTextLimit(text, MAX_PROJECT_BYTES, 'Project');
  return text;
}

/** Accept legacy plain spec files as well as versioned project envelopes. */
export function decodeProject(text: string): SpecProject {
  assertTextLimit(text, MAX_PROJECT_BYTES, 'Project file');
  const plain = () => {
    const project = { specText: text, files: {} };
    validateProject(project);
    return project;
  };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return plain();
  }
  if (!isRecord(data) || data.apiatomyProject !== 1) return plain();
  if (
    typeof data.specText !== 'string' ||
    !isRecord(data.files) ||
    Object.values(data.files).some((value) => typeof value !== 'string') ||
    (data.rootFilename !== undefined && typeof data.rootFilename !== 'string')
  ) {
    throw new Error('Invalid APIatomy project file');
  }
  const project = {
    specText: data.specText,
    files: data.files as Record<string, string>,
    rootFilename: data.rootFilename as string | undefined,
  };
  if (project.rootFilename)
    project.files = { ...project.files, [project.rootFilename]: project.specText };
  validateProject(project);
  return project;
}
