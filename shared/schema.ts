import { pgTable, text, varchar, timestamp, boolean, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const aiPreferencesSchema = z.object({
  primaryUse: z.enum(["work", "personal", "both"]).optional(),
  emailVolume: z.enum(["low", "medium", "high", "very-high"]).optional(),
  aiFeatures: z.array(z.enum(["auto-draft", "suggest-replies", "summarize", "auto-label"])).optional(),
  automationLevel: z.enum(["low", "medium", "high"]).optional(),
  replyTone: z.enum(["professional", "friendly", "concise", "custom"]).optional(),
  customTone: z.string().optional(),
  referralSource: z.enum(["search", "social", "friend", "blog", "podcast", "ad", "other"]).optional(),
  referralOther: z.string().optional(),
});

export type AiPreferences = z.infer<typeof aiPreferencesSchema>;

export const planSchema = z.enum(["free", "pro", "premium"]);
export type Plan = z.infer<typeof planSchema>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  plan: text("plan").$type<Plan>().default("free").notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  aiPreferences: jsonb("ai_preferences").$type<AiPreferences>(),
  emailSignature: text("email_signature"),
  signatureEnabled: boolean("signature_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
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

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;

// Assistant settings per user
export const assistantSettings = pgTable("assistant_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  selectedVoice: text("selected_voice").default("vince").notNull(),
  voiceOutputEnabled: boolean("voice_output_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAssistantSettingsSchema = createInsertSchema(assistantSettings).omit({
  id: true,
  updatedAt: true,
});

export type AssistantSettings = typeof assistantSettings.$inferSelect;
export type InsertAssistantSettings = z.infer<typeof insertAssistantSettingsSchema>;

// Chat sessions for conversation history
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").default("New Chat").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

// Pending email sends for undo functionality
export const pendingSendPayloadSchema = z.object({
  to: z.array(z.string()),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string(),
  body: z.string(),
  threadId: z.string().optional(),
  replyToMessageId: z.string().optional(),
});

export type PendingSendPayload = z.infer<typeof pendingSendPayloadSchema>;

export const pendingSends = pgTable("pending_sends", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  grantId: varchar("grant_id").notNull(),
  payload: jsonb("payload").$type<PendingSendPayload>().notNull(),
  scheduledSendAt: timestamp("scheduled_send_at").notNull(),
  delaySeconds: integer("delay_seconds").default(5).notNull(),
  status: text("status").default("pending").notNull(), // pending, cancelled, sent, failed
  sentAt: timestamp("sent_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPendingSendSchema = createInsertSchema(pendingSends).omit({
  id: true,
  sentAt: true,
  failedAt: true,
  errorMessage: true,
  createdAt: true,
});

export type PendingSend = typeof pendingSends.$inferSelect;
export type InsertPendingSend = z.infer<typeof insertPendingSendSchema>;

// Assistant conversation messages
export const assistantMessages = pgTable("assistant_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  sessionId: integer("session_id"),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAssistantMessageSchema = createInsertSchema(assistantMessages).omit({
  id: true,
  createdAt: true,
});

export type AssistantMessage = typeof assistantMessages.$inferSelect;
export type InsertAssistantMessage = z.infer<typeof insertAssistantMessageSchema>;

// User feedback submissions
export const userFeedback = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  feedbackType: text("feedback_type").notNull(), // "feature_request", "bug_report", "general"
  message: text("message").notNull(),
  status: text("status").default("pending").notNull(), // "pending", "reviewed", "resolved"
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;

// User style profile for AI personalization
export const userStyleProfileSchema = z.object({
  tone: z.enum(["professional", "friendly", "concise", "casual", "custom"]).default("professional"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  greetingStyle: z.enum(["none", "hi", "name", "formal"]).default("hi"),
  signOff: z.string().default("Best regards"),
  formattingPreference: z.enum(["bullets", "paragraphs", "mixed"]).default("paragraphs"),
  allowedActions: z.enum(["draft-only", "can-queue-actions"]).default("draft-only"),
  customInstructions: z.string().optional(),
});

export type UserStyleProfile = z.infer<typeof userStyleProfileSchema>;

export const userStyleProfiles = pgTable("user_style_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  profile: jsonb("profile").$type<UserStyleProfile>().notNull(),
  feedbackScore: integer("feedback_score").default(0).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserStyleProfileSchema = createInsertSchema(userStyleProfiles).omit({
  id: true,
  updatedAt: true,
});

export type UserStyleProfileRecord = typeof userStyleProfiles.$inferSelect;
export type InsertUserStyleProfile = z.infer<typeof insertUserStyleProfileSchema>;

// Assistant actions for confirmation workflow
export const assistantActions = pgTable("assistant_actions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  assistantMessageId: integer("assistant_message_id"),
  actionType: text("action_type").notNull(), // "send", "reply", "reply-all", "forward", "compose", "trash", "archive", "mark-read"
  status: text("status").default("pending").notNull(), // "pending", "confirmed", "cancelled", "executed"
  metadata: jsonb("metadata").$type<{
    messageId?: string;
    threadId?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
    originalMessageId?: string;
  }>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  executedAt: timestamp("executed_at"),
});

export const insertAssistantActionSchema = createInsertSchema(assistantActions).omit({
  id: true,
  createdAt: true,
  executedAt: true,
});

export type AssistantAction = typeof assistantActions.$inferSelect;
export type InsertAssistantAction = z.infer<typeof insertAssistantActionSchema>;

// Assistant message feedback for learning
export const assistantFeedback = pgTable("assistant_feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  assistantMessageId: integer("assistant_message_id").notNull(),
  rating: text("rating"), // "up", "down"
  tags: text("tags").array(), // ["too_long", "too_short", "too_formal", "too_casual", "wrong_intent", "hallucinated", "great"]
  comment: text("comment"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAssistantFeedbackSchema = createInsertSchema(assistantFeedback).omit({
  id: true,
  createdAt: true,
});

export type AssistantFeedbackRecord = typeof assistantFeedback.$inferSelect;
export type InsertAssistantFeedback = z.infer<typeof insertAssistantFeedbackSchema>;

// Message summary cache for AI performance
export const messageSummaryCache = pgTable("message_summary_cache", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  messageId: varchar("message_id").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type MessageSummaryCache = typeof messageSummaryCache.$inferSelect;

// Assistant permissions for security controls
export const assistantPermissionsSchema = z.object({
  canReadEmails: z.boolean().default(true),
  canSendEmails: z.boolean().default(false),
  canArchive: z.boolean().default(false),
  canTrash: z.boolean().default(false),
  canSearch: z.boolean().default(true),
  requireConfirmation: z.boolean().default(true),
  maxEmailsPerDay: z.number().default(10),
});

export type AssistantPermissions = z.infer<typeof assistantPermissionsSchema>;

export const assistantPermissions = pgTable("assistant_permissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  permissions: jsonb("permissions").$type<AssistantPermissions>().notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type AssistantPermissionsRecord = typeof assistantPermissions.$inferSelect;

// Audit log for security tracking
export const assistantAuditLog = pgTable("assistant_audit_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  actionType: text("action_type").notNull(), // "read", "send", "archive", "trash", "search"
  targetMessageId: varchar("target_message_id"),
  targetThreadId: varchar("target_thread_id"),
  status: text("status").notNull(), // "initiated", "confirmed", "executed", "cancelled", "failed"
  details: text("details"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type AssistantAuditLogRecord = typeof assistantAuditLog.$inferSelect;

// Team invites for Business plan
export const teamInvites = pgTable("team_invites", {
  id: serial("id").primaryKey(),
  inviterId: varchar("inviter_id").notNull(), // User who sent the invite
  inviteeId: varchar("invitee_id").notNull(), // User who received the invite
  status: text("status").default("pending").notNull(), // pending, accepted, declined
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  respondedAt: timestamp("responded_at"),
});

export const insertTeamInviteSchema = createInsertSchema(teamInvites).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export type TeamInvite = typeof teamInvites.$inferSelect;
export type InsertTeamInvite = z.infer<typeof insertTeamInviteSchema>;

// Team memberships (owner + 1 member max for Business)
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  ownerId: varchar("owner_id").notNull(), // The Business plan account owner
  memberId: varchar("member_id").notNull(), // The invited team member
  role: text("role").default("member").notNull(), // owner, member
  joinedAt: timestamp("joined_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;

// Notifications for all users
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // team_invite_received, team_invite_accepted, team_invite_declined
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  data: jsonb("data").$type<{ inviteId?: number; inviterId?: string; inviterEmail?: string }>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Activity logs for owner panel
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  userEmail: text("user_email"),
  actionType: text("action_type").notNull(), // signup, plan_upgrade, plan_downgrade, team_invite_sent, team_invite_accepted, login, email_connected
  details: text("details"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
