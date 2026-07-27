/**
 * Admin route inventory — CI guard.
 *
 * This file owns the CANONICAL lists of every Express route that uses one of
 * three admin-protection patterns:
 *
 *   1. requireAdmin middleware          → REQUIRE_ADMIN_INVENTORY
 *   2. isAdminCaller() handler guard   → CUSTOM_ADMIN_INVENTORY
 *   3. requireAdminPasscode middleware  → PASSCODE_INVENTORY
 *
 * For each inventory two checks run automatically:
 *
 *   A. Every route found in source appears in the inventory.
 *      → Adding a protected route without updating the list fails CI.
 *
 *   B. Every inventory entry has a matching source route.
 *      → Removing a route without updating the list also fails CI.
 *
 * WHEN YOU ADD A NEW PROTECTED ROUTE:
 *   • Add a matching entry to the correct inventory below.
 *   • Add the route to the corresponding array in admin-auth.test.ts so it
 *     is also covered by positive "passes" and negative "blocked" tests.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Canonical inventory — source of truth for every requireAdmin route.
// Method is lowercase; pattern is the Express path string (with :param tokens).
// ── Keep this in sync with REQUIRE_ADMIN_ROUTES in admin-auth.test.ts ──
// ---------------------------------------------------------------------------
const REQUIRE_ADMIN_INVENTORY: Array<{ method: string; pattern: string }> = [
  { method: "get", pattern: "/admin/accounts" },
  { method: "post", pattern: "/banned-emails" },
  { method: "delete", pattern: "/banned-emails/:email" },
  { method: "put", pattern: "/sport-requests/:publicId" },
  { method: "patch", pattern: "/admin/accounts/:accountPublicId/contact-us" },
  { method: "delete", pattern: "/conversations/:publicId" },
];

// ---------------------------------------------------------------------------
// Canonical inventory — routes with an isAdminCaller() guard as the FIRST
// statement of their handler body (i.e. custom per-handler admin check).
// ── Keep this in sync with CUSTOM_ADMIN_ROUTES in admin-auth.test.ts ──
// ---------------------------------------------------------------------------
const CUSTOM_ADMIN_INVENTORY: Array<{ method: string; pattern: string }> = [
  { method: "delete", pattern: "/wipe" },
  { method: "post", pattern: "/moderator-sessions" },
  { method: "delete", pattern: "/moderator-sessions/:token" },
  { method: "get", pattern: "/reports" },
  { method: "post", pattern: "/reports/:publicId/resolve" },
];

// ---------------------------------------------------------------------------
// Canonical inventory — routes protected by requireAdminPasscode middleware.
// ── Keep this in sync with PASSCODE_ROUTES in admin-auth.test.ts ──
// ---------------------------------------------------------------------------
const PASSCODE_INVENTORY: Array<{ method: string; pattern: string }> = [
  { method: "post", pattern: "/admin/entitlements" },
  { method: "delete", pattern: "/admin/entitlements" },
];

// ---------------------------------------------------------------------------
// Canonical inventory — routes using the combined isAdminCaller +
// hasCloseChatsSession guard (admin-OR-moderator, outside requireAuth).
// ── Keep this in sync with FLAGGED_ROUTES in admin-auth.test.ts ──
// ---------------------------------------------------------------------------
const FLAGGED_INVENTORY: Array<{ method: string; pattern: string }> = [
  { method: "get", pattern: "/conversations/flagged" },
  { method: "post", pattern: "/conversations/:publicId/flag-reviewed" },
];

// ---------------------------------------------------------------------------
// Static scanners — read route source files and extract protected usages.
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const ROUTES_DIR = resolve(__dir, "../routes");

interface FoundRoute {
  method: string;
  pattern: string;
  file: string;
}

function scanForRequireAdminRoutes(dir: string): FoundRoute[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  const found: FoundRoute[] = [];

  // Matches: router.METHOD("path", requireAdmin, ...) or with single quotes.
  // The requireAdmin token must immediately follow the path argument.
  const re =
    /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']\s*,\s*requireAdmin\b/g;

  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf-8");
    let match: RegExpExecArray | null;
    re.lastIndex = 0; // reset before each file
    while ((match = re.exec(content)) !== null) {
      found.push({ method: match[1], pattern: match[2], file });
    }
  }

  return found;
}

function scanForCustomAdminRoutes(dir: string): FoundRoute[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  const found: FoundRoute[] = [];

  // Matches routes whose handler body starts immediately with:
  //   if (!isAdminCaller(req)) {
  // The [^{]* skips the arrow-function parameters (which contain no `{`).
  // This intentionally excludes routes where isAdminCaller is used for
  // field-level access control mid-handler rather than as a primary gate.
  const re =
    /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["'][^{]*\{\s*if\s*\(!isAdminCaller\(/gs;

  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf-8");
    let match: RegExpExecArray | null;
    re.lastIndex = 0; // reset before each file
    while ((match = re.exec(content)) !== null) {
      found.push({ method: match[1], pattern: match[2], file });
    }
  }

  return found;
}

function scanForPasscodeRoutes(dir: string): FoundRoute[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  const found: FoundRoute[] = [];

  // Matches: router.METHOD("path", requireAdminPasscode, ...)
  // The requireAdminPasscode token must immediately follow the path argument.
  const re =
    /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']\s*,\s*requireAdminPasscode\b/g;

  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf-8");
    let match: RegExpExecArray | null;
    re.lastIndex = 0; // reset before each file
    while ((match = re.exec(content)) !== null) {
      found.push({ method: match[1], pattern: match[2], file });
    }
  }

  return found;
}

function scanForFlaggedConversationRoutes(dir: string): FoundRoute[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  const found: FoundRoute[] = [];

  // Matches routes whose handler body opens with the combined admin-OR-moderator
  // pattern: `const <var> = isAdminCaller(` as the first statement after the
  // opening brace.  This is distinct from pure-admin custom routes, which start
  // with `if (!isAdminCaller(`, and allows the static scanner to enforce that
  // the combined guard is never silently removed.
  const re =
    /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["'][^{]*\{\s*const \w+ = isAdminCaller\(/gs;

  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf-8");
    let match: RegExpExecArray | null;
    re.lastIndex = 0; // reset before each file
    while ((match = re.exec(content)) !== null) {
      found.push({ method: match[1], pattern: match[2], file });
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// Generic helper — builds the two-way check describe block for any inventory.
// ---------------------------------------------------------------------------

function buildInventoryTests(
  label: string,
  inventory: Array<{ method: string; pattern: string }>,
  sourceRoutes: FoundRoute[],
  guardName: string,
  authTestArrayName: string,
) {
  const inventorySet = new Set(inventory.map((r) => `${r.method}:${r.pattern}`));
  const sourceSet = new Set(sourceRoutes.map((r) => `${r.method}:${r.pattern}`));

  describe(`${label} — every route in source is listed in the inventory`, () => {
    if (sourceRoutes.length === 0) {
      it(`found at least one ${guardName} route in source`, () => {
        // If this fails, the scanner regex may be broken or the routes dir moved.
        expect(sourceRoutes.length).toBeGreaterThan(0);
      });
    }

    for (const { method, pattern, file } of sourceRoutes) {
      it(`${method.toUpperCase()} ${pattern} (${file})`, () => {
        expect(
          inventorySet.has(`${method}:${pattern}`),
          [
            `Route ${method.toUpperCase()} ${pattern} in ${file} uses ${guardName} but`,
            `is NOT listed in the ${label} inventory in admin-route-inventory.test.ts.`,
            `Add it to the inventory AND to ${authTestArrayName} in admin-auth.test.ts`,
            `so it is covered by positive "passes" and negative "blocked" tests.`,
          ].join(" "),
        ).toBe(true);
      });
    }
  });

  it(`${label} — inventory has no phantom entries (every listed route exists in source)`, () => {
    const phantoms = inventory.filter((r) => !sourceSet.has(`${r.method}:${r.pattern}`));
    expect(
      phantoms,
      [
        `These ${label} inventory entries have no matching ${guardName} route`,
        `in the source files — they are stale and should be removed:`,
        phantoms.map((r) => `  ${r.method.toUpperCase()} ${r.pattern}`).join("\n"),
      ].join(" "),
    ).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

buildInventoryTests(
  "requireAdmin route inventory",
  REQUIRE_ADMIN_INVENTORY,
  scanForRequireAdminRoutes(ROUTES_DIR),
  "requireAdmin",
  "REQUIRE_ADMIN_ROUTES",
);

buildInventoryTests(
  "isAdminCaller route inventory",
  CUSTOM_ADMIN_INVENTORY,
  scanForCustomAdminRoutes(ROUTES_DIR),
  "isAdminCaller()",
  "CUSTOM_ADMIN_ROUTES",
);

buildInventoryTests(
  "requireAdminPasscode route inventory",
  PASSCODE_INVENTORY,
  scanForPasscodeRoutes(ROUTES_DIR),
  "requireAdminPasscode",
  "PASSCODE_ROUTES",
);

buildInventoryTests(
  "flagged-conversation route inventory",
  FLAGGED_INVENTORY,
  scanForFlaggedConversationRoutes(ROUTES_DIR),
  "isAdminCaller()+hasCloseChatsSession()",
  "FLAGGED_ROUTES",
);
