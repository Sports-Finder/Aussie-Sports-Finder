import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profileImagesTable = pgTable("profile_images", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  owner: text("owner").notNull(),
  uri: text("uri").notNull(),
  status: text("status").notNull().default("pending"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileImageSchema = createInsertSchema(profileImagesTable).omit({
  id: true,
  submittedAt: true,
});

export type InsertProfileImage = z.infer<typeof insertProfileImageSchema>;
export type ProfileImage = typeof profileImagesTable.$inferSelect;
