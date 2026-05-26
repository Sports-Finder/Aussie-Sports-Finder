import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profileImagesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { mapProfileImage } from "../lib/mapDbToApi";

const router: IRouter = Router();

router.get("/profile-images", async (_req, res) => {
  try {
    const rows = await db.select().from(profileImagesTable);
    res.json(rows.map(mapProfileImage));
  } catch (err) {
    logger.error({ err }, "Failed to fetch profile images");
    res.status(500).json({ error: "Failed to fetch profile images" });
  }
});

router.post("/profile-images", async (req, res) => {
  try {
    const [created] = await db.insert(profileImagesTable).values(req.body).returning();
    res.status(201).json(mapProfileImage(created));
  } catch (err) {
    logger.error({ err }, "Failed to create profile image");
    res.status(500).json({ error: "Failed to create profile image" });
  }
});

router.put("/profile-images/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId;
    const [updated] = await db
      .update(profileImagesTable)
      .set(req.body)
      .where(eq(profileImagesTable.publicId, publicId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    res.json(mapProfileImage(updated));
  } catch (err) {
    logger.error({ err }, "Failed to update profile image");
    res.status(500).json({ error: "Failed to update profile image" });
  }
});

export default router;
