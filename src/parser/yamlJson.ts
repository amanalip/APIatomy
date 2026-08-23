import YAML from 'yaml';
import { DiagnosticItem } from '../model';

export interface ParseResult {
  data: Record<string, unknown> | null;
  format: 'json' | 'yaml';
  diagnostics: DiagnosticItem[];
}

export function parseRawText(raw: string): ParseResult {
  const diagnostics: DiagnosticItem[] = [];
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      data: null,
      format: 'yaml',
      diagnostics: [
        {
          id: 'empty-spec',
          severity: 'error',
          message: 'The specification file is empty.',
          line: 1,
          column: 1,
          source: 'syntax',
        },
      ],
    };
  }

  // Fast-path JSON detection
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');

  if (looksLikeJson) {
    try {
      const data = JSON.parse(raw);
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        return { data: data as Record<string, unknown>, format: 'json', diagnostics: [] };
      }
      return {
        data: null,
        format: 'json',
        diagnostics: [
          {
            id: 'json-root-object',
            severity: 'error',
            message: 'Specification root must be an object (not an array or primitive).',
            line: 1,
            column: 1,
            source: 'syntax',
          },
        ],
      };
    } catch (jsonErr: unknown) {
      // If looks like JSON but failed JSON.parse, try extracting line/column
      const errorMsg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
      const posMatch = errorMsg.match(/position\s+(\d+)/i);
      let line = 1;
      let column = 1;

      if (posMatch && posMatch[1]) {
        const charIndex = parseInt(posMatch[1], 10);
        const linesUpToError = raw.slice(0, charIndex).split('\n');
        line = linesUpToError.length;
        column = linesUpToError[linesUpToError.length - 1].length + 1;
      }

      diagnostics.push({
        id: 'json-syntax-error',
        severity: 'error',
        message: `JSON Syntax Error: ${errorMsg}`,
        line,
        column,
        source: 'syntax',
      });

      // Try fallback to YAML parser in case it was YAML with leading brace
    }
  }

  // Try YAML parser
  try {
    const doc = YAML.parseDocument(raw, { prettyErrors: true });

    if (doc.errors && doc.errors.length > 0) {
      for (const err of doc.errors) {
        const linePos = err.linePos?.[0];
        diagnostics.push({
          id: `yaml-error-${err.code || 'syntax'}`,
          severity: 'error',
          message: err.message,
          line: linePos?.line || 1,
          column: linePos?.col || 1,
          source: 'syntax',
        });
      }
    }

    if (doc.warnings && doc.warnings.length > 0) {
      for (const warn of doc.warnings) {
        const linePos = warn.linePos?.[0];
        diagnostics.push({
          id: `yaml-warn-${warn.code || 'syntax'}`,
          severity: 'warning',
          message: warn.message,
          line: linePos?.line || 1,
          column: linePos?.col || 1,
          source: 'syntax',
        });
      }
    }

    const data = doc.toJS();
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      return {
        data: data as Record<string, unknown>,
        format: looksLikeJson ? 'json' : 'yaml',
        diagnostics,
      };
    }

    if (diagnostics.length === 0) {
      diagnostics.push({
        id: 'root-not-object',
        severity: 'error',
        message: 'Specification root must be a key-value object.',
        line: 1,
        column: 1,
        source: 'syntax',
      });
    }

    return {
      data: null,
      format: looksLikeJson ? 'json' : 'yaml',
      diagnostics,
    };
  } catch (yamlErr: unknown) {
    const errorMsg = yamlErr instanceof Error ? yamlErr.message : String(yamlErr);
    diagnostics.push({
      id: 'yaml-parse-exception',
      severity: 'error',
      message: `YAML Parse Error: ${errorMsg}`,
      line: 1,
      column: 1,
      source: 'syntax',
    });

    return {
      data: null,
      format: 'yaml',
      diagnostics,
    };
  }
}
