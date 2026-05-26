import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.delete("/wipe", async (_req: Request, res: Response) => {
  try {
    await db.execute(sql`DELETE FROM messages;`);
    await db.execute(sql`DELETE FROM conversations;`);
    await db.execute(sql`DELETE FROM profile_images;`);
    await db.execute(sql`DELETE FROM sport_requests;`);
    await db.execute(sql`DELETE FROM banned_emails;`);
    await db.execute(sql`DELETE FROM adverts;`);
    await db.execute(sql`DELETE FROM accounts;`);
    logger.info("Database wiped via API");
    res.json({ status: "ok", message: "All data wiped." });
  } catch (err) {
    logger.error({ err }, "Failed to wipe database");
    res.status(500).json({ status: "error", message: "Failed to wipe database." });
  }
});

export default router;
