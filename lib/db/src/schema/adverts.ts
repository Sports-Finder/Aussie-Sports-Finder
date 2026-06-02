import { pgTable, text, real, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const advertsTable = pgTable("adverts", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  ownerAccountId: text("owner_account_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  sport: text("sport").notNull(),
  location: text("location").notNull(),
  distanceKm: real("distance_km").notNull().default(0),
  postedBy: text("posted_by").notNull(),
  postedByType: text("posted_by_type").notNull(),
  level: text("level").notNull(),
  availability: text("availability").notNull(),
  description: text("description").notNull(),
  needs: text("needs").notNull(),
  ageGroup: text("age_group"),
  preferredAge: real("preferred_age"),
  positions: jsonb("positions").$type<string[]>(),
  playerDescription: text("player_description"),
  trainingDays: jsonb("training_days").$type<string[]>(),
  trainingTimeFrom: text("training_time_from"),
  trainingTimeTo: text("training_time_to"),
  teamGender: text("team_gender"),
  status: text("status").notNull().default("active"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedReason: text("closed_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdvertSchema = createInsertSchema(advertsTable)
  .omit({ id: true, createdAt: true })
  .extend({
    positions: z.array(z.string()).optional(),
    trainingDays: z.array(z.string()).optional(),
  });

export type InsertAdvert = z.infer<typeof insertAdvertSchema>;
export type Advert = typeof advertsTable.$inferSelect;
