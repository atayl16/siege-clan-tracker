import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.{test,spec}.{js,jsx}'],
    exclude: [
      'node_modules/',
      'src/setupTests.js',
      'netlify/edge-functions/**',
    ],
    // Use node environment for netlify function tests (not jsdom)
    // and use minimal setup file without React mocks
    environmentMatchGlobs: [
      ['netlify/functions/**/*.test.js', 'node'],
    ],
    setupFiles: (filepath) => {
      // Use minimal setup for netlify function tests (no React mocks)
      if (filepath.includes('netlify/functions/')) {
        return ['./netlify/functions/__tests__/setup.js'];
      }
      // Use React setup for component tests
      return ['./src/setupTests.js'];
    },
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

