import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Separate from vite.config.ts on purpose: the app build has no business
 * loading jsdom, coverage instrumentation, or test-only reporters.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      // jsdom only implements localStorage for a real (non-opaque) origin.
      jsdom: { url: 'http://localhost/' },
    },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    reporters: ['default', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './test-results/coverage',
      include: ['src/services/**/*.ts', 'src/utils/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**'],
    },
  },
});
