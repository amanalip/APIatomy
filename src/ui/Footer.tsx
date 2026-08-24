import { LogoMark } from './Logo';

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      data-testid="footer"
      className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-600 dark:text-slate-400 transition-colors duration-150"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-md overflow-hidden shadow-sm shadow-slate-900/10 shrink-0">
            <LogoMark size={24} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                <span className="font-mono">API</span>
                <span className="font-light">atomy</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                v0.2.0
              </span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
            <span className="text-[11px] leading-tight truncate">
              See inside your API. Client side only, your specs stay on your device.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 text-[11px]">
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
            © {year} APIatomy by Aman Ali. v0.2.0. Open source under GPL-3.0.
          </span>
          <nav aria-label="Footer" className="flex items-center gap-3 sm:gap-4 shrink-0">
            <a
              href="https://github.com/amanalip/APIatomy"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200 hover:underline underline-offset-4 transition"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub</span>
            </a>
            <a
              href="https://github.com/amanalip/APIatomy#readme"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 dark:hover:text-slate-200 hover:underline underline-offset-4 transition"
            >
              Docs
            </a>
            <a
              href="https://github.com/amanalip/APIatomy/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 dark:hover:text-slate-200 hover:underline underline-offset-4 transition"
            >
              License
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};
