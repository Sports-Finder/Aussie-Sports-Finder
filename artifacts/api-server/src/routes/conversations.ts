import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, conversationsTable, messagesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapConversation, mapMessage } from "../lib/mapDbToApi";
import { normalizeDates } from "../lib/normalizeDates";

const router: IRouter = Router();

router.get("/conversations", async (_req, res) => {
  try {
    const convs = await db.select().from(conversationsTable);
    const msgs = await db.select().from(messagesTable);
    const result = convs.map((c) => ({
      ...mapConversation(c),
      messages: msgs
        .filter((m) => m.conversationId === c.publicId)
        .map(mapMessage)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }));
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
    const conv = await db.select().from(conversationsTable).where(eq(conversationsTable.publicId, publicId));
    if (conv.length === 0) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const [msg] = await db
      .insert(messagesTable)
      .values({ ...req.body, conversationId: publicId })
      .returning();
    res.status(201).json(mapMessage(msg));
  } catch (err) {
    logger.error({ err }, "Failed to create message");
    res.status(500).json({ error: "Failed to create message" });
  }
});

export default router;
