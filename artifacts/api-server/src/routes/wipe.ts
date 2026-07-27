import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function isAdminCaller(req: Request): boolean {
  const auth = getAuth(req);
  const allowlist = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return !!auth.userId && allowlist.includes(auth.userId);
}

router.delete("/wipe", async (req: Request, res: Response) => {
  if (!isAdminCaller(req)) {
    res.status(403).json({ error: "Forbidden — admin access required." });
    return;
  }
  try {
    // Use CASCADE to handle referential relationships and foreign-key tables
    // (even though Drizzle may not declare FKs, messages depend on conversations,
    // reports/coach_affiliates depend on accounts). Order: dependents first, then
    // parents, then every remaining table. TRUNCATE ... RESTART IDENTITY CASCADE
    // is safer and atomic than a chain of DELETE statements.
    const auth = getAuth(req);
    await db.execute(sql`TRUNCATE messages, conversations, coach_affiliates, reports, profile_images, sport_requests, banned_emails, adverts, accounts, moderator_sessions RESTART IDENTITY CASCADE;`);
    logger.info({ event: "db_wipe", adminUserId: auth.userId, timestamp: new Date().toISOString() }, "Database wiped via API");
    res.json({ status: "ok", message: "All data wiped." });
  } catch (err) {
    logger.error({ err }, "Failed to wipe database");
    res.status(500).json({ status: "error", message: "Failed to wipe database." });
  }
});

export default router;
