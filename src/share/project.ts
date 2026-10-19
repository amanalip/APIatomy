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

export function encodeProject(project: SpecProject): string {
  if (!Object.keys(project.files).length) return project.specText;
  return JSON.stringify({ apiatomyProject: 1, ...project });
}

/** Accept legacy plain spec files as well as versioned project envelopes. */
export function decodeProject(text: string): SpecProject {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { specText: text, files: {} };
  }
  if (!isRecord(data) || data.apiatomyProject !== 1) return { specText: text, files: {} };
  if (
    typeof data.specText !== 'string' ||
    !isRecord(data.files) ||
    Object.values(data.files).some((value) => typeof value !== 'string') ||
    (data.rootFilename !== undefined && typeof data.rootFilename !== 'string')
  ) {
    throw new Error('Invalid APIatomy project file');
  }
  return {
    specText: data.specText,
    files: data.files as Record<string, string>,
    rootFilename: data.rootFilename as string | undefined,
  };
}
