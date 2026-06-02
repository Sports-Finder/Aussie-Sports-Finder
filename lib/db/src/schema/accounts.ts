import { pgTable, text, timestamp, jsonb, serial, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  role: varchar("role", { length: 20 }).notNull(),
  authMethod: varchar("auth_method", { length: 20 }).notNull(),
  email: text("email").notNull().unique(),
  socialId: text("social_id"),
  passwordHash: text("password_hash"),
  fullName: text("full_name"),
  parentGuardianName: text("parent_guardian_name"),
  playerName: text("player_name"),
  clubName: text("club_name"),
  gender: text("gender"),
  dateOfBirth: text("date_of_birth"),
  location: text("location"),
  mobile: text("mobile"),
  sports: jsonb("sports").notNull().$type<string[]>(),
  defaultSport: text("default_sport").notNull(),
  profileImageId: text("profile_image_id"),
  socialLinks: jsonb("social_links").$type<Record<string, string>>(),
  highlightReelUrl: text("highlight_reel_url"),
  highlightReelStatus: text("highlight_reel_status"),
  clubWebsite: text("club_website"),
  clubAddress: text("club_address"),
  clubSuburb: text("club_suburb"),
  clubPostcode: text("club_postcode"),
  clubContactEmail: text("club_contact_email"),
  clubContactMobile: text("club_contact_mobile"),
  profileImageDeclines: text("profile_image_declines").notNull().default("0"),
  status: text("status").notNull().default("active"),
  statusReason: text("status_reason"),
  statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
  bio: text("bio"),
  approved: boolean("approved").notNull().default(true),
  clubApprovalStatus: text("club_approval_status"),
  affiliatedClubId: text("affiliated_club_id"),
  affiliatedClubName: text("affiliated_club_name"),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  subscriptionStatus: text("subscription_status"),
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  trialExpiresAt: timestamp("trial_expires_at", { withTimezone: true }),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
  verifiedBadge: boolean("verified_badge").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    sports: z.array(z.string()),
    socialLinks: z.record(z.string(), z.string()).optional(),
  });

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
