import { captureProject, encodeProject } from './project';
import { getFileMap, getRootFilename, normalizeFilePath, setFileMap } from '../parser/fileMap';

/** Live dependency edits may be syntactically incomplete, but must remain size-bounded. */
export function editProjectFile(path: string, text: string, rootText: string): void {
  const filename = normalizeFilePath(path);
  const files = getFileMap();
  if (!files.has(filename) || filename === getRootFilename())
    throw new Error('Choose an uploaded dependency to edit');
  const project = captureProject(rootText);
  project.files = { ...project.files, [filename]: text };
  encodeProject(project);
  setFileMap(project.files, project.rootFilename);
}
