import { HttpMethod } from './index';

export interface MethodConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  darkBg: string;
  accent: string;
}

export const HTTP_METHODS: Record<HttpMethod, MethodConfig> = {
  get: {
    label: 'GET',
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500',
    badgeBg: 'bg-emerald-500 text-white',
    darkBg: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
    accent: '#10b981',
  },
  post: {
    label: 'POST',
    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500',
    badgeBg: 'bg-blue-500 text-white',
    darkBg: 'bg-blue-950/40 text-blue-300 border-blue-800/60',
    accent: '#3b82f6',
  },
  put: {
    label: 'PUT',
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500',
    badgeBg: 'bg-amber-500 text-white',
    darkBg: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
    accent: '#f59e0b',
  },
  delete: {
    label: 'DELETE',
    bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500',
    badgeBg: 'bg-red-500 text-white',
    darkBg: 'bg-red-950/40 text-red-300 border-red-800/60',
    accent: '#ef4444',
  },
  patch: {
    label: 'PATCH',
    bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500',
    badgeBg: 'bg-cyan-500 text-white',
    darkBg: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60',
    accent: '#06b6d4',
  },
  options: {
    label: 'OPTIONS',
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500',
    badgeBg: 'bg-purple-500 text-white',
    darkBg: 'bg-purple-950/40 text-purple-300 border-purple-800/60',
    accent: '#8b5cf6',
  },
  head: {
    label: 'HEAD',
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500',
    badgeBg: 'bg-slate-500 text-white',
    darkBg: 'bg-slate-950/40 text-slate-300 border-slate-800/60',
    accent: '#64748b',
  },
  trace: {
    label: 'TRACE',
    bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-500',
    badgeBg: 'bg-pink-500 text-white',
    darkBg: 'bg-pink-950/40 text-pink-300 border-pink-800/60',
    accent: '#ec4899',
  },
};

export function getMethodConfig(method: string): MethodConfig {
  const m = (method || '').toLowerCase() as HttpMethod;
  if (HTTP_METHODS[m]) {
    return HTTP_METHODS[m];
  }
  return {
    label: (method || 'UNKNOWN').toUpperCase(),
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500',
    badgeBg: 'bg-slate-500 text-white',
    darkBg: 'bg-slate-950/40 text-slate-300 border-slate-800/60',
    accent: '#64748b',
  };
}

export function getStatusCategory(code: string | number): {
  color: string;
  bg: string;
  border: string;
  label: string;
} {
  let codeNum: number;
  if (typeof code === 'number') {
    codeNum = code;
  } else {
    const s = String(code).trim().toLowerCase();
    if (s === '2xx') codeNum = 200;
    else if (s === '3xx') codeNum = 300;
    else if (s === '4xx') codeNum = 400;
    else if (s === '5xx') codeNum = 500;
    else if (s === '1xx') codeNum = 100;
    else codeNum = parseInt(s, 10);
  }

  if (isNaN(codeNum)) {
    return {
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800/50',
      border: 'border-slate-300 dark:border-slate-700',
      label: 'Default',
    };
  }

  if (codeNum >= 200 && codeNum < 300) {
    return {
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      label: 'Success',
    };
  }
  if (codeNum >= 300 && codeNum < 400) {
    return {
      color: 'text-sky-700 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      border: 'border-sky-200 dark:border-sky-800/60',
      label: 'Redirect',
    };
  }
  if (codeNum >= 400 && codeNum < 500) {
    return {
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800/60',
      label: 'Client Error',
    };
  }
  if (codeNum >= 500) {
    return {
      color: 'text-red-700 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-200 dark:border-red-800/60',
      label: 'Server Error',
    };
  }

  return {
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    border: 'border-slate-300 dark:border-slate-700',
    label: 'Info',
  };
}
