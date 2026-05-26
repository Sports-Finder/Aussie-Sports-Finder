import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bannedEmailsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapBannedEmail } from "../lib/mapDbToApi";

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

router.post("/banned-emails", async (req, res) => {
  try {
    const [created] = await db.insert(bannedEmailsTable).values(req.body).returning();
    res.status(201).json(mapBannedEmail(created));
  } catch (err) {
    logger.error({ err }, "Failed to ban email");
    res.status(500).json({ error: "Failed to ban email" });
  }
});

router.delete("/banned-emails/:email", async (req, res) => {
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
