/**
 * Flagged Chat Reaper
 *
 * Apple App Store Review Guidelines §1.2 (User Generated Content) require
 * timely action on flagged content — especially on platforms accessible to
 * minors. This module auto-closes flagged conversations that have not been
 * reviewed by an admin within the severity threshold.
 *
 * Thresholds (adjustable here without touching business logic):
 *   - HIGH severity (grooming, explicit, meeting requests, info harvesting): 24 hours
 *   - MEDIUM severity (age probing, boundary testing): 48 hours
 */

import { and, eq, isNull, lt, inArray } from "drizzle-orm";
import { db, conversationsTable, messagesTable } from "@workspace/db";
import { logger } from "./logger";

export const REAPER_THRESHOLDS_HOURS = {
  high: 24,
  medium: 48,
} as const;

const REAPER_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const AUTO_CLOSE_SYSTEM_MESSAGE =
  "This chat was automatically closed for safety review. If you believe this is an error, please contact support.";

async function runReaper(): Promise<void> {
  try {
    const now = new Date();
    const closedIds: string[] = [];

    for (const [severity, thresholdHours] of Object.entries(REAPER_THRESHOLDS_HOURS) as [
      keyof typeof REAPER_THRESHOLDS_HOURS,
      number,
    ][]) {
      const cutoff = new Date(now.getTime() - thresholdHours * 60 * 60 * 1000);

      // Find flagged conversations of this severity that have never been
      // reviewed and were flagged before the cutoff time.
      const candidates = await db
        .select({ publicId: conversationsTable.publicId })
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.flagged, true),
            eq(conversationsTable.flagSeverity, severity),
            isNull(conversationsTable.flagReviewedAt),
            lt(conversationsTable.flaggedAt, cutoff),
            // Only close open conversations — don't re-close already closed ones.
            eq(conversationsTable.status, "pending")
          )
        );

      // Also catch "connected" status conversations.
      const candidatesConnected = await db
        .select({ publicId: conversationsTable.publicId })
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.flagged, true),
            eq(conversationsTable.flagSeverity, severity),
            isNull(conversationsTable.flagReviewedAt),
            lt(conversationsTable.flaggedAt, cutoff),
            eq(conversationsTable.status, "connected")
          )
        );

      const toClose = [
        ...candidates.map((r) => r.publicId),
        ...candidatesConnected.map((r) => r.publicId),
      ];

      if (toClose.length === 0) continue;

      // Batch-close all qualifying conversations.
      await db
        .update(conversationsTable)
        .set({ status: "closed", hasUnread: true })
        .where(inArray(conversationsTable.publicId, toClose));

      // Insert a system message into each closed conversation.
      const systemMessages = toClose.map((conversationId) => ({
        publicId: crypto.randomUUID().replace(/-/g, ""),
        conversationId,
        sender: "them" as const,
        body: AUTO_CLOSE_SYSTEM_MESSAGE,
        isSystem: true,
        isAdmin: true,
      }));

      await db.insert(messagesTable).values(systemMessages);

      closedIds.push(...toClose);

      logger.info(
        { severity, thresholdHours, count: toClose.length, conversationIds: toClose },
        "Flagged chat reaper: auto-closed unreviewed conversations"
      );
    }

    if (closedIds.length === 0) {
      logger.debug("Flagged chat reaper: no conversations to close this cycle");
    }
  } catch (err) {
    logger.error({ err }, "Flagged chat reaper: error during reaper run");
  }
}

/**
 * Start the flagged chat reaper background job.
 * Runs immediately on startup, then every hour.
 * Safe to call multiple times — each call schedules an independent interval.
 */
export function startFlaggedChatReaper(): void {
  logger.info(
    { thresholds: REAPER_THRESHOLDS_HOURS, intervalMs: REAPER_INTERVAL_MS },
    "Flagged chat reaper: started"
  );

  // Run immediately on startup so stale records from a server restart are
  // picked up without waiting a full hour.
  void runReaper();

  setInterval(() => void runReaper(), REAPER_INTERVAL_MS);
}
