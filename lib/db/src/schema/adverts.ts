import { pgTable, text, real, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
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
  trainingTbd: boolean("training_tbd"),
  gameDays: jsonb("game_days").$type<string[]>(),
  gameTimeFrom: text("game_time_from"),
  gameTimeTo: text("game_time_to"),
  gameTbd: boolean("game_tbd"),
  scheduleNote: text("schedule_note"),
  trialSlots: jsonb("trial_slots").$type<{ date: string; timeFrom: string; timeTo: string }[]>(),
  coachRole: text("coach_role"),
  coachExperienceLevel: text("coach_experience_level"),
  coachPositionTypes: jsonb("coach_position_types").$type<string[]>(),
  coachSalary: real("coach_salary"),
  coachSalaryTbc: boolean("coach_salary_tbc"),
  seasonFees: real("season_fees"),
  feesNegotiable: boolean("fees_negotiable"),
  feesFree: boolean("fees_free"),
  trialRequired: boolean("trial_required"),
  teamGender: text("team_gender"),
  playerGender: text("player_gender"),
  affiliatedClubId: text("affiliated_club_id"),
  status: text("status").notNull().default("active"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedReason: text("closed_reason"),
  bumpedAt: timestamp("bumped_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  originalExpiresAt: timestamp("original_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdvertSchema = createInsertSchema(advertsTable)
  .omit({ id: true, createdAt: true })
  .extend({
    positions: z.array(z.string()).optional(),
    trainingDays: z.array(z.string()).optional(),
    gameDays: z.array(z.string()).optional(),
    coachPositionTypes: z.array(z.string()).optional(),
    trialSlots: z
      .array(z.object({ date: z.string(), timeFrom: z.string(), timeTo: z.string() }))
      .optional(),
  });

export type InsertAdvert = z.infer<typeof insertAdvertSchema>;
export type Advert = typeof advertsTable.$inferSelect;
