import { PayloadExampleModel } from '../model';
import { dictionary, hasOwn } from '../utils/dictionary';
import { isRecord } from '../utils/typeGuards';
import { RefResolutionContext, resolveReferenceObject } from './refResolver';

export function normalizeExamples(
  raw: unknown,
  context: RefResolutionContext
): Record<string, PayloadExampleModel> | undefined {
  if (!isRecord(raw)) return undefined;
  const examples = dictionary<PayloadExampleModel>();
  for (const [name, value] of Object.entries(raw)) {
    const resolved = resolveReferenceObject(value, context);
    if (!resolved) {
      examples[name] = {
        unresolvedReason:
          'This example reference is unresolved. Include its document in the project and check its pointer.',
      };
      continue;
    }
    const example = resolved.value;
    examples[name] = {
      summary: typeof example.summary === 'string' ? example.summary : undefined,
      description: typeof example.description === 'string' ? example.description : undefined,
      ...(hasOwn(example, 'value') ? { value: example.value } : {}),
      externalValue: typeof example.externalValue === 'string' ? example.externalValue : undefined,
      ...(!hasOwn(example, 'value')
        ? {
            unresolvedReason:
              typeof example.externalValue === 'string'
                ? 'External example URLs are not fetched. Copy the example value into the specification to view it locally.'
                : 'This example has no inline value.',
          }
        : {}),
    };
  }
  return examples;
}
