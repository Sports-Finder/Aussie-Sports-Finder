/**
 * Admin push token registration.
 *
 * Devices that sign in as admin or moderator register their Expo push token
 * here so the server can deliver HIGH-severity flag notifications immediately
 * without waiting for the device to poll.
 *
 * Access: Clerk-verified admin OR valid closeChats moderator session token.
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminPushTokensTable, moderatorSessionsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

function isAdminCaller(req: Parameters<typeof getAuth>[0]): boolean {
  const auth = getAuth(req);
  const allowlist = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return !!auth.userId && allowlist.includes(auth.userId);
}

async function hasCloseChatsSession(req: Parameters<typeof getAuth>[0]): Promise<boolean> {
  const token = (req as any).headers?.["x-moderator-token"];
  if (!token || typeof token !== "string") return false;
  const [session] = await db
    .select()
    .from(moderatorSessionsTable)
    .where(
      eq(moderatorSessionsTable.token, token)
    );
  return !!session && session.closeChats && !session.revoked;
}

async function isAuthorized(req: Parameters<typeof getAuth>[0]): Promise<boolean> {
  return isAdminCaller(req) || (await hasCloseChatsSession(req));
}

/**
 * Register an Expo push token for the current admin/moderator device.
 * Body: { token: string; label?: string }
 * Upserts by token — idempotent, safe to call on every login.
 */
router.post("/admin/push-tokens", async (req, res) => {
  if (!(await isAuthorized(req))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { token, label } = req.body ?? {};
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }
  try {
    await db
      .insert(adminPushTokensTable)
      .values({ token, label: label ?? null })
      .onConflictDoUpdate({
        target: adminPushTokensTable.token,
        set: { label: label ?? null },
      });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to register admin push token");
    res.status(500).json({ error: "Failed to register push token" });
  }
});

/**
 * Unregister an Expo push token (e.g. on admin logout).
 */
router.delete("/admin/push-tokens/:token", async (req, res) => {
  if (!(await isAuthorized(req))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    await db
      .delete(adminPushTokensTable)
      .where(eq(adminPushTokensTable.token, req.params.token));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to unregister admin push token");
    res.status(500).json({ error: "Failed to unregister push token" });
  }
});

export default router;
