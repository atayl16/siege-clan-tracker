import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    // Only run integration tests
    include: ['src/__tests__/*.integration.test.{js,jsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
});
