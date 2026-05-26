import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bannedEmailsTable = pgTable("banned_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  bannedAt: timestamp("banned_at", { withTimezone: true }).notNull().defaultNow(),
  reason: text("reason"),
});

export const insertBannedEmailSchema = createInsertSchema(bannedEmailsTable).omit({
  id: true,
  bannedAt: true,
});

export type InsertBannedEmail = z.infer<typeof insertBannedEmailSchema>;
export type BannedEmail = typeof bannedEmailsTable.$inferSelect;
