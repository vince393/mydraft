import { pgTable, text, varchar, timestamp, boolean, serial, integer, jsonb, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Session table for connect-pg-simple (express-session)
// This table is managed by connect-pg-simple, not Drizzle
// We define it here to prevent drizzle-kit from trying to delete it
export const userSessions = pgTable("user_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

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
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  plan: text("plan").$type<Plan>().default("free").notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  aiPreferences: jsonb("ai_preferences").$type<AiPreferences>(),
  emailSignature: text("email_signature"),
  signatureEnabled: boolean("signature_enabled").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
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
  userId: varchar("user_id"),
  emailId: integer("email_id"),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
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
  canReadEmails: boolean("can_read_emails").default(false).notNull(),
  canDraftEmails: boolean("can_draft_emails").default(false).notNull(),
  canSendEmails: boolean("can_send_emails").default(false).notNull(),
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

// AI usage tracking for free plan limits
export const aiUsage = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  usageDate: text("usage_date").notNull(), // YYYY-MM-DD format for daily tracking
  draftsGenerated: integer("drafts_generated").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAiUsageSchema = createInsertSchema(aiUsage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AiUsage = typeof aiUsage.$inferSelect;
export type InsertAiUsage = z.infer<typeof insertAiUsageSchema>;

// Expense categories for tracking service costs
export const expenseCategorySchema = z.enum([
  "replit",
  "nylas",
  "openai",
  "stripe",
  "other"
]);
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

// Service expenses tracking
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").$type<ExpenseCategory>().notNull(),
  serviceName: text("service_name").notNull(), // e.g., "Replit Core", "Nylas API", "OpenAI GPT-4"
  amount: bigint("amount", { mode: "number" }).notNull(), // Amount in cents
  currency: text("currency").default("USD").notNull(),
  description: text("description"),
  billingPeriod: text("billing_period"), // "monthly", "daily", "per-usage"
  expenseDate: timestamp("expense_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  invoiceId: text("invoice_id"), // External invoice reference
  isRecurring: boolean("is_recurring").default(false).notNull(),
  metadata: jsonb("metadata").$type<{
    usageDetails?: string;
    invoiceUrl?: string;
    apiCalls?: number;
    tokensUsed?: number;
  }>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Revenue tracking from subscriptions
export const revenue = pgTable("revenue", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  userEmail: text("user_email"),
  plan: text("plan").$type<Plan>().notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(), // Amount in cents
  currency: text("currency").default("USD").notNull(),
  type: text("type").default("subscription").notNull(), // "subscription", "one-time", "refund"
  stripePaymentId: text("stripe_payment_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  description: text("description"),
  revenueDate: timestamp("revenue_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertRevenueSchema = createInsertSchema(revenue).omit({
  id: true,
  createdAt: true,
});

export type Revenue = typeof revenue.$inferSelect;
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;

// Daily financial summary for quick dashboard
export const dailyFinancials = pgTable("daily_financials", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(), // YYYY-MM-DD format
  totalExpenses: bigint("total_expenses", { mode: "number" }).default(0).notNull(),
  totalRevenue: bigint("total_revenue", { mode: "number" }).default(0).notNull(),
  netProfit: bigint("net_profit", { mode: "number" }).default(0).notNull(),
  expenseBreakdown: jsonb("expense_breakdown").$type<{
    replit?: number;
    nylas?: number;
    openai?: number;
    stripe?: number;
    other?: number;
  }>(),
  revenueBreakdown: jsonb("revenue_breakdown").$type<{
    free?: number;
    pro?: number;
    premium?: number;
  }>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type DailyFinancials = typeof dailyFinancials.$inferSelect;

// Verification codes for 2FA and email verification
export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(), // "signup", "login", "action"
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  used: true,
  createdAt: true,
});

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;

// User login sessions for session management
export const userLoginSessions = pgTable("user_login_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  sessionId: varchar("session_id").notNull(), // Links to express-session sid
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  city: text("city"),
  region: text("region"), // State/Province
  country: text("country"),
  lastActiveAt: timestamp("last_active_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserLoginSessionSchema = createInsertSchema(userLoginSessions).omit({
  id: true,
  lastActiveAt: true,
  createdAt: true,
});

export type UserLoginSession = typeof userLoginSessions.$inferSelect;
export type InsertUserLoginSession = z.infer<typeof insertUserLoginSessionSchema>;

// Writing samples for AI personalization learning
export const writingSamples = pgTable("writing_samples", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  sampleType: text("sample_type").notNull(), // "sent_email", "draft_edit", "manual_compose"
  originalContent: text("original_content"), // For draft_edit: the AI-generated content before editing
  finalContent: text("final_content").notNull(), // The user's actual written/edited content
  context: text("context"), // Subject line or email context
  recipientType: text("recipient_type"), // "work", "personal", "unknown"
  sentiment: text("sentiment"), // "formal", "casual", "friendly", "professional"
  wordCount: integer("word_count").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertWritingSampleSchema = createInsertSchema(writingSamples).omit({
  id: true,
  createdAt: true,
});

export type WritingSample = typeof writingSamples.$inferSelect;
export type InsertWritingSample = z.infer<typeof insertWritingSampleSchema>;

// Learned writing style analysis (AI-generated summary of user's style)
export const learnedWritingStyles = pgTable("learned_writing_styles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  styleAnalysis: text("style_analysis").notNull(), // AI-generated analysis of writing patterns
  commonPhrases: jsonb("common_phrases").$type<string[]>().default([]),
  greetingPatterns: jsonb("greeting_patterns").$type<string[]>().default([]),
  signOffPatterns: jsonb("sign_off_patterns").$type<string[]>().default([]),
  toneDescription: text("tone_description"), // Brief description of user's tone
  avgSentenceLength: integer("avg_sentence_length"),
  samplesAnalyzed: integer("samples_analyzed").default(0).notNull(),
  lastAnalyzedAt: timestamp("last_analyzed_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertLearnedWritingStyleSchema = createInsertSchema(learnedWritingStyles).omit({
  id: true,
  lastAnalyzedAt: true,
  updatedAt: true,
});

export type LearnedWritingStyle = typeof learnedWritingStyles.$inferSelect;
export type InsertLearnedWritingStyle = z.infer<typeof insertLearnedWritingStyleSchema>;

// Email notes - sticky notes for individual emails
export const emailNotes = pgTable("email_notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  messageId: varchar("message_id").notNull(), // Nylas message ID
  content: text("content").notNull(),
  color: text("color").default("#FEF3C7").notNull(), // Default warm yellow
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertEmailNoteSchema = createInsertSchema(emailNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EmailNote = typeof emailNotes.$inferSelect;
export type InsertEmailNote = z.infer<typeof insertEmailNoteSchema>;

// AI inbox suggestions - pending actions that need user approval
export const aiInboxSuggestions = pgTable("ai_inbox_suggestions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  batchId: varchar("batch_id").notNull(), // Groups suggestions from same refresh
  messageId: varchar("message_id").notNull(), // Nylas message ID
  messageSubject: text("message_subject"),
  messageSender: text("message_sender"),
  actionType: text("action_type").notNull(), // "spam", "archive", "delete", "star", "move_folder", "mark_read"
  actionData: jsonb("action_data").$type<{ folder?: string; reason?: string }>(),
  confidence: integer("confidence").default(0).notNull(), // 0-100
  status: text("status").default("pending").notNull(), // "pending", "approved", "rejected", "executed"
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  executedAt: timestamp("executed_at"),
});

export const insertAiInboxSuggestionSchema = createInsertSchema(aiInboxSuggestions).omit({
  id: true,
  createdAt: true,
  executedAt: true,
});

export type AiInboxSuggestion = typeof aiInboxSuggestions.$inferSelect;
export type InsertAiInboxSuggestion = z.infer<typeof insertAiInboxSuggestionSchema>;
