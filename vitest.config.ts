import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 75,
        branches: 65,
        functions: 65,
        statements: 75,
        'src/share/shareService.ts': { lines: 90 },
        'src/share/project.ts': { lines: 90 },
        'src/model/specDiff.ts': { lines: 80 },
        'src/utils/workspaceStore.ts': { lines: 90 },
      },
      include: [
        'src/parser/**',
        'src/share/**',
        'src/model/**',
        'src/hooks/useSpecState.ts',
        'src/hooks/useSharePreparation.ts',
        'src/utils/workspaceStore.ts',
        'src/workers/**',
        'src/ui/CurlGenerator.tsx',
        'src/ui/EndpointExplorer.tsx',
        'src/ui/ShareDialog.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
