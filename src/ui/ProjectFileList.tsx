export function ProjectFileList({
  files,
  root,
  active,
  onSelect,
}: {
  files: string[];
  root: string;
  active: string;
  onSelect: (path: string) => void;
}) {
  return (
    <details open className="border-b border-slate-200 dark:border-slate-800 text-xs">
      <summary className="px-3 py-2 cursor-pointer font-semibold">
        Project files ({files.length})
      </summary>
      <nav aria-label="Project files" className="max-h-36 overflow-auto px-2 pb-2 space-y-1">
        {files.map((name) => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            aria-current={active === name ? 'page' : undefined}
            title={name}
            className={`block w-full rounded px-2 py-1.5 text-left font-mono break-all ${active === name ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200' : 'hover:bg-slate-100 dark:hover:bg-slate-900'}`}
          >
            {name}
            {name === root && <span className="ml-2 font-sans text-[10px]">Root</span>}
          </button>
        ))}
      </nav>
    </details>
  );
}
