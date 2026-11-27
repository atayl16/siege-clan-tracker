// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import { resolve, dirname, relative, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

/**
 * The GitHub Actions scripts load some of the site's own modules from src/
 * (rank rules, XP weeks, weekly titles) in plain Node. Node needs the file
 * extension on a relative import; Vite does not, so an `import ... from
 * "./numbers"` added for the site builds and passes every unit test, then
 * fails the hourly sync. That happened in Nov 2026: Announce Rank-ups broke
 * and failed every hourly run.
 *
 * As in netlify/functions/__tests__/function-loading.test.js, this shells out
 * to a real `node` process on purpose: Vitest resolves extensionless imports,
 * so an in-process import would pass against the code that fails in Actions.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPTS_DIR = join(ROOT, 'scripts');

function scriptFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : scriptFiles(path);
    return /\.(js|mjs|cjs)$/.test(entry.name) ? [path] : [];
  });
}

/** Every module under src/ that a script imports, static or dynamic. */
function srcModulesUsedByScripts() {
  const found = new Set();
  for (const file of scriptFiles(SCRIPTS_DIR)) {
    const source = readFileSync(file, 'utf8');
    const specifiers = source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)['"](\.[^'"]*\/src\/[^'"]+)['"]/g);
    for (const [, specifier] of specifiers) {
      found.add(relative(ROOT, resolve(dirname(file), specifier)));
    }
  }
  return [...found].sort();
}

function loadInNode(file) {
  const url = pathToFileURL(join(ROOT, file)).href;
  return execFileSync(
    process.execPath,
    ['--input-type=module', '-e', `await import(${JSON.stringify(url)}); console.log('loaded');`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  ).trim();
}

describe('src/ modules loaded by the Actions scripts', () => {
  const modules = srcModulesUsedByScripts();

  it('finds the modules the scripts import', () => {
    expect(modules).toContain('src/utils/rankUtils.js');
  });

  it.each(modules)('%s loads in plain Node', (file) => {
    expect(loadInNode(file)).toBe('loaded');
  });
});
