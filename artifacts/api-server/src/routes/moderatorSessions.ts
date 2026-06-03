import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { db, moderatorSessionsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

function isAdminCaller(req: Parameters<typeof getAuth>[0]): boolean {
  const auth = getAuth(req);
  const allowlist = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return !!auth.userId && allowlist.includes(auth.userId);
}

/**
 * Create a moderator session token — admin-only.
 * The returned token is stored by the admin's device alongside the moderator's
 * local account data (in AsyncStorage). The moderator sends it as
 * X-Moderator-Token on subsequent calls to protected endpoints.
 * The token grants the specific permissions requested; the server verifies
 * both the token's existence and its permissions on each protected call.
 */
router.post("/moderator-sessions", async (req, res) => {
  if (!isAdminCaller(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { closeChats = false } = req.body ?? {};
    const token = crypto.randomUUID().replace(/-/g, "");
    const [session] = await db
      .insert(moderatorSessionsTable)
      .values({ token, closeChats: Boolean(closeChats), revoked: false })
      .returning();
    res.status(201).json({ token: session.token });
  } catch (err) {
    logger.error({ err }, "Failed to create moderator session");
    res.status(500).json({ error: "Failed to create moderator session" });
  }
});

/**
 * Revoke a moderator session — admin-only.
 * Marks the session as revoked so subsequent requests using the token are
 * rejected. Used when a moderator is deleted or has closeChats removed.
 */
router.delete("/moderator-sessions/:token", async (req, res) => {
  if (!isAdminCaller(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    await db
      .update(moderatorSessionsTable)
      .set({ revoked: true })
      .where(eq(moderatorSessionsTable.token, req.params.token));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to revoke moderator session");
    res.status(500).json({ error: "Failed to revoke moderator session" });
  }
});

export default router;
