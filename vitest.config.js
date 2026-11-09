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
    // Netlify function tests run under node, everything else under jsdom.
    // Vitest 4 removed environmentMatchGlobs, which this used to do; projects
    // are its replacement. Each project inherits the settings below.
    projects: [
      {
        extends: true,
        test: {
          name: 'netlify',
          environment: 'node',
          include: ['netlify/**/*.test.js'],
          exclude: [
            'node_modules/**',
            // Calls Deno.env directly, which does not exist under Node.
            'netlify/edge-functions/__tests__/api-authentication.test.js',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          include: ['**/*.{test,spec}.{js,jsx}'],
          exclude: ['node_modules/**', 'src/setupTests.js', 'tests/smoke/**', 'netlify/**'],
        },
      },
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

