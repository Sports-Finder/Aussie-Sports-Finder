/**
 * Flagged conversations endpoints.
 *
 * These routes are registered BEFORE the global requireAuth middleware so that
 * moderators (who have no Clerk account) can authenticate via an X-Moderator-Token
 * DB-backed session token. Access is enforced at route level:
 *   - Verified Clerk admin (ADMIN_USER_IDS), OR
 *   - Valid DB session token with closeChats=true and revoked=false.
 * All other callers receive 403.
 */
import { Router, type IRouter } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, conversationsTable, messagesTable, moderatorSessionsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapConversation, mapMessage } from "../lib/mapDbToApi";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

function isAdminCaller(req: Parameters<typeof getAuth>[0]): boolean {
  const auth = getAuth(req);
  const allowlist = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return !!auth.userId && allowlist.includes(auth.userId);
}

async function hasCloseChatsSession(req: Parameters<typeof getAuth>[0]): Promise<boolean> {
  const token = (req as any).headers?.["x-moderator-token"];
  if (!token || typeof token !== "string") return false;
  const [session] = await db
    .select()
    .from(moderatorSessionsTable)
    .where(
      and(
        eq(moderatorSessionsTable.token, token),
        eq(moderatorSessionsTable.closeChats, true),
        eq(moderatorSessionsTable.revoked, false)
      )
    );
  // Defence in depth: even if the DB layer returns a row, explicitly verify the
  // required fields so a future query change cannot accidentally grant access.
  return !!session && session.closeChats === true && session.revoked === false;
}

/**
 * Flagged conversations queue — admin or closeChats moderator session.
 * Results ordered highest severity first, then most recently flagged.
 */
router.get("/conversations/flagged", async (req, res) => {
  const admin = isAdminCaller(req);
  const moderator = admin ? false : await hasCloseChatsSession(req);
  if (!admin && !moderator) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const flaggedConvs = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.flagged, true))
      .orderBy(
        sql`CASE WHEN ${conversationsTable.flagSeverity} = 'high' THEN 0 ELSE 1 END`,
        sql`${conversationsTable.flaggedAt} DESC NULLS LAST`
      );

    const convIds = flaggedConvs.map((c) => c.publicId);
    const msgs =
      convIds.length > 0
        ? await db
            .select()
            .from(messagesTable)
            .where(inArray(messagesTable.conversationId, convIds))
        : [];

    const result = flaggedConvs.map((c) => ({
      ...mapConversation(c),
      messages: msgs
        .filter((m) => m.conversationId === c.publicId)
        .map(mapMessage)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }));

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to fetch flagged conversations");
    res.status(500).json({ error: "Failed to fetch flagged conversations" });
  }
});

/**
 * Mark a flagged conversation as reviewed.
 * Same access: admin or closeChats moderator session.
 * Sets flagReviewedAt to clear the unread badge.
 */
router.post("/conversations/:publicId/flag-reviewed", async (req, res) => {
  const admin = isAdminCaller(req);
  const moderator = admin ? false : await hasCloseChatsSession(req);
  if (!admin && !moderator) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { publicId } = req.params;
    const [updated] = await db
      .update(conversationsTable)
      .set({ flagReviewedAt: new Date() })
      .where(eq(conversationsTable.publicId, publicId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.json(mapConversation(updated));
  } catch (err) {
    logger.error({ err }, "Failed to mark flag reviewed");
    res.status(500).json({ error: "Failed to mark flag reviewed" });
  }
});

export default router;
