import { ReactNode, useId, useMemo, useState } from 'react';
import { MediaTypeModel, SchemaModel } from '../model';
import {
  suppliedPayloadExamples,
  serializePayloadExample,
  PayloadExampleOption,
} from '../model/payloadExamples';
import { generateMockExample } from '../model/mockGenerator';
import { useCopy } from '../utils/useCopy';

export function PayloadViewer({
  media,
  direction,
  schemas,
  children,
}: {
  media: MediaTypeModel;
  direction: 'request' | 'response';
  schemas: Record<string, SchemaModel>;
  children?: ReactNode;
}) {
  const [tab, setTab] = useState<'schema' | 'examples'>(media.schema ? 'schema' : 'examples');
  const [selection, setSelection] = useState('');
  const id = useId();
  const { copied, copy } = useCopy();
  const [copyError, setCopyError] = useState(false);
  const options = useMemo(() => {
    const values = suppliedPayloadExamples(media);
    if (media.schema)
      values.push({ id: 'generated', label: 'Generated example (best effort)', generated: true });
    return values;
  }, [media]);
  const selected: PayloadExampleOption | undefined =
    options.find((option) => option.id === selection) || options[0];
  const generated = useMemo(
    () =>
      selected?.generated && media.schema
        ? generateMockExample(media.schema, schemas, direction)
        : undefined,
    [selected, media.schema, schemas, direction]
  );
  const value = generated ? generated.value : selected?.value;
  const serialized = serializePayloadExample(value, media.contentType);
  const label = `${direction === 'request' ? 'Request' : 'Response'} ${media.contentType}`;
  return (
    <section aria-label={label} className="space-y-2 min-w-0">
      <div
        role="tablist"
        aria-label={`${label} views`}
        className="flex gap-2 border-b border-slate-200 dark:border-slate-700"
      >
        {(['schema', 'examples'] as const).map((mode) => (
          <button
            key={mode}
            id={`${id}-${mode}`}
            role="tab"
            aria-selected={tab === mode}
            aria-controls={`${id}-panel`}
            tabIndex={tab === mode ? 0 : -1}
            onClick={() => setTab(mode)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                const next = mode === 'schema' ? 'examples' : 'schema';
                setTab(next);
                document.getElementById(`${id}-${next}`)?.focus();
              }
            }}
            className={`px-2 py-2 text-xs ${tab === mode ? 'border-b-2 border-blue-600 font-semibold text-blue-700 dark:text-blue-300' : ''}`}
          >
            {mode === 'schema' ? 'Schema' : 'Examples'}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}`}
        className="space-y-2"
      >
        {tab === 'schema' ? (
          children || <p className="text-xs">No schema documented for this media type.</p>
        ) : !selected ? (
          <p className="text-xs">No examples or schema documented for this media type.</p>
        ) : (
          <>
            <label className="block text-xs">
              Example
              <select
                aria-label={`${label} example`}
                value={selected.id}
                onChange={(event) => {
                  setSelection(event.target.value);
                  setCopyError(false);
                }}
                className="ml-2 max-w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-1"
              >
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs font-semibold">
              {selected.generated ? 'Generated example, review before use' : 'Supplied example'}
            </p>
            {selected.summary && <p className="font-semibold text-xs">{selected.summary}</p>}
            {selected.description && (
              <p className="text-xs whitespace-pre-wrap">{selected.description}</p>
            )}
            {selected.issue || serialized.error ? (
              <p role="status" className="text-xs text-amber-800 dark:text-amber-200">
                {selected.issue || serialized.error}
              </p>
            ) : (
              <>
                <pre
                  aria-label={`${label} example value`}
                  tabIndex={0}
                  className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded border border-slate-200 dark:border-slate-700 p-3 text-xs font-mono"
                >
                  <code>{serialized.text === '' ? '"" (empty string)' : serialized.text}</code>
                </pre>
                <button
                  onClick={async () => setCopyError(!(await copy(serialized.text)))}
                  className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs"
                >
                  {copied ? 'Copied example' : 'Copy example'}
                </button>
              </>
            )}
            {copyError && (
              <p role="alert" className="text-xs">
                Copy failed. Select and copy the example text manually.
              </p>
            )}
            {generated?.issues.length ? (
              <p role="status" className="text-xs text-amber-800 dark:text-amber-200">
                {generated.issues.join(' ')}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
