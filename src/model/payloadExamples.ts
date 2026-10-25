import { MediaTypeModel } from './index';
import { hasOwn } from '../utils/dictionary';

export interface PayloadExampleOption {
  id: string;
  label: string;
  value?: unknown;
  summary?: string;
  description?: string;
  issue?: string;
  generated?: boolean;
}
export function suppliedPayloadExamples(media: MediaTypeModel): PayloadExampleOption[] {
  const examples: PayloadExampleOption[] = [];
  if (media.example !== undefined)
    examples.push({ id: 'inline', label: 'Documented example', value: media.example });
  for (const [name, example] of Object.entries(media.examples || {}))
    examples.push({
      id: `named:${name}`,
      label: name,
      summary: example.summary,
      description: example.description,
      ...(hasOwn(example, 'value') ? { value: example.value } : {}),
      issue: example.unresolvedReason,
    });
  if (media.schema?.example !== undefined)
    examples.push({ id: 'schema', label: 'Schema example', value: media.schema.example });
  return examples;
}
export function serializePayloadExample(
  value: unknown,
  contentType: string
): { text: string; error?: string } {
  try {
    return {
      text:
        typeof value === 'string' && !contentType.toLowerCase().includes('json')
          ? value
          : (JSON.stringify(value, null, 2) ?? String(value)),
    };
  } catch {
    return {
      text: '',
      error: 'This example contains cyclic or unsupported values and cannot be copied as text.',
    };
  }
}
