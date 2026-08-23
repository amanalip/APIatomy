/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        method: {
          get: '#10b981',      // emerald-500
          post: '#3b82f6',     // blue-500
          put: '#f59e0b',      // amber-500
          delete: '#ef4444',   // red-500
          patch: '#06b6d4',    // cyan-500
          options: '#8b5cf6',  // purple-500
          head: '#6b7280',     // gray-500
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [],
}
