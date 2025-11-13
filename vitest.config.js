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
      'netlify/edge-functions/**',
      '**/*.integration.test.{js,jsx}', // Exclude integration tests from default runs
    ],
    // Use node environment for netlify function tests (not jsdom)
    environmentMatchGlobs: [
      ['netlify/functions/**/*.test.js', 'node'],
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

