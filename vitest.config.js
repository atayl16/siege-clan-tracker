import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    include: ['**/*.{test,spec}.{js,jsx}'],
    exclude: [
      'node_modules/',
      'src/setupTests.js',
      // Calls Deno.env directly, which does not exist under Node.
      'netlify/edge-functions/__tests__/api-authentication.test.js',
      'tests/smoke/**',
    ],
    // Use node environment for netlify function tests (not jsdom)
    environmentMatchGlobs: [
      ['netlify/functions/**/*.test.js', 'node'],
      ['netlify/edge-functions/**/*.test.js', 'node'],
    ],
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/setupTests.js'],
    },
  },
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),
    },
  },
});

