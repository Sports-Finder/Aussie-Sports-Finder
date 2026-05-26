import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, accountsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapAccount } from "../lib/mapDbToApi";

const router: IRouter = Router();

router.get("/accounts", async (_req, res) => {
  try {
    const rows = await db.select().from(accountsTable);
    res.json(rows.map(mapAccount));
  } catch (err) {
    logger.error({ err }, "Failed to fetch accounts");
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

router.post("/accounts", async (req, res) => {
  try {
    const body = req.body;
    const [created] = await db.insert(accountsTable).values(body).returning();
    res.status(201).json(mapAccount(created));
  } catch (err) {
    logger.error({ err }, "Failed to create account");
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.put("/accounts/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId;
    const [updated] = await db
      .update(accountsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(accountsTable.publicId, publicId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json(mapAccount(updated));
  } catch (err) {
    logger.error({ err }, "Failed to update account");
    res.status(500).json({ error: "Failed to update account" });
  }
});

export default router;
