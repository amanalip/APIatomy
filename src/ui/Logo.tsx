type LogoProps = {
  size?: number;
  withWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
};

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
    >
      <rect width="32" height="32" rx="8" fill="#0f172a" />
      {/* base block */}
      <path
        d="M8 17.2 L16 21.6 L24 17.2 L16 12.8 Z"
        fill="#1e293b"
        stroke="white"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      <path
        d="M8 17.2 L8 20.4 L16 24.8 L16 21.6 Z"
        fill="#0f172a"
        stroke="white"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      <path
        d="M16 21.6 L16 24.8 L24 20.4 L24 17.2 Z"
        fill="#334155"
        stroke="white"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      {/* lid lifted */}
      <path
        d="M8 11.1 L16 15.5 L24 11.1 L16 6.7 Z"
        fill="none"
        stroke="white"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <path
        d="M8 11.1 L8 14.35 L16 18.75 L16 15.5 Z"
        fill="white"
        fillOpacity="0.07"
        stroke="white"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      <path
        d="M16 15.5 L16 18.75 L24 14.35 L24 11.1 Z"
        fill="white"
        fillOpacity="0.11"
        stroke="white"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      {/* gap hint */}
      <path
        d="M10.6 14.35 L10.6 16.1 M21.4 14.35 L21.4 16.1"
        stroke="white"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.35"
        strokeDasharray="1 1.2"
      />
      {/* interior topology graph */}
      <path
        d="M12.4 18.2 L16 19.9 L19.6 18.2"
        stroke="white"
        strokeWidth="0.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx="12.4" cy="18.2" r="1.05" fill="white" stroke="white" strokeWidth="0.35" />
      <circle cx="19.6" cy="18.2" r="1.05" fill="white" stroke="white" strokeWidth="0.35" />
      <circle cx="16" cy="19.9" r="1.25" fill="#3b82f6" stroke="white" strokeWidth="0.7" />
    </svg>
  );
}

export function Logo({
  size = 32,
  withWordmark = false,
  wordmarkClassName = '',
  className = '',
}: LogoProps) {
  if (!withWordmark) {
    return <LogoMark size={size} />;
  }

  const height = size;
  const markSize = size;
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} />
      <span className={`flex flex-col leading-none ${wordmarkClassName}`}>
        <span
          className="font-bold tracking-tight text-[15px] text-slate-900 dark:text-white"
          style={{ fontSize: height * 0.46 }}
        >
          <span className="font-mono font-bold">API</span>
          <span className="font-light">atomy</span>
        </span>
        <span
          className="font-mono tracking-widest text-slate-500 dark:text-slate-400"
          style={{ fontSize: height * 0.24, marginTop: 1 }}
        >
          SEE INSIDE YOUR API
        </span>
      </span>
    </span>
  );
}

export function LogoHorizontal({ height = 32 }: { height?: number }) {
  return <Logo size={height} withWordmark wordmarkClassName="" />;
}
