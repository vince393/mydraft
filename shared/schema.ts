import { pgTable, text, varchar, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  sender: text("sender").notNull(),
  senderEmail: text("sender_email").notNull(),
  subject: text("subject").notNull(),
  preview: text("preview").notNull(),
  body: text("body").notNull(),
  receivedAt: timestamp("received_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  isStarred: boolean("is_starred").default(false).notNull(),
  folder: text("folder").default("inbox").notNull(),
  threadId: varchar("thread_id"),
  avatarColor: text("avatar_color").default("#3B82F6").notNull(),
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  receivedAt: true,
});

export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;

export const drafts = pgTable("drafts", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").notNull(),
  content: text("content").notNull(),
  isAiGenerated: boolean("is_ai_generated").default(true).notNull(),
  status: text("status").default("draft").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertDraftSchema = createInsertSchema(drafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Draft = typeof drafts.$inferSelect;
export type InsertDraft = z.infer<typeof insertDraftSchema>;

export const nylasGrants = pgTable("nylas_grants", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  grantId: varchar("grant_id").notNull(),
  provider: text("provider").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertNylasGrantSchema = createInsertSchema(nylasGrants).omit({
  id: true,
  createdAt: true,
});

export type NylasGrant = typeof nylasGrants.$inferSelect;
export type InsertNylasGrant = z.infer<typeof insertNylasGrantSchema>;
