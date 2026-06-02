import { Router, type IRouter } from "express";
import { and, eq, gt, lt, isNotNull, sql } from "drizzle-orm";
import { db, advertsTable, accountsTable, conversationsTable, messagesTable, type InsertAdvert } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapAdvert } from "../lib/mapDbToApi";
import { normalizeDates } from "../lib/normalizeDates";

const router: IRouter = Router();

const CLUB_COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours — clubs
const PLAYER_COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72 hours — paid players & coaches

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

    // Look up the account once — used by both player/coach and club checks.
    let ownerAccount: { subscriptionStatus: string | null; lastAdvertClosedAt: Date | null } | undefined;
    if (ownerAccountId) {
      const [row] = await db
        .select({ subscriptionStatus: accountsTable.subscriptionStatus, lastAdvertClosedAt: accountsTable.lastAdvertClosedAt })
        .from(accountsTable)
        .where(eq(accountsTable.publicId, ownerAccountId))
        .limit(1);
      ownerAccount = row;
    }

    const clientSubscriptionStatus = body.ownerSubscriptionStatus as string | undefined;
    const serverSubscriptionStatus = ownerAccount?.subscriptionStatus ?? null;
    const resolvedStatus = serverSubscriptionStatus ?? clientSubscriptionStatus;
    const isPaid = resolvedStatus === "active";

    // ── Player / coach 72h repost cooldown ──────────────────────────────────
    // Applies to paid player and coach accounts only. Prevents gaming expiry
    // by closing then immediately reposting to stay at the top of the list.
    if (isPaid && ownerAccountId && postedByType !== "club") {
      const lastClosed = ownerAccount?.lastAdvertClosedAt;
      if (lastClosed) {
        const repostAvailableAt = new Date(lastClosed.getTime() + PLAYER_COOLDOWN_MS);
        if (repostAvailableAt > now) {
          res.status(409).json({
            code: "PLAYER_COOLDOWN",
            repostAvailableAt: repostAvailableAt.toISOString(),
            message: `You must wait 72 hours after closing an advert before posting a new one. You can post again at ${repostAvailableAt.toISOString()}.`,
          });
          return;
        }
      }
    }

    // ── Club duplicate / expiry-cooldown checks ──────────────────────────────
    // Applies to paid club accounts only. Free/trial clubs are unaffected.
    const isPaidClub = isPaid && postedByType === "club";
    if (isPaidClub && ownerAccountId && sport && type) {
      const clubCutoff = new Date(now.getTime() - CLUB_COOLDOWN_MS);

      // Key lifecycle invariant:
      //   • Naturally expired adverts stay status="active" in the DB — the client
      //     stops showing them once expiresAt passes, but never sends a close event.
      //   • Admin-closed adverts have status="closed".

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
            gt(advertsTable.expiresAt, clubCutoff),
          ),
        )
        .orderBy(sql`${advertsTable.expiresAt} DESC`)
        .limit(1);

      if (recentlyExpired?.expiresAt) {
        const repostAvailableAt = new Date(
          recentlyExpired.expiresAt.getTime() + CLUB_COOLDOWN_MS,
        ).toISOString();
        res.status(409).json({
          code: "REPOST_COOLDOWN",
          repostAvailableAt,
          message: `You must wait 48 hours after an advert expires before reposting the same sport and role. You can repost at ${repostAvailableAt}.`,
        });
        return;
      }

      // 3. Soft-flag: if any naturally-expired advert for the same sport
      //    exists within the 48h window, flag for admin review.
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
            gt(advertsTable.expiresAt, clubCutoff),
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

    // Before deleting, look up the advert and owner so we can record
    // lastAdvertClosedAt for paid player/coach accounts.
    const [advert] = await db
      .select({ ownerAccountId: advertsTable.ownerAccountId, postedByType: advertsTable.postedByType })
      .from(advertsTable)
      .where(eq(advertsTable.publicId, publicId))
      .limit(1);

    await db.execute(sql`DELETE FROM ${messagesTable} WHERE ${messagesTable.conversationId} IN (
      SELECT ${conversationsTable.publicId} FROM ${conversationsTable} WHERE ${conversationsTable.advertId} = ${publicId}
    )`);
    await db.delete(conversationsTable).where(eq(conversationsTable.advertId, publicId));
    await db.delete(advertsTable).where(eq(advertsTable.publicId, publicId));

    // Record close timestamp for paid player/coach accounts so the 72h
    // cooldown can be enforced on their next post attempt.
    if (advert?.ownerAccountId && advert.postedByType !== "club") {
      const [ownerAcc] = await db
        .select({ subscriptionStatus: accountsTable.subscriptionStatus })
        .from(accountsTable)
        .where(eq(accountsTable.publicId, advert.ownerAccountId))
        .limit(1);
      if (ownerAcc?.subscriptionStatus === "active") {
        await db
          .update(accountsTable)
          .set({ lastAdvertClosedAt: new Date(), updatedAt: new Date() })
          .where(eq(accountsTable.publicId, advert.ownerAccountId));
      }
    }

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete advert");
    res.status(500).json({ error: "Failed to delete advert" });
  }
});

export default router;
