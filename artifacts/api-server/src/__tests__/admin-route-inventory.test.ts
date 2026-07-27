/**
 * requireAdmin route inventory — CI guard.
 *
 * This file owns the CANONICAL list of every Express route that uses the
 * `requireAdmin` middleware.  Two checks run automatically:
 *
 *   1. Every route found in the source files appears in REQUIRE_ADMIN_INVENTORY.
 *      → Adding a new requireAdmin route without updating this list fails CI.
 *
 *   2. Every entry in REQUIRE_ADMIN_INVENTORY has a matching source route.
 *      → Removing a route without updating this list also fails CI.
 *
 * WHEN YOU ADD A NEW requireAdmin ROUTE:
 *   • Add a matching entry here (method + Express path pattern).
 *   • Add the route to REQUIRE_ADMIN_ROUTES in admin-auth.test.ts so it is
 *     also covered by the positive "admin passes" and negative "non-admin blocked"
 *     integration tests.
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
// Static scanner — reads route source files and extracts requireAdmin usages.
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("requireAdmin route inventory", () => {
  const sourceRoutes = scanForRequireAdminRoutes(ROUTES_DIR);

  const inventorySet = new Set(
    REQUIRE_ADMIN_INVENTORY.map((r) => `${r.method}:${r.pattern}`),
  );
  const sourceSet = new Set(
    sourceRoutes.map((r) => `${r.method}:${r.pattern}`),
  );

  // ── Check 1: every route found in source is listed in the inventory ──────
  describe("every requireAdmin route in source is listed in the inventory", () => {
    if (sourceRoutes.length === 0) {
      it("found at least one requireAdmin route in source", () => {
        // If this fails, the scanner regex may be broken or the routes dir moved.
        expect(sourceRoutes.length).toBeGreaterThan(0);
      });
    }

    for (const { method, pattern, file } of sourceRoutes) {
      it(`${method.toUpperCase()} ${pattern} (${file})`, () => {
        expect(
          inventorySet.has(`${method}:${pattern}`),
          [
            `Route ${method.toUpperCase()} ${pattern} in ${file} uses requireAdmin but`,
            `is NOT listed in REQUIRE_ADMIN_INVENTORY in admin-route-inventory.test.ts.`,
            `Add it to the inventory AND to REQUIRE_ADMIN_ROUTES in admin-auth.test.ts`,
            `so it is covered by positive "admin passes" and negative "blocked" tests.`,
          ].join(" "),
        ).toBe(true);
      });
    }
  });

  // ── Check 2: every inventory entry has a matching source route ───────────
  it("inventory has no phantom entries (every listed route exists in source)", () => {
    const phantoms = REQUIRE_ADMIN_INVENTORY.filter(
      (r) => !sourceSet.has(`${r.method}:${r.pattern}`),
    );
    expect(
      phantoms,
      [
        `These REQUIRE_ADMIN_INVENTORY entries have no matching requireAdmin route`,
        `in the source files — they are stale and should be removed:`,
        phantoms.map((r) => `  ${r.method.toUpperCase()} ${r.pattern}`).join("\n"),
      ].join(" "),
    ).toHaveLength(0);
  });
});
