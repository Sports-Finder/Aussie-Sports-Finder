import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, accountsTable, coachAffiliatesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapAccount, mapAccountAdmin, mapCoachAffiliate } from "../lib/mapDbToApi";
import { normalizeDates } from "../lib/normalizeDates";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

/** Public-safe list — strips guardianDateOfBirth. */
router.get("/accounts", async (_req, res) => {
  try {
    const [rows, affiliateRows] = await Promise.all([
      db.select().from(accountsTable),
      db.select().from(coachAffiliatesTable),
    ]);
    const byClub: Record<string, ReturnType<typeof mapCoachAffiliate>[]> = {};
    for (const a of affiliateRows) {
      const mapped = mapCoachAffiliate(a as unknown as Record<string, unknown>);
      (byClub[a.clubAccountId] ??= []).push(mapped);
    }
    res.json(
      rows.map((row) =>
        mapAccount(row as unknown as Record<string, unknown>, byClub[row.publicId] ?? []),
      ),
    );
  } catch (err) {
    logger.error({ err }, "Failed to fetch accounts");
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

/** Admin-only list — includes guardianDateOfBirth for review. */
router.get("/admin/accounts", requireAdmin, async (_req, res) => {
  try {
    const [rows, affiliateRows] = await Promise.all([
      db.select().from(accountsTable),
      db.select().from(coachAffiliatesTable),
    ]);
    const byClub: Record<string, ReturnType<typeof mapCoachAffiliate>[]> = {};
    for (const a of affiliateRows) {
      const mapped = mapCoachAffiliate(a as unknown as Record<string, unknown>);
      (byClub[a.clubAccountId] ??= []).push(mapped);
    }
    res.json(
      rows.map((row) =>
        mapAccountAdmin(row as unknown as Record<string, unknown>, byClub[row.publicId] ?? []),
      ),
    );
  } catch (err) {
    logger.error({ err }, "Failed to fetch admin accounts");
    res.status(500).json({ error: "Failed to fetch admin accounts" });
  }
});

/** Unauthenticated — returns only the role for a given email, used by the
 *  sign-up flow to show a helpful "you already have a [Role] account" message. */
router.get("/accounts/lookup-role", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.toLowerCase().trim() : null;
  if (!email) { res.json({ role: null }); return; }
  try {
    const [account] = await db
      .select({ role: accountsTable.role })
      .from(accountsTable)
      .where(eq(sql`lower(${accountsTable.email})`, email))
      .limit(1);
    res.json({ role: account?.role ?? null });
  } catch {
    res.json({ role: null });
  }
});

router.post("/accounts", async (req, res) => {
  try {
    // Strip client-side id (local string id, not a DB serial) and passwordHash
    // (the client sends plain `password`; we store it directly in the `password`
    // column — passwordHash is reserved for future bcrypt migration).
    // Also strip any client-supplied clerkUserId so the server always owns
    // the identity binding.
    const { id: _id, passwordHash: _ph, clerkUserId: _cuid, ...rest } = req.body as Record<string, unknown>;
    const body = normalizeDates(rest, [
      "createdAt",
      "updatedAt",
      "statusChangedAt",
      "trialStartedAt",
      "trialExpiresAt",
      "subscriptionExpiresAt",
      "lastAdvertClosedAt",
      "ageAttestedAt",
    ]);
    // Derive the Clerk user ID from the authenticated session so the binding
    // cannot be forged or reassigned by the client.
    const auth = getAuth(req);
    const derivedClerkUserId = auth.userId ?? undefined;
    // Duplicate-clerkUserId guard: the strongest identity signal — if this Clerk
    // user already has any account (active, closed, or banned), return 409 with
    // its publicId so the client can restore the session rather than creating a
    // duplicate. This check runs before the email guard because clerkUserId is
    // server-derived and cannot be spoofed by the client.
    if (derivedClerkUserId) {
      const [existingByClerk] = await db
        .select({ publicId: accountsTable.publicId, status: accountsTable.status })
        .from(accountsTable)
        .where(eq(accountsTable.clerkUserId, derivedClerkUserId))
        .limit(1);
      if (existingByClerk) {
        res.status(409).json({ error: "account_exists", publicId: existingByClerk.publicId, status: existingByClerk.status });
        return;
      }
    }
    // Duplicate-email guard: secondary check — reject if an account already exists
    // with the same email (case-insensitive). Catches legacy accounts that pre-date
    // the clerkUserId binding, or accounts created via a different Clerk identity.
    const emailValue = typeof body.email === "string" ? body.email.toLowerCase().trim() : undefined;
    if (emailValue) {
      const [existing] = await db
        .select({ publicId: accountsTable.publicId, status: accountsTable.status })
        .from(accountsTable)
        .where(eq(sql`lower(${accountsTable.email})`, emailValue))
        .limit(1);
      if (existing) {
        res.status(409).json({ error: "account_exists", publicId: existing.publicId, status: existing.status });
        return;
      }
    }
    const [created] = await db.insert(accountsTable).values({
      ...body,
      clerkUserId: derivedClerkUserId,
    } as never).returning();
    res.status(201).json(mapAccount(created as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to create account");
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.put("/accounts/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId;

    // Ownership + admin guard: the caller must own this account or be an admin.
    // This prevents any authenticated user from updating — or banning — another
    // user's account.  requireAuth (applied globally) already guarantees userId
    // is non-null here, so getAuth is safe to call without a null-check.
    const auth = getAuth(req);
    const callerClerkId = auth.userId as string;
    const adminList = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const isAdmin = adminList.length > 0 && adminList.includes(callerClerkId);
    if (!isAdmin) {
      const [target] = await db
        .select({ clerkUserId: accountsTable.clerkUserId })
        .from(accountsTable)
        .where(eq(accountsTable.publicId, publicId))
        .limit(1);
      if (!target || target.clerkUserId !== callerClerkId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    // Strip read-only / registration-only fields that must never be overwritten
    // via a profile update — id, password (set once at registration), coachAffiliates
    // (managed by its own endpoints), and clerkUserId (server-owned identity binding).
    const { id: _id, password: _pw, coachAffiliates: _ca, clerkUserId: _cuid, ...rawBody } = req.body as Record<string, unknown>;
    const body = normalizeDates(rawBody, [
      "statusChangedAt",
      "trialStartedAt",
      "trialExpiresAt",
      "subscriptionExpiresAt",
      "lastAdvertClosedAt",
    ]);
    const [updated] = await db
      .update(accountsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(accountsTable.publicId, publicId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    // Audit-log destructive status changes so incidents can be investigated.
    const newStatus = typeof body.status === "string" ? body.status : null;
    if (newStatus === "banned" || newStatus === "closed" || newStatus === "active") {
      const eventMap: Record<string, string> = {
        banned: "account_banned",
        closed: "account_closed",
        active: "account_unbanned",
      };
      logger.info(
        { event: eventMap[newStatus], adminUserId: callerClerkId, targetAccountId: publicId, timestamp: new Date().toISOString() },
        `Account status set to '${newStatus}' by admin`
      );
    }

    res.json(mapAccount(updated as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to update account");
    res.status(500).json({ error: "Failed to update account" });
  }
});

export default router;
