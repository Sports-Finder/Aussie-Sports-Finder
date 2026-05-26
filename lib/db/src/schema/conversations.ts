import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  advertId: text("advert_id").notNull(),
  advertTitle: text("advert_title"),
  ownerAccountId: text("owner_account_id"),
  initiatorAccountId: text("initiator_account_id"),
  clubName: text("club_name").notNull(),
  playerName: text("player_name").notNull(),
  status: text("status").notNull().default("pending"),
  hasUnread: boolean("has_unread").default(false),
  sport: text("sport"),
  requesterLocation: text("requester_location"),
  requesterType: text("requester_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  conversationId: text("conversation_id").notNull(),
  senderAccountId: text("sender_account_id"),
  sender: text("sender").notNull(),
  body: text("body").notNull(),
  isSystem: boolean("is_system").default(false),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
