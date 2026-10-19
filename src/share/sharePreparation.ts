import { SpecProject, encodeProject } from './project';
import { compressSpecToHash } from './urlHash';
import { getCompactSpecText } from './shareService';

export interface PreparedShare {
  hash: string;
  compactHash: string | null;
}

/** Run once per project, either in the compression worker or the fallback. */
export function prepareShare(project: SpecProject): PreparedShare {
  const encoded = encodeProject(project);
  const hash = compressSpecToHash(encoded);
  const compactText = getCompactSpecText(project.specText);
  if (compactText === null) return { hash, compactHash: null };
  const files = { ...project.files };
  if (project.rootFilename) files[project.rootFilename] = compactText;
  const compactEncoded = encodeProject({ ...project, files, specText: compactText });
  const compactHash = compactEncoded === encoded ? hash : compressSpecToHash(compactEncoded);
  return { hash, compactHash };
}
