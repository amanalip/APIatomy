import { FieldChange } from '../model/diffDetails';

const display = (value: unknown) =>
  value === undefined ? '(not present)' : (JSON.stringify(value, null, 2) ?? String(value));
export function DiffFieldChanges({ fields }: { fields: FieldChange[] }) {
  return (
    <div className="space-y-3 mt-3">
      {fields.map((field, index) => (
        <div
          key={`${field.path}-${index}`}
          className="rounded border border-slate-200 dark:border-slate-700 p-2 space-y-2"
        >
          <div className="font-mono break-all font-semibold">{field.path}</div>
          <p className="font-sans text-slate-600 dark:text-slate-300">{field.reason}</p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            <div>
              <span className="font-semibold">Before</span>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all bg-red-50 dark:bg-red-950/30 p-2">
                {display(field.before)}
              </pre>
            </div>
            <div>
              <span className="font-semibold">After</span>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all bg-emerald-50 dark:bg-emerald-950/30 p-2">
                {display(field.after)}
              </pre>
            </div>
          </div>
        </div>
      ))}
      {fields.length >= 200 && (
        <p>Showing the first 200 field changes. Narrow the comparison to inspect more changes.</p>
      )}
    </div>
  );
}
