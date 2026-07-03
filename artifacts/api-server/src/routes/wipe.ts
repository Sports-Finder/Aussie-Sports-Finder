import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.delete("/wipe", async (_req: Request, res: Response) => {
  try {
    // Use CASCADE to handle referential relationships and foreign-key tables
    // (even though Drizzle may not declare FKs, messages depend on conversations,
    // reports/coach_affiliates depend on accounts). Order: dependents first, then
    // parents, then every remaining table. TRUNCATE ... RESTART IDENTITY CASCADE
    // is safer and atomic than a chain of DELETE statements.
    await db.execute(sql`TRUNCATE messages, conversations, coach_affiliates, reports, profile_images, sport_requests, banned_emails, adverts, accounts, moderator_sessions RESTART IDENTITY CASCADE;`);
    logger.info("Database wiped via API");
    res.json({ status: "ok", message: "All data wiped." });
  } catch (err) {
    logger.error({ err }, "Failed to wipe database");
    res.status(500).json({ status: "error", message: "Failed to wipe database." });
  }
});

export default router;
