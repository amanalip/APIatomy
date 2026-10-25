import { parseRawText } from '../parser/yamlJson';
import { hasOwn } from '../utils/dictionary';
import { SpecProject, validateProject } from './project';

/** Import validity is narrower than specification lint: imperfect APIs remain inspectable. */
export function validateImportRoot(text: string, label = 'Specification'): void {
  const { data, diagnostics } = parseRawText(text);
  const syntax = diagnostics.find((item) => item.severity === 'error');
  if (!data || syntax) throw new Error(`${label}: ${syntax?.message || 'Expected an API object'}`);
  if (!(
    (hasOwn(data, 'openapi') &&
      typeof data.openapi === 'string' &&
      /^3\.\d+\.\d+(?:[-+].*)?$/.test(data.openapi)) ||
    (hasOwn(data, 'swagger') && data.swagger === '2.0')
  ))
    throw new Error(`${label}: Expected an OpenAPI 3.x or Swagger 2.0 root`);
}

export function validateImportProject(project: SpecProject): SpecProject {
  validateProject(project);
  validateImportRoot(project.specText, project.rootFilename || 'Specification');
  return project;
}
