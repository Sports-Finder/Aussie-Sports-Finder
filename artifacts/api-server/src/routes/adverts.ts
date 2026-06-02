import { Router, type IRouter } from "express";
import { and, eq, gt, lt, isNotNull, sql } from "drizzle-orm";
import { db, advertsTable, accountsTable, conversationsTable, messagesTable, type InsertAdvert } from "@workspace/db";
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
    const now = new Date();
    const cutoff = new Date(now.getTime() - COOLDOWN_MS);

    // Determine if this is a paid club poster.
    // Prefer the server-side account record as the trusted source; fall back to
    // the client-provided hint only when the account has not yet been synced to
    // the server DB (e.g. first advert posted immediately after sign-up).
    let isPaidClub = false;
    if (ownerAccountId && postedByType === "club") {
      const [ownerAccount] = await db
        .select({ subscriptionStatus: accountsTable.subscriptionStatus })
        .from(accountsTable)
        .where(eq(accountsTable.publicId, ownerAccountId))
        .limit(1);

      const serverStatus = ownerAccount?.subscriptionStatus;
      const clientStatus = body.ownerSubscriptionStatus as string | undefined;
      isPaidClub = (serverStatus ?? clientStatus) === "active";
    }

    // Duplicate prevention only applies to paid club accounts.
    // Free-trial and unsubscribed clubs are unaffected so they are never gated.
    if (isPaidClub && ownerAccountId && sport && type) {
      // Key lifecycle invariant:
      //   • Naturally expired adverts stay status="active" in the DB — the client
      //     stops showing them once expiresAt passes, but never sends a close event.
      //   • Admin-closed adverts have status="closed".
      // This lets us distinguish natural expiry from admin action purely by
      // checking (status="active" AND expiresAt < now).

      // 1. Active-role lock: reject if the club has a live advert for this
      //    sport + type (status="active" AND expiresAt is in the future, or
      //    expiresAt was not set which means indefinite).
      const [existingLive] = await db
        .select({ publicId: advertsTable.publicId })
        .from(advertsTable)
        .where(
          and(
            eq(advertsTable.ownerAccountId, ownerAccountId),
            eq(advertsTable.sport, sport),
            eq(advertsTable.type, type),
            eq(advertsTable.status, "active"),
            sql`(${advertsTable.expiresAt} IS NULL OR ${advertsTable.expiresAt} > ${now})`,
          ),
        )
        .limit(1);

      if (existingLive) {
        res.status(409).json({
          code: "DUPLICATE_ACTIVE",
          existingAdvertId: existingLive.publicId,
          message: "You already have an active advert for this sport and role. Edit or delete it before posting a new one.",
        });
        return;
      }

      // 2. Post-expiry cooldown: if a naturally-expired advert for the same
      //    sport + type exists within the 48h window, enforce the cooldown.
      //    Natural expiry = status="active" AND expiresAt < now (client-side
      //    expiry; the DB record was never closed by admin action).
      const [recentlyExpired] = await db
        .select({ expiresAt: advertsTable.expiresAt })
        .from(advertsTable)
        .where(
          and(
            eq(advertsTable.ownerAccountId, ownerAccountId),
            eq(advertsTable.sport, sport),
            eq(advertsTable.type, type),
            eq(advertsTable.status, "active"),
            isNotNull(advertsTable.expiresAt),
            lt(advertsTable.expiresAt, now),
            gt(advertsTable.expiresAt, cutoff),
          ),
        )
        .orderBy(sql`${advertsTable.expiresAt} DESC`)
        .limit(1);

      if (recentlyExpired?.expiresAt) {
        const repostAvailableAt = new Date(
          recentlyExpired.expiresAt.getTime() + COOLDOWN_MS,
        ).toISOString();
        res.status(409).json({
          code: "REPOST_COOLDOWN",
          repostAvailableAt,
          message: `You must wait 48 hours after an advert expires before reposting the same sport and role. You can repost at ${repostAvailableAt}.`,
        });
        return;
      }

      // 3. Soft-flag: if any naturally-expired advert for the same sport
      //    (any role) exists within the 48h window, flag for admin review.
      const [anyRecentlyExpired] = await db
        .select({ publicId: advertsTable.publicId })
        .from(advertsTable)
        .where(
          and(
            eq(advertsTable.ownerAccountId, ownerAccountId),
            eq(advertsTable.sport, sport),
            eq(advertsTable.status, "active"),
            isNotNull(advertsTable.expiresAt),
            lt(advertsTable.expiresAt, now),
            gt(advertsTable.expiresAt, cutoff),
          ),
        )
        .limit(1);

      if (anyRecentlyExpired) {
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
