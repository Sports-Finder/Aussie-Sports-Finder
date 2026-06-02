import { Router, type IRouter } from "express";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, advertsTable, conversationsTable, messagesTable, type InsertAdvert } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapAdvert } from "../lib/mapDbToApi";
import { normalizeDates } from "../lib/normalizeDates";

const router: IRouter = Router();

const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours

router.get("/adverts", async (_req, res) => {
  try {
    const rows = await db.select().from(advertsTable);
    res.json(rows.map((row) => mapAdvert(row as unknown as Record<string, unknown>)));
  } catch (err) {
    logger.error({ err }, "Failed to fetch adverts");
    res.status(500).json({ error: "Failed to fetch adverts" });
  }
});

router.post("/adverts", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const ownerAccountId = body.ownerAccountId as string | undefined;
    const postedByType = body.postedByType as string | undefined;
    const sport = body.sport as string | undefined;
    const type = body.type as string | undefined;

    const ownerSubscriptionStatus = body.ownerSubscriptionStatus as string | undefined;

    // Duplicate prevention only applies to paid club accounts (subscriptionStatus === "active").
    // Free-trial and unsubscribed clubs are unaffected.
    if (ownerAccountId && postedByType === "club" && ownerSubscriptionStatus === "active" && sport && type) {
      const cutoff = new Date(Date.now() - COOLDOWN_MS);

      // 1. Active-role lock: reject if the club already has an active advert for
      //    this exact sport + type combination.
      const [existingActive] = await db
        .select({ publicId: advertsTable.publicId })
        .from(advertsTable)
        .where(
          and(
            eq(advertsTable.ownerAccountId, ownerAccountId),
            eq(advertsTable.sport, sport),
            eq(advertsTable.type, type),
            eq(advertsTable.status, "active"),
          ),
        )
        .limit(1);

      if (existingActive) {
        res.status(409).json({
          code: "DUPLICATE_ACTIVE",
          existingAdvertId: existingActive.publicId,
          message: "You already have an active advert for this sport and role. Edit or delete it before posting a new one.",
        });
        return;
      }

      // 2. Post-expiry cooldown: only applies when the advert expired naturally
      //    (closedReason = "expired"). Admin closures and user deletions do not
      //    trigger the cooldown so clubs aren't penalised for moderation actions.
      const [recentlyClosed] = await db
        .select({ closedAt: advertsTable.closedAt, createdAt: advertsTable.createdAt })
        .from(advertsTable)
        .where(
          and(
            eq(advertsTable.ownerAccountId, ownerAccountId),
            eq(advertsTable.sport, sport),
            eq(advertsTable.type, type),
            eq(advertsTable.closedReason, "expired"),
            gt(advertsTable.closedAt, cutoff),
          ),
        )
        .orderBy(sql`${advertsTable.closedAt} DESC`)
        .limit(1);

      if (recentlyClosed?.closedAt) {
        const repostAvailableAt = new Date(
          recentlyClosed.closedAt.getTime() + COOLDOWN_MS,
        ).toISOString();
        res.status(409).json({
          code: "REPOST_COOLDOWN",
          repostAvailableAt,
          message: `You must wait 48 hours after an advert expires before reposting the same sport and role. You can repost at ${repostAvailableAt}.`,
        });
        return;
      }

      // 3. Soft-flag: if a recently-expired advert (same sport, any role) exists
      //    within the cooldown window, mark the new advert for admin review.
      //    Only natural expiry qualifies — admin closures are excluded.
      const [anyClosed] = await db
        .select({ publicId: advertsTable.publicId })
        .from(advertsTable)
        .where(
          and(
            eq(advertsTable.ownerAccountId, ownerAccountId),
            eq(advertsTable.sport, sport),
            eq(advertsTable.closedReason, "expired"),
            gt(advertsTable.closedAt, cutoff),
          ),
        )
        .limit(1);

      if (anyClosed) {
        body.possibleDuplicate = true;
      }
    }

    const [created] = await db.insert(advertsTable).values(body as unknown as InsertAdvert).returning();
    res.status(201).json(mapAdvert(created as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to create advert");
    res.status(500).json({ error: "Failed to create advert" });
  }
});

router.put("/adverts/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId;
    const body = normalizeDates(req.body, [
      "closedAt",
      "bumpedAt",
      "expiresAt",
      "originalExpiresAt",
    ]);
    const [updated] = await db
      .update(advertsTable)
      .set(body)
      .where(eq(advertsTable.publicId, publicId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Advert not found" });
      return;
    }
    res.json(mapAdvert(updated as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to update advert");
    res.status(500).json({ error: "Failed to update advert" });
  }
});

router.delete("/adverts/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId;
    await db.execute(sql`DELETE FROM ${messagesTable} WHERE ${messagesTable.conversationId} IN (
      SELECT ${conversationsTable.publicId} FROM ${conversationsTable} WHERE ${conversationsTable.advertId} = ${publicId}
    )`);
    await db.delete(conversationsTable).where(eq(conversationsTable.advertId, publicId));
    await db.delete(advertsTable).where(eq(advertsTable.publicId, publicId));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete advert");
    res.status(500).json({ error: "Failed to delete advert" });
  }
});

export default router;
