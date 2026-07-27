import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bannedEmailsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapBannedEmail } from "../lib/mapDbToApi";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.get("/banned-emails", async (_req, res) => {
  try {
    const rows = await db.select().from(bannedEmailsTable);
    res.json(rows.map(mapBannedEmail));
  } catch (err) {
    logger.error({ err }, "Failed to fetch banned emails");
    res.status(500).json({ error: "Failed to fetch banned emails" });
  }
});

// Admin-only: ban management must not be accessible to regular users.
router.post("/banned-emails", requireAdmin, async (req, res) => {
  try {
    const [created] = await db.insert(bannedEmailsTable).values(req.body).returning();
    res.status(201).json(mapBannedEmail(created));
  } catch (err) {
    logger.error({ err }, "Failed to ban email");
    res.status(500).json({ error: "Failed to ban email" });
  }
});

// Admin-only: lifting a ban must not be accessible to regular users.
router.delete("/banned-emails/:email", requireAdmin, async (req, res) => {
  try {
    const email = req.params.email;
    await db.delete(bannedEmailsTable).where(eq(bannedEmailsTable.email, email));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to unban email");
    res.status(500).json({ error: "Failed to unban email" });
  }
});

export default router;
