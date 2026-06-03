import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * Server-side moderator sessions.
 * Created by an admin for a specific moderator to grant server-verified
 * access to the flagged conversations queue (closeChats permission).
 * Tokens are opaque random strings — never derived from passcodes.
 */
export const moderatorSessionsTable = pgTable("moderator_sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  closeChats: boolean("close_chats").notNull().default(false),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ModeratorSession = typeof moderatorSessionsTable.$inferSelect;
