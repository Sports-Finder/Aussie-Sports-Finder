/**
 * Admin authorisation integration tests.
 *
 * SINGLE ROUTE INVENTORY — every admin-protected API route must appear in one
 * of the four arrays below. When a new admin route is added, add it here too.
 *
 * Checks performed:
 *   requireAdmin routes (behind requireAuth):
 *     • unauthenticated caller → 401  (from requireAuth)
 *     • authenticated non-admin → 403  (from requireAdmin middleware)
 *
 *   requireAdminPasscode routes (outside requireAuth):
 *     • no X-Admin-Passcode header → 401
 *     • wrong passcode → 403
 *     • correct passcode → NOT 401/403  (auth accepted; handler may 4xx for other reasons)
 *
 *   customAdminCaller routes (custom isAdminCaller() check, behind requireAuth):
 *     • unauthenticated → 401  (from requireAuth)
 *     • authenticated non-admin → 403  (from handler guard)
 *
 *   flaggedConversations routes (custom check, outside requireAuth):
 *     • no auth, no moderator token → 403
 *     • Clerk admin caller → NOT 401/403
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Module mocks — vi.mock() calls are hoisted before any import resolution.
// All helpers the factories need must be self-contained inside each factory.
// ---------------------------------------------------------------------------

vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    (_opts?: unknown) =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
  getAuth: vi.fn(() => ({ userId: null, sessionId: null })),
}));

vi.mock("@clerk/shared/keys", () => ({
  publishableKeyFromHost: () => "pk_test_mock",
}));

// Suppress pino-pretty worker threads in tests; inject a no-op req.log.
vi.mock("pino-http", () => ({
  default:
    () =>
    (req: Record<string, unknown>, _res: unknown, next: () => void) => {
      req["log"] = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
      };
      next();
    },
}));

// Mock @workspace/db — no real database connection is opened.
// A Proxy-based chain makes any depth of Drizzle method chaining resolve to
// an empty array when awaited, which is sufficient for middleware-rejection tests.
vi.mock("@workspace/db", () => {
  function makeChain(result: unknown[] = []): unknown {
    const handler: ProxyHandler<object> = {
      get(_target, prop: string | symbol) {
        if (prop === "then")
          return (resolve: (v: unknown) => unknown) =>
            Promise.resolve(result).then(resolve);
        if (prop === "catch")
          return (onRejected: (r: unknown) => unknown) =>
            Promise.resolve(result).catch(onRejected);
        if (prop === "finally")
          return (onFinally: () => void) =>
            Promise.resolve(result).finally(onFinally);
        // Any chained method (from, where, set, values, returning, orderBy, …) returns the same chain.
        return () => new Proxy({}, handler);
      },
    };
    return new Proxy({}, handler);
  }

  const db = {
    select: () => makeChain([]),
    insert: () => makeChain([{}]),
    update: () => makeChain([{}]),
    delete: () => makeChain([{}]),
    execute: () => Promise.resolve({ rows: [] }),
    transaction: (fn: (tx: unknown) => unknown) => fn(db), // pass the same mock as the tx
  };

  return {
    db,
    // Tables — stub objects are enough; the mock chain ignores their shape.
    accountsTable: {},
    bannedEmailsTable: {},
    conversationsTable: {},
    messagesTable: {},
    sportRequestsTable: {},
    moderatorSessionsTable: {},
    adminPushTokensTable: {},
    coachAffiliatesTable: {},
    reportsTable: {},
    insertConversationSchema: {
      safeParse: () => ({ success: false, error: { issues: [] } }),
    },
  };
});

// Mock http-proxy-middleware (used in clerkProxyMiddleware) so no network call
// is attempted during app initialisation.
vi.mock("http-proxy-middleware", () => ({
  createProxyMiddleware:
    () =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
}));

// ---------------------------------------------------------------------------
// Import the real Express app AFTER all mocks are registered.
// ---------------------------------------------------------------------------
import app from "../app.js";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";

// ---------------------------------------------------------------------------
// Constants — must match the env values set in vitest.config.ts.
// ---------------------------------------------------------------------------
const ADMIN_ID = "admin-clerk-id"; // listed in ADMIN_USER_IDS
const REGULAR_ID = "regular-user-id"; // NOT in ADMIN_USER_IDS
const ADMIN_PASSCODE = "test-passcode-secret"; // matches ADMIN_PASSCODE

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
function asAdmin() {
  vi.mocked(getAuth).mockReturnValue({
    userId: ADMIN_ID,
  } as ReturnType<typeof getAuth>);
}
function asRegularUser() {
  vi.mocked(getAuth).mockReturnValue({
    userId: REGULAR_ID,
  } as ReturnType<typeof getAuth>);
}
function asUnauthenticated() {
  vi.mocked(getAuth).mockReturnValue({
    userId: null,
  } as ReturnType<typeof getAuth>);
}

afterEach(() => asUnauthenticated());

// ---------------------------------------------------------------------------
// Route inventory — single source of truth for all admin-protected routes.
// ── Add every new admin route here; CI will catch missing guards immediately. ──
// ---------------------------------------------------------------------------

interface RouteSpec {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  body?: Record<string, unknown>;
}

/**
 * Routes protected by the requireAdmin Clerk middleware (also behind requireAuth).
 * • unauthenticated → 401 (requireAuth rejects first)
 * • regular user   → 403 (requireAdmin rejects)
 */
const REQUIRE_ADMIN_ROUTES: RouteSpec[] = [
  { method: "get", path: "/api/admin/accounts" },
  { method: "post", path: "/api/banned-emails", body: { email: "x@x.com" } },
  { method: "delete", path: "/api/banned-emails/x%40x.com" },
  { method: "put", path: "/api/sport-requests/some-id", body: { status: "approved" } },
  {
    method: "patch",
    path: "/api/admin/accounts/some-id/contact-us",
    body: { disabled: true },
  },
  { method: "delete", path: "/api/conversations/some-conv-id" },
];

/**
 * Routes with a custom isAdminCaller() guard inside the handler (also behind requireAuth).
 * • unauthenticated → 401 (requireAuth rejects first)
 * • regular user   → 403 (handler guard rejects)
 */
const CUSTOM_ADMIN_ROUTES: RouteSpec[] = [
  { method: "delete", path: "/api/wipe" },
  { method: "post", path: "/api/moderator-sessions", body: { closeChats: false } },
  { method: "delete", path: "/api/moderator-sessions/some-token" },
  { method: "get", path: "/api/reports" },
  {
    method: "post",
    path: "/api/reports/some-report-id/resolve",
    body: { resolution: "ok" },
  },
];

/**
 * Routes protected by requireAdminPasscode (outside the requireAuth fence).
 * • no X-Admin-Passcode header → 401
 * • wrong passcode             → 403
 * • correct passcode           → not 401 or 403
 */
const PASSCODE_ROUTES: RouteSpec[] = [
  {
    method: "post",
    path: "/api/admin/entitlements",
    body: { accountPublicId: "some-id", entitlementIdentifier: "premium" },
  },
  {
    method: "delete",
    path: "/api/admin/entitlements",
    body: { accountPublicId: "some-id", entitlementIdentifier: "premium" },
  },
];

/**
 * Routes with custom access control that live OUTSIDE the requireAuth fence
 * (flagged conversation queue). They accept Clerk admin OR a valid moderator
 * token and return 403 for all other callers.
 * • no auth, no moderator token → 403
 * • Clerk admin                 → not 401 or 403
 */
const FLAGGED_ROUTES: RouteSpec[] = [
  { method: "get", path: "/api/conversations/flagged" },
  { method: "post", path: "/api/conversations/some-conv-id/flag-reviewed" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function call(spec: RouteSpec) {
  const req = (request(app) as unknown as Record<string, (path: string) => any>)
    [spec.method](spec.path)
    .set("Content-Type", "application/json");
  if (spec.body) req.send(spec.body);
  return req as Promise<{ status: number }>;
}

function callWithPasscode(spec: RouteSpec, passcode: string) {
  const req = (request(app) as unknown as Record<string, (path: string) => any>)
    [spec.method](spec.path)
    .set("Content-Type", "application/json")
    .set("X-Admin-Passcode", passcode);
  if (spec.body) req.send(spec.body);
  return req as Promise<{ status: number }>;
}

function callWithModeratorToken(spec: RouteSpec, token: string) {
  const req = (request(app) as unknown as Record<string, (path: string) => any>)
    [spec.method](spec.path)
    .set("Content-Type", "application/json")
    .set("X-Moderator-Token", token);
  if (spec.body) req.send(spec.body);
  return req as Promise<{ status: number }>;
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("requireAdmin routes — unauthenticated gets 401", () => {
  REQUIRE_ADMIN_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      asUnauthenticated();
      const res = await call(spec);
      expect(res.status).toBe(401);
    });
  });
});

describe("requireAdmin routes — regular user gets 403", () => {
  REQUIRE_ADMIN_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      asRegularUser();
      const res = await call(spec);
      expect(res.status).toBe(403);
    });
  });
});

describe("requireAdmin routes — admin caller passes auth (not 401/403)", () => {
  REQUIRE_ADMIN_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      asAdmin();
      const res = await call(spec);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});

describe("custom isAdminCaller routes — unauthenticated gets 401", () => {
  CUSTOM_ADMIN_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      asUnauthenticated();
      const res = await call(spec);
      expect(res.status).toBe(401);
    });
  });
});

describe("custom isAdminCaller routes — regular user gets 403", () => {
  CUSTOM_ADMIN_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      asRegularUser();
      const res = await call(spec);
      expect(res.status).toBe(403);
    });
  });
});

describe("custom isAdminCaller routes — admin caller passes auth (not 401/403)", () => {
  CUSTOM_ADMIN_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      asAdmin();
      const res = await call(spec);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});

describe("requireAdminPasscode routes — missing header gets 401", () => {
  PASSCODE_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      const res = await call(spec);
      expect(res.status).toBe(401);
    });
  });
});

describe("requireAdminPasscode routes — wrong passcode gets 403", () => {
  PASSCODE_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      const res = await callWithPasscode(spec, "definitely-wrong");
      expect(res.status).toBe(403);
    });
  });
});

describe("requireAdminPasscode routes — correct passcode passes auth (not 401/403)", () => {
  PASSCODE_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      const res = await callWithPasscode(spec, ADMIN_PASSCODE);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});

describe("flagged-conversation routes — no auth/token gets 403", () => {
  FLAGGED_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      asUnauthenticated();
      const res = await call(spec);
      expect(res.status).toBe(403);
    });
  });
});

describe("flagged-conversation routes — admin Clerk user passes auth (not 401/403)", () => {
  FLAGGED_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      asAdmin();
      const res = await call(spec);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});

describe("flagged-conversation routes — moderator token with closeChats=false gets 403", () => {
  // db.select is mocked to return a session row where closeChats=false.
  // This proves the guard rejects the request even when the DB returns a matching token row —
  // i.e. an implementation that drops the closeChats filter would grant access and break this test.
  FLAGGED_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      asUnauthenticated();

      const selectSpy = vi.spyOn(db, "select").mockReturnValue({
        from: () => ({
          where: () =>
            Promise.resolve([
              { token: "no-close-chats-token", closeChats: false, revoked: false },
            ]),
        }),
      } as any);

      try {
        const res = await callWithModeratorToken(spec, "no-close-chats-token");
        expect(res.status).toBe(403);
      } finally {
        selectSpy.mockRestore();
      }
    });
  });
});

describe("flagged-conversation routes — moderator token with closeChats=true passes auth (not 401/403)", () => {
  // db.select is mocked to return a valid session row (closeChats=true, revoked=false).
  // Subsequent selects (route body logic) fall back to the default empty-array chain.
  FLAGGED_ROUTES.forEach((spec) => {
    it(`${spec.method.toUpperCase()} ${spec.path}`, async () => {
      asUnauthenticated();

      let callCount = 0;
      const selectSpy = vi.spyOn(db, "select").mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          // First select: the auth check — return a valid session.
          return {
            from: () => ({
              where: () =>
                Promise.resolve([
                  { token: "valid-close-chats-token", closeChats: true, revoked: false },
                ]),
            }),
          } as any;
        }
        // Subsequent selects (route body): return empty array via a thenable proxy.
        function makeChain(): unknown {
          const handler: ProxyHandler<object> = {
            get(_target, prop: string | symbol) {
              if (prop === "then")
                return (resolve: (v: unknown) => unknown) =>
                  Promise.resolve([]).then(resolve);
              if (prop === "catch")
                return (onRejected: (r: unknown) => unknown) =>
                  Promise.resolve([]).catch(onRejected);
              if (prop === "finally")
                return (onFinally: () => void) =>
                  Promise.resolve([]).finally(onFinally);
              return () => new Proxy({}, handler);
            },
          };
          return new Proxy({}, handler);
        }
        return makeChain() as any;
      });

      try {
        const res = await callWithModeratorToken(spec, "valid-close-chats-token");
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      } finally {
        selectSpy.mockRestore();
      }
    });
  });
});
