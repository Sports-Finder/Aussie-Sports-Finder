import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

/**
 * Admin and moderator Expo push tokens.
 *
 * Stored server-side so the server can send an immediate push notification
 * the moment a HIGH-severity flag fires (without waiting for the device to poll).
 * Each device that logs in as admin registers its Expo push token here.
 * Tokens are removed when the admin/moderator logs out.
 */
export const adminPushTokensTable = pgTable("admin_push_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminPushToken = typeof adminPushTokensTable.$inferSelect;
