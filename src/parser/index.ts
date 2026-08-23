import { ApiSpecModel } from '../model';
import { parseRawText } from './yamlJson';
import { normalizeSpec } from './normalizer';

/**
 * Primary entry point: parse raw OpenAPI/Swagger text into a normalized ApiSpecModel.
 * Handles syntax diagnostics and delegates to swagger conversion and normalization.
 */
export function parseApiSpec(rawText: string): ApiSpecModel {
  const { data, diagnostics } = parseRawText(rawText);

  if (!data) {
    return {
      title: 'Invalid Spec',
      version: '0.0.0',
      openApiVersion: '3.0.0',
      originalFormat: 'openapi3',
      servers: [],
      tags: [],
      endpoints: [],
      schemas: {},
      securitySchemes: {},
      diagnostics,
      rawText,
    };
  }

  return normalizeSpec(data, rawText, diagnostics);
}

export * from './yamlJson';
export * from './swaggerConverter';
export * from './refResolver';
export * from './validator';
export * from './normalizer';
