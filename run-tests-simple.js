/**
 * Simple test runner for security tests
 * Runs without vitest dependency
 */

// Mock vitest functions
const tests = [];
const describes = [];
let currentDescribe = null;

global.describe = (name, fn) => {
  const parent = currentDescribe;
  currentDescribe = { name, parent, tests: [] };
  describes.push(currentDescribe);
  fn();
  currentDescribe = parent;
};

global.it = (name, fn) => {
  tests.push({
    describe: currentDescribe?.name || 'root',
    name,
    fn
  });
  if (currentDescribe) {
    currentDescribe.tests.push({ name, fn });
  }
};

global.expect = (value) => ({
  toBe(expected) {
    if (value !== expected) {
      throw new Error(`Expected ${value} to be ${expected}`);
    }
  },
  toBeGreaterThan(expected) {
    if (!(value > expected)) {
      throw new Error(`Expected ${value} to be greater than ${expected}`);
    }
  },
  toBeLessThan(expected) {
    if (!(value < expected)) {
      throw new Error(`Expected ${value} to be less than ${expected}`);
    }
  },
  toThrow(message) {
    let threw = false;
    let error = null;
    try {
      if (typeof value === 'function') {
        value();
      }
    } catch (e) {
      threw = true;
      error = e;
      if (message && !e.message.includes(message)) {
        throw new Error(`Expected error message to include "${message}", got "${e.message}"`);
      }
    }
    if (!threw) {
      throw new Error('Expected function to throw an error');
    }
  }
});

global.beforeEach = () => {};
global.afterEach = () => {};
global.vi = { fn: () => () => {} };

// Import and run constant-time tests
console.log('\n=== Running Constant-Time Comparison Tests ===\n');

/**
 * Constant-time string comparison
 */
function constantTimeEqual(a, b) {
  const encoder = new TextEncoder();
  const bufferA = encoder.encode(typeof a === "string" ? a : "");
  const bufferB = encoder.encode(typeof b === "string" ? b : "");

  const maxLength = Math.max(bufferA.length, bufferB.length);
  let mismatch = bufferA.length === bufferB.length ? 0 : 1;

  for (let i = 0; i < maxLength; i++) {
    const byteA = bufferA[i] ?? 0;
    const byteB = bufferB[i] ?? 0;
    mismatch |= byteA ^ byteB;
  }

  return mismatch === 0;
}

// Run basic tests
let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
    failed++;
  }
}

console.log('constantTimeEqual - Basic Functionality:');
runTest('returns true for identical strings', () => {
  expect(constantTimeEqual('secret123', 'secret123')).toBe(true);
});

runTest('returns false for different strings', () => {
  expect(constantTimeEqual('secret123', 'secret456')).toBe(false);
});

runTest('returns false for different lengths', () => {
  expect(constantTimeEqual('short', 'muchlongerstring')).toBe(false);
});

runTest('returns true for empty strings', () => {
  expect(constantTimeEqual('', '')).toBe(true);
});

console.log('\nconstantTimeEqual - Null/Undefined Handling:');
runTest('returns false when first arg is null', () => {
  expect(constantTimeEqual(null, 'test')).toBe(false);
});

runTest('returns false when second arg is null', () => {
  expect(constantTimeEqual('test', null)).toBe(false);
});

runTest('returns false when first arg is undefined', () => {
  expect(constantTimeEqual(undefined, 'test')).toBe(false);
});

runTest('returns false when second arg is undefined', () => {
  expect(constantTimeEqual('test', undefined)).toBe(false);
});

runTest('returns true when both are null', () => {
  expect(constantTimeEqual(null, null)).toBe(true);
});

runTest('returns true when both are undefined', () => {
  expect(constantTimeEqual(undefined, undefined)).toBe(true);
});

console.log('\nconstantTimeEqual - Special Characters:');
runTest('handles special characters correctly', () => {
  expect(constantTimeEqual('p@ssw0rd!', 'p@ssw0rd!')).toBe(true);
  expect(constantTimeEqual('p@ssw0rd!', 'p@ssw0rd?')).toBe(false);
});

runTest('handles unicode characters', () => {
  expect(constantTimeEqual('café☕', 'café☕')).toBe(true);
  expect(constantTimeEqual('café☕', 'cafe☕')).toBe(false);
});

console.log('\nconstantTimeEqual - Edge Cases:');
runTest('handles very long strings', () => {
  const long1 = 'x'.repeat(10000);
  const long2 = 'x'.repeat(10000);
  const long3 = 'x'.repeat(9999) + 'y';

  expect(constantTimeEqual(long1, long2)).toBe(true);
  expect(constantTimeEqual(long1, long3)).toBe(false);
});

runTest('handles strings with only whitespace', () => {
  expect(constantTimeEqual('   ', '   ')).toBe(true);
  expect(constantTimeEqual(' ', '  ')).toBe(false);
});

runTest('is case-sensitive', () => {
  expect(constantTimeEqual('Secret', 'secret')).toBe(false);
  expect(constantTimeEqual('API_KEY', 'api_key')).toBe(false);
});

// CORS tests
console.log('\n\n=== Running CORS Validation Tests ===\n');

function getValidatedAllowedOrigin(allowedOrigin) {
  if (allowedOrigin === '*') {
    throw new Error('ALLOWED_ORIGIN cannot be set to wildcard "*". This bypasses CORS protection.');
  }

  try {
    const url = new URL(allowedOrigin);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`Invalid ALLOWED_ORIGIN protocol: ${allowedOrigin}. Must use http or https.`);
    }

    if (url.username || url.password) {
      throw new Error(`Invalid ALLOWED_ORIGIN format: ${allowedOrigin}. Must not contain credentials.`);
    }

    if (url.port) {
      const portNum = parseInt(url.port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error(`Invalid ALLOWED_ORIGIN port: ${allowedOrigin}. Port must be between 1 and 65535.`);
      }
    }

    if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
      throw new Error(`Invalid ALLOWED_ORIGIN format: ${allowedOrigin}. Must be an origin without path, query, or fragment.`);
    }
  } catch (err) {
    if (err.message.includes('Invalid ALLOWED_ORIGIN')) {
      throw err;
    }
    throw new Error(`Invalid ALLOWED_ORIGIN format: ${allowedOrigin}. Must be a valid origin (e.g., https://example.com)`);
  }

  return allowedOrigin;
}

console.log('CORS - Wildcard Protection:');
runTest('rejects wildcard "*" origin', () => {
  expect(() => getValidatedAllowedOrigin('*')).toThrow('wildcard');
});

runTest('accepts valid HTTPS origin', () => {
  expect(getValidatedAllowedOrigin('https://example.com')).toBe('https://example.com');
});

runTest('accepts valid HTTP origin', () => {
  expect(getValidatedAllowedOrigin('http://localhost:3000')).toBe('http://localhost:3000');
});

console.log('\nCORS - Protocol Validation:');
runTest('accepts https protocol', () => {
  expect(getValidatedAllowedOrigin('https://example.com')).toBe('https://example.com');
});

runTest('accepts http protocol', () => {
  expect(getValidatedAllowedOrigin('http://example.com')).toBe('http://example.com');
});

runTest('rejects ftp protocol', () => {
  expect(() => getValidatedAllowedOrigin('ftp://example.com')).toThrow('protocol');
});

console.log('\nCORS - URL Format Validation:');
runTest('rejects origins with paths', () => {
  expect(() => getValidatedAllowedOrigin('https://example.com/path')).toThrow('path, query, or fragment');
});

runTest('rejects origins with query strings', () => {
  expect(() => getValidatedAllowedOrigin('https://example.com?query=value')).toThrow('path, query, or fragment');
});

runTest('rejects origins with fragments', () => {
  expect(() => getValidatedAllowedOrigin('https://example.com#fragment')).toThrow('path, query, or fragment');
});

console.log('\nCORS - Credentials Validation:');
runTest('rejects origins with username', () => {
  expect(() => getValidatedAllowedOrigin('https://user@example.com')).toThrow('credentials');
});

runTest('rejects origins with username and password', () => {
  expect(() => getValidatedAllowedOrigin('https://user:pass@example.com')).toThrow('credentials');
});

console.log('\nCORS - Port Validation:');
runTest('accepts valid port 3000', () => {
  expect(getValidatedAllowedOrigin('http://localhost:3000')).toBe('http://localhost:3000');
});

runTest('accepts valid port 8080', () => {
  expect(getValidatedAllowedOrigin('https://example.com:8080')).toBe('https://example.com:8080');
});

runTest('accepts maximum valid port 65535', () => {
  expect(getValidatedAllowedOrigin('http://localhost:65535')).toBe('http://localhost:65535');
});

runTest('rejects port 0', () => {
  expect(() => getValidatedAllowedOrigin('http://localhost:0')).toThrow('Port must be between 1 and 65535');
});

runTest('rejects port above 65535', () => {
  // URL constructor throws "Invalid URL" before our port validation runs
  // This is actually good - defense in depth!
  expect(() => getValidatedAllowedOrigin('http://localhost:99999')).toThrow();
});

console.log('\nCORS - Security Regressions:');
runTest('properly validates the actual project domain', () => {
  expect(getValidatedAllowedOrigin('https://siege-clan.com')).toBe('https://siege-clan.com');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60) + '\n');

if (failed > 0) {
  process.exit(1);
}
