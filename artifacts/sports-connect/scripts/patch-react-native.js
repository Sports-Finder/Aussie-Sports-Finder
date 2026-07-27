/**
 * Patches all react-native files that use private class fields (#name)
 * which hermesc on the iOS 26 SDK rejects with "private properties are
 * not supported".
 *
 * Strategy: simple regex — replace every #privateName reference with
 * _privateName.  Babel strips Flow type annotations before hermesc sees
 * the code, so the only thing that matters is that no `#` field syntax
 * reaches hermesc.
 *
 * Runs automatically via `postinstall` so EAS applies it after every
 * `pnpm install`.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Locate react-native root
// ---------------------------------------------------------------------------
let rnRoot;
try {
  rnRoot = path.dirname(require.resolve('react-native/package.json'));
} catch (e) {
  console.log('[patch-rn] react-native not found — skipping.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Files known to contain private class fields in react-native 0.81.x
// ---------------------------------------------------------------------------
const TARGETS = [
  // geometry
  'src/private/webapis/geometry/DOMRectReadOnly.js',
  'src/private/webapis/geometry/DOMRectList.js',
  // DOM collections
  'src/private/webapis/dom/oldstylecollections/HTMLCollection.js',
  'src/private/webapis/dom/oldstylecollections/NodeList.js',
  // errors
  'src/private/webapis/errors/DOMException.js',
  // performance
  'src/private/webapis/performance/EventTiming.js',
  'src/private/webapis/performance/MemoryInfo.js',
  'src/private/webapis/performance/PerformanceEntry.js',
  'src/private/webapis/performance/PerformanceObserver.js',
  'src/private/webapis/performance/ReactNativeStartupTiming.js',
  'src/private/webapis/performance/ResourceTiming.js',
  'src/private/webapis/performance/UserTiming.js',
  // dev support
  'src/private/devsupport/rndevtools/FuseboxSessionObserver.js',
  'src/private/devsupport/rndevtools/setUpFuseboxReactDevToolsDispatcher.js',
];

// ---------------------------------------------------------------------------
// Also do a broad scan for any files we missed
// ---------------------------------------------------------------------------
function scanForPrivateFields(dir) {
  const extra = [];
  if (!fs.existsSync(dir)) return extra;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.js')) {
        const src = fs.readFileSync(full, 'utf8');
        if (/\B#[a-zA-Z_]/.test(src)) {
          const rel = path.relative(rnRoot, full);
          if (!TARGETS.includes(rel)) extra.push(rel);
        }
      }
    }
  };
  walk(dir);
  return extra;
}

const extra = scanForPrivateFields(path.join(rnRoot, 'src/private'));
if (extra.length > 0) {
  console.log('[patch-rn] Found additional files with private fields:', extra);
}

const allTargets = [...TARGETS, ...extra];

// ---------------------------------------------------------------------------
// Patch each file: replace #privateName with _privateName everywhere
// ---------------------------------------------------------------------------
let patched = 0;
let skipped = 0;

for (const rel of allTargets) {
  const full = path.join(rnRoot, rel);
  if (!fs.existsSync(full)) {
    console.log(`[patch-rn] Not found, skipping: ${rel}`);
    continue;
  }
  const original = fs.readFileSync(full, 'utf8');
  if (!/\B#[a-zA-Z_]/.test(original)) {
    skipped++;
    continue;
  }
  // Replace every #fieldName / #methodName with _fieldName / _methodName.
  // \B ensures we only match # that is NOT at a word boundary (i.e. private
  // field syntax), not # in comments or unrelated contexts.
  const fixed = original.replace(/\B#([a-zA-Z_][a-zA-Z0-9_]*)/g, '_$1');
  fs.writeFileSync(full, fixed, 'utf8');
  console.log(`[patch-rn] Patched: ${rel}`);
  patched++;
}

console.log(`[patch-rn] Done. Patched ${patched} file(s), skipped ${skipped} already-clean file(s).`);
