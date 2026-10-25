import { DiagnosticItem } from '../model';
import { parseRawText } from './yamlJson';
import { RefResolutionContext, resolveReferenceTarget } from './refResolver';
import { findLineForPattern } from './validator';

export function projectDiagnostics(
  files: Map<string, string>,
  rootFilename: string | undefined,
  rootText: string
): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];
  const documents = new Map();
  const entries = new Map(files);
  if (rootFilename) entries.set(rootFilename, rootText);
  for (const [filename, text] of entries) {
    const parsed = parseRawText(text);
    if (filename !== rootFilename)
      for (const item of parsed.diagnostics) {
        if (item.severity === 'error' && !['root-not-object', 'json-root-object'].includes(item.id))
          diagnostics.push({ ...item, id: `file-${filename}-${item.id}`, filename });
      }
    if (!parsed.data) continue;
    const context: RefResolutionContext = {
      rootDoc: parsed.data,
      files: entries,
      basePath: filename,
      documents,
      resolvedCache: new Map(),
      visitingPath: new Set(),
    };
    const seen = new WeakSet<object>();
    function visit(value: unknown, depth: number) {
      if (!value || typeof value !== 'object' || depth > 64 || seen.has(value)) return;
      seen.add(value);
      const ref = (value as Record<string, unknown>).$ref;
      if (
        typeof ref === 'string' &&
        (filename !== rootFilename || !ref.startsWith('#')) &&
        !resolveReferenceTarget(ref, context)
      )
        diagnostics.push({
          id: `file-ref-${filename}-${ref}`,
          severity: 'warning',
          source: 'ref',
          message: `Unresolved reference "${ref}" in ${filename}.`,
          filename,
          reference: ref,
          line: findLineForPattern(text, ref) || 1,
        });
      for (const item of Object.values(value)) visit(item, depth + 1);
    }
    visit(parsed.data, 0);
  }
  return diagnostics;
}
