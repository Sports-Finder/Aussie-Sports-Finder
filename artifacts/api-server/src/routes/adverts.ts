import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, advertsTable, conversationsTable, messagesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapAdvert } from "../lib/mapDbToApi";
import { normalizeDates } from "../lib/normalizeDates";

const router: IRouter = Router();

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
    const body = req.body;
    const [created] = await db.insert(advertsTable).values(body).returning();
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
