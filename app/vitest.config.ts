import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Mirrors the `@/*` -> `src/*` path alias from tsconfig.json so tests resolve
// the same imports the app uses. jsdom provides a DOM for store/component tests.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
