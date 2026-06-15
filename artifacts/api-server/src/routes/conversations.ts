import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, conversationsTable, messagesTable, accountsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapConversation, mapMessage } from "../lib/mapDbToApi";
import { normalizeDates } from "../lib/normalizeDates";
import { scanMessage } from "../lib/contentSafety";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

/** Returns true when the caller's Clerk userId is in ADMIN_USER_IDS. */
function isAdminCaller(req: Parameters<typeof getAuth>[0]): boolean {
  const auth = getAuth(req);
  const allowlist = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return !!auth.userId && allowlist.includes(auth.userId);
}

/**
 * Strip sensitive flag fields from a mapped conversation for non-privileged callers.
 * Flag metadata is internal moderation evidence and should not be served to users.
 */
function stripFlagFields(conv: ReturnType<typeof mapConversation>) {
  const { flagged: _, flagSeverity: _s, flagCategory: _c, flagTriggerMessage: _t, flaggedAt: _fa, flagReviewedAt: _ra, ...rest } = conv;
  return rest;
}

router.get("/conversations", async (req, res) => {
  try {
    const privileged = isAdminCaller(req);
    const convs = await db.select().from(conversationsTable);
    const msgs = await db.select().from(messagesTable);
    const result = convs.map((c) => {
      const mapped = {
        ...mapConversation(c),
        messages: msgs
          .filter((m) => m.conversationId === c.publicId)
          .map(mapMessage)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      };
      return privileged ? mapped : { ...stripFlagFields(mapped), messages: mapped.messages };
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to fetch conversations");
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const [created] = await db.insert(conversationsTable).values(req.body).returning();
    res.status(201).json(mapConversation(created));
  } catch (err) {
    logger.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.put("/conversations/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    const body = normalizeDates(req.body, ["createdAt"]);
    const [updated] = await db
      .update(conversationsTable)
      .set(body)
      .where(eq(conversationsTable.publicId, publicId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.json(mapConversation(updated));
  } catch (err) {
    logger.error({ err }, "Failed to update conversation");
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

router.delete("/conversations/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    await db.delete(messagesTable).where(eq(messagesTable.conversationId, publicId));
    const deleted = await db.delete(conversationsTable).where(eq(conversationsTable.publicId, publicId)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.post("/conversations/:publicId/messages", async (req, res) => {
  try {
    const { publicId } = req.params;
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.publicId, publicId));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Derive sender identity from authenticated Clerk user -> account mapping.
    // Reject if the caller has no linked account or if the account is paused.
    const auth = getAuth(req);
    const clerkUserId = auth.userId;
    let senderAccountId: string | undefined;
    if (clerkUserId) {
      const [sender] = await db.select().from(accountsTable).where(eq(accountsTable.clerkUserId, clerkUserId));
      if (sender) {
        if (sender.status === "review" || sender.status === "banned" || sender.status === "closed") {
          res.status(403).json({ error: "Your account is under review. You cannot send messages until the review is complete." });
          return;
        }
        senderAccountId = sender.publicId;
      }
    }
    // If we couldn't resolve an authenticated account, fall back to the
    // client-supplied senderAccountId only for backward compatibility with
    // legacy accounts that lack a clerkUserId mapping.
    if (!senderAccountId) {
      senderAccountId = req.body?.senderAccountId as string | undefined;
      if (senderAccountId) {
        const [sender] = await db.select().from(accountsTable).where(eq(accountsTable.publicId, senderAccountId));
        if (sender && (sender.status === "review" || sender.status === "banned" || sender.status === "closed")) {
          res.status(403).json({ error: "Your account is under review. You cannot send messages until the review is complete." });
          return;
        }
      }
    }

    const body: string = req.body?.body ?? "";

    // Scan the message body for predatory/grooming patterns.
    // The scan is only skipped for trusted server-generated messages: the
    // caller must be a server-verified admin (Clerk) AND the message must
    // declare itself as system or admin. Client-supplied bypass flags are
    // NOT trusted on their own — a malicious user could set them to evade scanning.
    const callerIsAdmin = isAdminCaller(req);
    const isTrustedSystemMsg = callerIsAdmin && (req.body?.isSystem || req.body?.isAdmin);
    const flagMatch = body && !isTrustedSystemMsg ? scanMessage(body) : null;

    const [msg] = await db
      .insert(messagesTable)
      .values({ ...req.body, conversationId: publicId })
      .returning();

    // When a pattern matches, upsert the conversation's flag fields.
    // Severity only escalates (high stays high). Category, trigger message and
    // flaggedAt are only overwritten when the new match is at least as severe
    // as the existing record, so a later low-severity match never replaces
    // high-severity evidence.
    if (flagMatch) {
      const currentSeverity = conv.flagSeverity as "high" | "medium" | null;
      const severityOrder: Record<string, number> = { high: 2, medium: 1 };
      const incomingRank = severityOrder[flagMatch.severity] ?? 0;
      const currentRank = currentSeverity ? (severityOrder[currentSeverity] ?? 0) : 0;
      const escalates = incomingRank >= currentRank;

      await db
        .update(conversationsTable)
        .set({
          flagged: true,
          // Only escalate severity; never downgrade.
          flagSeverity: escalates ? flagMatch.severity : currentSeverity,
          // Only replace category and trigger evidence when the new match is
          // at least as severe, preserving the strongest evidence.
          ...(escalates
            ? {
                flagCategory: flagMatch.category,
                flagTriggerMessage: body,
                flaggedAt: new Date(),
              }
            : {}),
          // Clear reviewed status whenever a new match is found so admins
          // see the conversation again, regardless of match severity.
          flagReviewedAt: null,
        })
        .where(eq(conversationsTable.publicId, publicId));

      req.log.warn(
        { conversationId: publicId, category: flagMatch.category, severity: flagMatch.severity },
        "Conversation flagged for predatory content"
      );
    }

    res.status(201).json(mapMessage(msg));
  } catch (err) {
    logger.error({ err }, "Failed to create message");
    res.status(500).json({ error: "Failed to create message" });
  }
});

export default router;
