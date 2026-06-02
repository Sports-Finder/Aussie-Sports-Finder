import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coachAffiliatesTable = pgTable("coach_affiliates", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  clubAccountId: text("club_account_id").notNull(),
  coachAccountId: text("coach_account_id").notNull(),
  teamName: text("team_name"),
  ageGroup: text("age_group"),
  status: text("status").notNull().default("pending"),
  rejectionCount: integer("rejection_count").notNull().default(0),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCoachAffiliateSchema = createInsertSchema(coachAffiliatesTable).omit({
  id: true,
});

export type InsertCoachAffiliate = z.infer<typeof insertCoachAffiliateSchema>;
export type CoachAffiliate = typeof coachAffiliatesTable.$inferSelect;
