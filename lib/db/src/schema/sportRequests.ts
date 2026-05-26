import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sportRequestsTable = pgTable("sport_requests", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSportRequestSchema = createInsertSchema(sportRequestsTable).omit({
  id: true,
  requestedAt: true,
});

export type InsertSportRequest = z.infer<typeof insertSportRequestSchema>;
export type SportRequest = typeof sportRequestsTable.$inferSelect;
