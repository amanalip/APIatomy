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
    bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    text: 'text-emerald-500 dark:text-emerald-400',
    border: 'border-emerald-500',
    badgeBg: 'bg-emerald-500 text-white',
    darkBg: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
    accent: '#10b981',
  },
  post: {
    label: 'POST',
    bg: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    text: 'text-blue-500 dark:text-blue-400',
    border: 'border-blue-500',
    badgeBg: 'bg-blue-500 text-white',
    darkBg: 'bg-blue-950/40 text-blue-300 border-blue-800/60',
    accent: '#3b82f6',
  },
  put: {
    label: 'PUT',
    bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    text: 'text-amber-500 dark:text-amber-400',
    border: 'border-amber-500',
    badgeBg: 'bg-amber-500 text-white',
    darkBg: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
    accent: '#f59e0b',
  },
  delete: {
    label: 'DELETE',
    bg: 'bg-red-500/10 text-red-500 border-red-500/30',
    text: 'text-red-500 dark:text-red-400',
    border: 'border-red-500',
    badgeBg: 'bg-red-500 text-white',
    darkBg: 'bg-red-950/40 text-red-300 border-red-800/60',
    accent: '#ef4444',
  },
  patch: {
    label: 'PATCH',
    bg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
    text: 'text-cyan-500 dark:text-cyan-400',
    border: 'border-cyan-500',
    badgeBg: 'bg-cyan-500 text-white',
    darkBg: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60',
    accent: '#06b6d4',
  },
  options: {
    label: 'OPTIONS',
    bg: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    text: 'text-purple-500 dark:text-purple-400',
    border: 'border-purple-500',
    badgeBg: 'bg-purple-500 text-white',
    darkBg: 'bg-purple-950/40 text-purple-300 border-purple-800/60',
    accent: '#8b5cf6',
  },
  head: {
    label: 'HEAD',
    bg: 'bg-slate-500/10 text-slate-500 border-slate-500/30',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-500',
    badgeBg: 'bg-slate-500 text-white',
    darkBg: 'bg-slate-950/40 text-slate-300 border-slate-800/60',
    accent: '#64748b',
  },
  trace: {
    label: 'TRACE',
    bg: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
    text: 'text-pink-500 dark:text-pink-400',
    border: 'border-pink-500',
    badgeBg: 'bg-pink-500 text-white',
    darkBg: 'bg-pink-950/40 text-pink-300 border-pink-800/60',
    accent: '#ec4899',
  },
};

export function getStatusCategory(code: string | number): {
  color: string;
  bg: string;
  border: string;
  label: string;
} {
  const codeNum = typeof code === 'number' ? code : parseInt(code, 10);
  if (isNaN(codeNum)) {
    return {
      color: 'text-slate-400',
      bg: 'bg-slate-800/50',
      border: 'border-slate-700',
      label: 'Default',
    };
  }

  if (codeNum >= 200 && codeNum < 300) {
    return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-800/60',
      label: 'Success',
    };
  }
  if (codeNum >= 300 && codeNum < 400) {
    return {
      color: 'text-sky-400',
      bg: 'bg-sky-950/40',
      border: 'border-sky-800/60',
      label: 'Redirect',
    };
  }
  if (codeNum >= 400 && codeNum < 500) {
    return {
      color: 'text-amber-400',
      bg: 'bg-amber-950/40',
      border: 'border-amber-800/60',
      label: 'Client Error',
    };
  }
  if (codeNum >= 500) {
    return {
      color: 'text-red-400',
      bg: 'bg-red-950/40',
      border: 'border-red-800/60',
      label: 'Server Error',
    };
  }

  return {
    color: 'text-slate-400',
    bg: 'bg-slate-800/50',
    border: 'border-slate-700',
    label: 'Info',
  };
}
