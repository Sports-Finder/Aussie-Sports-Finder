import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
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
    ]);
    // Derive the Clerk user ID from the authenticated session so the binding
    // cannot be forged or reassigned by the client.
    const auth = getAuth(req);
    const derivedClerkUserId = auth.userId ?? undefined;
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
    res.json(mapAccount(updated as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to update account");
    res.status(500).json({ error: "Failed to update account" });
  }
});

export default router;
