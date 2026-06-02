import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, coachAffiliatesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapCoachAffiliate } from "../lib/mapDbToApi";
import { normalizeDates } from "../lib/normalizeDates";

const router: IRouter = Router();

router.get("/coach-affiliates", async (req, res) => {
  try {
    const { clubAccountId, coachAccountId } = req.query as Record<string, string | undefined>;
    let rows = await db.select().from(coachAffiliatesTable);
    if (clubAccountId) {
      rows = rows.filter((r) => r.clubAccountId === clubAccountId);
    }
    if (coachAccountId) {
      rows = rows.filter((r) => r.coachAccountId === coachAccountId);
    }
    res.json(rows.map((r) => mapCoachAffiliate(r as unknown as Record<string, unknown>)));
  } catch (err) {
    logger.error({ err }, "Failed to fetch coach affiliates");
    res.status(500).json({ error: "Failed to fetch coach affiliates" });
  }
});

router.post("/coach-affiliates", async (req, res) => {
  try {
    const body = normalizeDates(req.body, ["rejectedAt", "requestedAt"]);
    const [created] = await db.insert(coachAffiliatesTable).values(body).returning();
    res.status(201).json(mapCoachAffiliate(created as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to create coach affiliate");
    res.status(500).json({ error: "Failed to create coach affiliate" });
  }
});

router.put("/coach-affiliates/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId;
    const body = normalizeDates(req.body, ["rejectedAt", "requestedAt"]);
    const [updated] = await db
      .update(coachAffiliatesTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(coachAffiliatesTable.publicId, publicId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Coach affiliate not found" });
      return;
    }
    res.json(mapCoachAffiliate(updated as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, "Failed to update coach affiliate");
    res.status(500).json({ error: "Failed to update coach affiliate" });
  }
});

router.delete("/coach-affiliates/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId;
    await db
      .delete(coachAffiliatesTable)
      .where(eq(coachAffiliatesTable.publicId, publicId));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete coach affiliate");
    res.status(500).json({ error: "Failed to delete coach affiliate" });
  }
});

router.delete("/coach-affiliates", async (req, res) => {
  try {
    const { clubAccountId, coachAccountId } = req.query as Record<string, string | undefined>;
    if (!clubAccountId || !coachAccountId) {
      res.status(400).json({ error: "clubAccountId and coachAccountId are required" });
      return;
    }
    await db
      .delete(coachAffiliatesTable)
      .where(
        and(
          eq(coachAffiliatesTable.clubAccountId, clubAccountId),
          eq(coachAffiliatesTable.coachAccountId, coachAccountId),
        ),
      );
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete coach affiliate by pair");
    res.status(500).json({ error: "Failed to delete coach affiliate" });
  }
});

export default router;
