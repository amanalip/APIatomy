import { SpecProject, encodeProject } from './project';
import { compressSpecToHash } from './urlHash';
import { getCompactSpecText } from './shareService';

export interface PreparedShare {
  hash: string;
  compactHash: string | null;
}

/** Run once per project, either in the compression worker or the fallback. */
export function prepareShare(project: SpecProject): PreparedShare {
  const hash = compressSpecToHash(encodeProject(project));
  const compactText = getCompactSpecText(project.specText);
  if (compactText === null) return { hash, compactHash: null };
  const files = { ...project.files };
  if (project.rootFilename) files[project.rootFilename] = compactText;
  const compactHash = compressSpecToHash(
    encodeProject({ ...project, files, specText: compactText })
  );
  return { hash, compactHash };
}
