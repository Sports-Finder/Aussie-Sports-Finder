import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sportRequestsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapSportRequest } from "../lib/mapDbToApi";
import { normalizeDates } from "../lib/normalizeDates";

const router: IRouter = Router();

router.get("/sport-requests", async (_req, res) => {
  try {
    const rows = await db.select().from(sportRequestsTable);
    res.json(rows.map(mapSportRequest));
  } catch (err) {
    logger.error({ err }, "Failed to fetch sport requests");
    res.status(500).json({ error: "Failed to fetch sport requests" });
  }
});

router.post("/sport-requests", async (req, res) => {
  try {
    const [created] = await db.insert(sportRequestsTable).values(req.body).returning();
    res.status(201).json(mapSportRequest(created));
  } catch (err) {
    logger.error({ err }, "Failed to create sport request");
    res.status(500).json({ error: "Failed to create sport request" });
  }
});

router.put("/sport-requests/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId;
    const body = normalizeDates(req.body, ["requestedAt"]);
    const [updated] = await db
      .update(sportRequestsTable)
      .set(body)
      .where(eq(sportRequestsTable.publicId, publicId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Sport request not found" });
      return;
    }
    res.json(mapSportRequest(updated));
  } catch (err) {
    logger.error({ err }, "Failed to update sport request");
    res.status(500).json({ error: "Failed to update sport request" });
  }
});

export default router;
