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
    const body = req.body;
    const [created] = await db.insert(accountsTable).values(body).returning();
    res.status(201).json(mapAccount(created as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to create account");
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.put("/accounts/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId;
    const body = normalizeDates(req.body, [
      "statusChangedAt",
      "trialStartedAt",
      "trialExpiresAt",
      "subscriptionExpiresAt",
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
