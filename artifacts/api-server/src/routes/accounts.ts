import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, accountsTable, coachAffiliatesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapAccount, mapCoachAffiliate } from "../lib/mapDbToApi";
import { normalizeDates } from "../lib/normalizeDates";

const router: IRouter = Router();

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

router.post("/accounts", async (req, res) => {
  try {
    // Strip client-side id (local string id, not a DB serial) and passwordHash
    // (the client sends plain `password`; we store it directly in the `password`
    // column — passwordHash is reserved for future bcrypt migration).
    const { id: _id, passwordHash: _ph, ...rest } = req.body as Record<string, unknown>;
    const body = normalizeDates(rest, [
      "createdAt",
      "updatedAt",
      "statusChangedAt",
      "trialStartedAt",
      "trialExpiresAt",
      "subscriptionExpiresAt",
      "lastAdvertClosedAt",
    ]);
    const [created] = await db.insert(accountsTable).values(body as never).returning();
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
    // (managed by its own endpoints).
    const { id: _id, password: _pw, coachAffiliates: _ca, ...rawBody } = req.body as Record<string, unknown>;
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
