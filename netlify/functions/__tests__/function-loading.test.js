import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

/**
 * Guards the failure that took every admin write offline in production:
 * the functions were CommonJS while package.json sets "type": "module", so
 * Node refused to load them and Netlify returned a 502 before the handler
 * ever ran. Nothing in the suite noticed, because no test loaded a function
 * the way the deployed runtime does.
 *
 * These tests deliberately shell out to a real `node` process instead of
 * importing through Vitest. Vite transforms modules on the way in and will
 * happily accept CommonJS in a .js file, so an in-process import would pass
 * against exactly the code that 502s on Netlify. Only raw Node reproduces
 * the runtime's module resolution.
 */

const FUNCTIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Not a Netlify function: no handler, nothing routes to it. The job that runs
// daily is scripts/sync-tasks/anniversaries.cjs. Left in place because this
// copy carries the Feb-29 leap-year fix the running script lacks.
const NOT_A_FUNCTION = ['anniversaries.js'];

function functionFiles() {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(js|mjs|cjs)$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

// Module scope runs at import time, and the admin functions call
// validateEnvironment() there, so loading needs these present. The values are
// never dialled - createClient does not open a connection when constructed.
const STUB_ENV = {
  ...process.env,
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'stub-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'stub-service-key',
};

/** Load a function in a real Node process, the way the Lambda runtime does. */
function loadInNode(file, script) {
  const url = pathToFileURL(resolve(FUNCTIONS_DIR, file)).href;
  return execFileSync(
    process.execPath,
    ['--input-type=module', '-e', `const mod = await import(${JSON.stringify(url)});\n${script}`],
    { env: STUB_ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  ).trim();
}

describe('Netlify function modules', () => {
  const files = functionFiles();

  it('finds the function files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // A CommonJS .js file under "type": "module" throws here, exactly as it did
  // in production, and execFileSync turns that non-zero exit into a failure.
  it.each(files)('%s loads in the deployed runtime', (file) => {
    expect(loadInNode(file, 'console.log("loaded");')).toBe('loaded');
  });

  it.each(files.filter((f) => !NOT_A_FUNCTION.includes(f)))(
    '%s exports a callable handler',
    (file) => {
      const script = `
        const handler = mod.handler ?? mod.default?.handler;
        console.log(typeof handler);
      `;
      expect(loadInNode(file, script)).toBe('function');
    }
  );
});

describe('Admin functions reject unauthenticated requests', () => {
  const adminFiles = functionFiles().filter((f) => f.startsWith('admin-'));

  it('finds the admin functions', () => {
    expect(adminFiles.length).toBeGreaterThan(0);
  });

  // Proves the module loads *and* runs: a 502 at load time produces no status
  // at all. Auth is rejected before any network call, so this needs no database.
  it.each(adminFiles)('%s returns 401 without an Authorization header', (file) => {
    const script = `
      const handler = mod.handler ?? mod.default?.handler;
      const res = await handler(
        { httpMethod: 'POST', headers: { origin: 'http://localhost:8888' }, body: '{}' },
        {}
      );
      console.log(res.statusCode);
    `;
    expect(loadInNode(file, script)).toBe('401');
  });
});
