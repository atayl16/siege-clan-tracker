import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode (development/production)
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix
  // This helps maintain compatibility with CRA's env variable handling
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        // Include react refresh for development
        fastRefresh: true,
        // Set JSX runtime to automatic
        jsxRuntime: "automatic",
        // JSX in JS files configuration
        include: "**/*.{js,jsx,ts,tsx}",
        // This is important - tell Vite/React plugin to process JSX in JS files
        jsxInJs: true,
        babel: {
          // Add any babel plugins if needed
          plugins: [],
          // Ensure JSX is properly transformed
          presets: [["@babel/preset-react", { runtime: "automatic" }]],
        },
      }),
    ],

    // Add esbuild configuration to process JSX in JS files
    esbuild: {
      include: /src\/.*\.jsx?$/,
      exclude: [],
      jsx: "automatic",
      // Removed jsxInject to avoid duplicate React imports
    },

    // Configure server settings
    server: {
      port: 3000, // Default CRA port
      host: true, // Listen on all addresses
      open: true, // Auto-open browser on start
    },

    // Path resolution and aliases
    resolve: {
      alias: {
        // Set up src/ path alias similar to CRA
        src: path.resolve(__dirname, "./src"),
      },
    },

    // Configure build output to match CRA's structure
    root: process.cwd(),
    build: {
      outDir: "build", // CRA uses 'build' directory
      assetsDir: "static", // Assets will be placed in static/
      emptyOutDir: true, // Clean the output directory before build
      sourcemap: true, // Generate source maps for debugging

      // Configure file naming to match CRA patterns
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
          },
          entryFileNames: "static/js/[name].[hash].js",
          chunkFileNames: "static/js/[name].[hash].js",
          assetFileNames: (assetInfo) => {
            // Organize assets into subdirectories based on type
            const extType = assetInfo.name.split(".").at(1);
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return "static/media/[name].[hash][extname]";
            }
            if (/css/i.test(extType)) {
              return "static/css/[name].[hash][extname]";
            }
            return "static/[ext]/[name].[hash][extname]";
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },

    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
      esbuildOptions: {
        loader: {
          ".js": "jsx",
          ".jsx": "jsx",
        },
      },
    },

    // Define environment variables similar to CRA
    define: {
      // Make env variables available as process.env.X
      // This mimics CRA's environment variable handling
      ...Object.keys(env).reduce((acc, key) => {
        acc[`process.env.${key}`] = JSON.stringify(env[key]);
        return acc;
      }, {}),
    },

    // CSS handling
    css: {
      // Enable CSS modules similar to CRA
      modules: {
        localsConvention: "camelCase",
      },
      // Disable CSS minification (helps avoid the CSS Minimizer error)
      minify: false,
    },

    // Test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      // Exclude integration tests from default test runs
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/*.integration.test.{js,jsx,ts,tsx}' // Exclude integration tests
      ],
    },
  };
});

