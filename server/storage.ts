import { type User, type InsertUser, type Email, type InsertEmail, type Draft, type InsertDraft, type NylasGrant, type InsertNylasGrant, type AiPreferences, type SupportMessage, type InsertSupportMessage, type AssistantSettings, type AssistantMessage, type UserFeedback, type InsertUserFeedback, type UserStyleProfileRecord, type InsertUserStyleProfile, type UserStyleProfile, type AssistantAction, type InsertAssistantAction, type AssistantFeedbackRecord, type InsertAssistantFeedback, type MessageSummaryCache, type AssistantPermissions, type AssistantPermissionsRecord, type AssistantAuditLogRecord, type ChatSession, type PendingSend, type InsertPendingSend, type TeamInvite, type InsertTeamInvite, type TeamMember, type Notification, type InsertNotification, type ActivityLog, type AiUsage, type Expense, type InsertExpense, type Revenue, type InsertRevenue, type DailyFinancials, type ExpenseCategory, type VerificationCode, type InsertVerificationCode, type UserLoginSession, type InsertUserLoginSession, type WritingSample, type InsertWritingSample, type LearnedWritingStyle, type InsertLearnedWritingStyle, type EmailNote, type InsertEmailNote, type AiInboxSuggestion, type InsertAiInboxSuggestion, type CustomFolder, type EmailFolderAssignment, type Testimonial, type InsertTestimonial, type EmailCampaign, type InsertCampaign, type CampaignRecipient, type InsertCampaignRecipient, type SecurityAuditLogRecord, type InsertSecurityAuditLog, type LocalEmailState, type CachedEmail, type EmailActionHistory, type LinkedAccount, type FeatureFlag, type Contact, type InsertContact, type Referral, users, referrals, nylasGrants, supportMessages, assistantSettings, assistantMessages, userFeedback, userStyleProfiles, assistantActions, assistantFeedback, messageSummaryCache, assistantPermissions, assistantAuditLog, chatSessions, pendingSends, userStyleProfileSchema, assistantPermissionsSchema, teamInvites, teamMembers, notifications, activityLogs, aiUsage, expenses, revenue, dailyFinancials, verificationCodes, userLoginSessions, writingSamples, learnedWritingStyles, featureFlags, emailNotes, aiInboxSuggestions, customFolders, emailFolderAssignments, starredEmails, localEmailStates, testimonials, emailCampaigns, campaignRecipients, securityAuditLog, cachedEmails, emailActionHistory, linkedAccounts, contacts } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, lte, gte, count, sql, ne } from "drizzle-orm";
import { encryptEmailContent, decryptEmailContent } from "./encryption";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  getEmails(folder?: string): Promise<Email[]>;
  getEmail(id: number): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: number, updates: Partial<Email>): Promise<Email | undefined>;
  deleteEmail(id: number): Promise<boolean>;
  
  getDraftByEmailId(emailId: number): Promise<Draft | undefined>;
  getDraft(id: number): Promise<Draft | undefined>;
  createDraft(draft: InsertDraft): Promise<Draft>;
  updateDraft(id: number, updates: Partial<Draft>): Promise<Draft | undefined>;
  deleteDraft(id: number): Promise<boolean>;
  getScheduledDrafts(): Promise<Draft[]>;
  getUserDrafts(userId: string): Promise<Draft[]>;

  getNylasGrant(userId: string): Promise<NylasGrant | undefined>;
  getNylasGrantByEmail(email: string): Promise<NylasGrant | undefined>;
  createNylasGrant(grant: InsertNylasGrant): Promise<NylasGrant>;
  updateNylasGrant(userId: string, updates: Partial<NylasGrant>): Promise<NylasGrant | undefined>;
  deleteNylasGrant(userId: string): Promise<boolean>;

  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;

  // Assistant methods
  getAssistantSettings(userId: string): Promise<AssistantSettings | undefined>;
  upsertAssistantSettings(userId: string, updates: Partial<AssistantSettings>): Promise<AssistantSettings>;
  getAssistantMessages(userId: string, sessionId?: number): Promise<AssistantMessage[]>;
  addAssistantMessage(userId: string, role: string, content: string, sessionId?: number): Promise<AssistantMessage>;
  clearAssistantMessages(userId: string, sessionId?: number): Promise<void>;

  // Chat session methods
  getChatSessions(userId: string): Promise<ChatSession[]>;
  getActiveSession(userId: string): Promise<ChatSession | undefined>;
  createChatSession(userId: string, title?: string): Promise<ChatSession>;
  setActiveSession(userId: string, sessionId: number): Promise<void>;
  updateSessionTitle(userId: string, sessionId: number, title: string): Promise<ChatSession | undefined>;
  deleteSession(userId: string, sessionId: number): Promise<boolean>;

  // Feedback methods
  createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback>;
  getUserFeedback(userId: string): Promise<UserFeedback[]>;

  // Style profile methods
  getUserStyleProfile(userId: string): Promise<UserStyleProfileRecord | undefined>;
  upsertUserStyleProfile(userId: string, profile: Partial<UserStyleProfile>): Promise<UserStyleProfileRecord>;
  updateStyleProfileFromFeedback(userId: string, tags: string[]): Promise<void>;

  // Assistant actions methods
  createAssistantAction(action: InsertAssistantAction): Promise<AssistantAction>;
  getAssistantAction(id: number): Promise<AssistantAction | undefined>;
  getPendingAssistantActions(userId: string): Promise<AssistantAction[]>;
  updateAssistantActionStatus(id: number, status: string, executedAt?: Date): Promise<AssistantAction | undefined>;

  // Assistant feedback methods
  createAssistantFeedback(feedback: InsertAssistantFeedback): Promise<AssistantFeedbackRecord>;
  getAssistantFeedbackByMessage(assistantMessageId: number): Promise<AssistantFeedbackRecord | undefined>;

  // Message summary cache methods
  getMessageSummary(userId: string, messageId: string): Promise<MessageSummaryCache | undefined>;
  cacheMessageSummary(userId: string, messageId: string, summary: string): Promise<MessageSummaryCache>;

  // Assistant permissions methods
  getAssistantPermissions(userId: string): Promise<AssistantPermissionsRecord | undefined>;
  upsertAssistantPermissions(userId: string, permissions: Partial<AssistantPermissions>): Promise<AssistantPermissionsRecord>;

  // Audit log methods
  createAuditLog(userId: string, actionType: string, status: string, targetMessageId?: string, details?: string): Promise<AssistantAuditLogRecord>;
  getRecentAuditLogs(userId: string, limit?: number): Promise<AssistantAuditLogRecord[]>;
  
  // Security audit log methods (CASA Q52)
  createSecurityAuditLog(log: InsertSecurityAuditLog): Promise<SecurityAuditLogRecord>;
  getSecurityAuditLogs(userId?: string, limit?: number): Promise<SecurityAuditLogRecord[]>;

  // Linked accounts methods (account switching)
  getLinkedAccounts(primaryUserId: string): Promise<LinkedAccount[]>;
  addLinkedAccount(primaryUserId: string, linkedUserId: string, linkedEmail: string, linkedDisplayName?: string, linkedPlan?: string): Promise<LinkedAccount>;
  removeLinkedAccount(primaryUserId: string, linkedUserId: string): Promise<boolean>;
  isAccountLinked(primaryUserId: string, linkedUserId: string): Promise<boolean>;

  // Contacts methods (email autocomplete)
  getContacts(userId: string): Promise<Contact[]>;
  searchContacts(userId: string, query: string): Promise<Contact[]>;
  saveContact(userId: string, email: string, name?: string): Promise<Contact>;
  incrementContactUse(userId: string, email: string): Promise<void>;

  // Pending sends methods (undo send)
  createPendingSend(send: InsertPendingSend): Promise<PendingSend>;
  getPendingSend(id: number): Promise<PendingSend | undefined>;
  getPendingSendsByUser(userId: string): Promise<PendingSend[]>;
  getPendingSendsReady(): Promise<PendingSend[]>;
  cancelPendingSend(userId: string, id: number): Promise<boolean>;
  claimPendingSendForProcessing(id: number): Promise<PendingSend | undefined>;
  markPendingSendSent(id: number): Promise<PendingSend | undefined>;
  markPendingSendFailed(id: number, errorMessage: string): Promise<PendingSend | undefined>;

  // Team invite methods (Business plan)
  createTeamInvite(invite: InsertTeamInvite): Promise<TeamInvite>;
  getTeamInvite(id: number): Promise<TeamInvite | undefined>;
  getPendingInvitesForUser(inviteeId: string): Promise<TeamInvite[]>;
  getSentInvites(inviterId: string): Promise<TeamInvite[]>;
  updateTeamInviteStatus(id: number, status: string): Promise<TeamInvite | undefined>;
  
  // Team members methods
  createTeamMember(ownerId: string, memberId: string, role: string): Promise<TeamMember>;
  getTeamMembers(ownerId: string): Promise<TeamMember[]>;
  getTeamMembership(memberId: string): Promise<TeamMember | undefined>;
  removeTeamMember(ownerId: string, memberId: string): Promise<boolean>;
  getTeamMemberCount(ownerId: string): Promise<number>;

  // Notifications methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationAsRead(userId: string, notificationId: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Owner panel methods
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{ total: number; free: number; pro: number; premium: number }>;
  getAllUserFeedback(): Promise<UserFeedback[]>;
  updateFeedbackStatus(id: number, status: string): Promise<UserFeedback | undefined>;
  createActivityLog(userId: string | null, userEmail: string | null, actionType: string, details?: string, metadata?: Record<string, unknown>): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  sendNotificationToUsers(userIds: string[], type: string, title: string, message: string, data?: Record<string, unknown>): Promise<void>;
  getUsersByPlan(plan: string): Promise<User[]>;

  // AI usage tracking methods
  getAiUsageToday(userId: string): Promise<number>;
  incrementAiUsage(userId: string): Promise<void>;

  // Financial tracking methods
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpenses(startDate?: Date, endDate?: Date, category?: ExpenseCategory): Promise<Expense[]>;
  updateExpense(id: number, updates: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  createRevenue(rev: InsertRevenue): Promise<Revenue>;
  getRevenue(startDate?: Date, endDate?: Date): Promise<Revenue[]>;
  getFinancialSummary(startDate: Date, endDate: Date): Promise<{ totalExpenses: number; totalRevenue: number; netProfit: number; expensesByCategory: Record<string, number>; revenueByPlan: Record<string, number> }>;
  getDailyFinancials(startDate: Date, endDate: Date): Promise<DailyFinancials[]>;
  updateDailyFinancials(date: string): Promise<void>;

  // 2FA Verification codes methods
  createVerificationCode(email: string, type: string): Promise<VerificationCode>;
  getVerificationCode(email: string, code: string, type: string): Promise<VerificationCode | undefined>;
  markVerificationCodeUsed(id: number): Promise<void>;
  cleanupExpiredCodes(): Promise<void>;

  // Login sessions methods
  createLoginSession(session: InsertUserLoginSession): Promise<UserLoginSession>;
  getLoginSessions(userId: string): Promise<UserLoginSession[]>;
  updateLoginSessionActivity(sessionId: string): Promise<void>;
  deleteLoginSession(sessionId: string): Promise<boolean>;
  deleteAllUserSessions(userId: string, exceptSessionId?: string): Promise<void>;

  // Writing samples methods (AI learning)
  createWritingSample(sample: InsertWritingSample): Promise<WritingSample>;
  getWritingSamples(userId: string, limit?: number): Promise<WritingSample[]>;
  getWritingSampleCount(userId: string): Promise<number>;
  deleteOldWritingSamples(userId: string, keepCount: number): Promise<void>;

  // Learned writing style methods
  getLearnedWritingStyle(userId: string): Promise<LearnedWritingStyle | undefined>;
  upsertLearnedWritingStyle(userId: string, style: Partial<InsertLearnedWritingStyle>): Promise<LearnedWritingStyle>;

  // Email notes methods
  getEmailNote(userId: string, messageId: string): Promise<EmailNote | undefined>;
  createEmailNote(note: InsertEmailNote): Promise<EmailNote>;
  updateEmailNote(userId: string, messageId: string, content: string): Promise<EmailNote | undefined>;
  deleteEmailNote(userId: string, messageId: string): Promise<boolean>;

  // AI inbox suggestions methods
  createAiInboxSuggestion(suggestion: InsertAiInboxSuggestion): Promise<AiInboxSuggestion>;
  getPendingAiInboxSuggestions(userId: string): Promise<AiInboxSuggestion[]>;
  getApprovedAiInboxSuggestions(userId: string): Promise<AiInboxSuggestion[]>;
  getAllActiveAiInboxSuggestions(userId: string): Promise<AiInboxSuggestion[]>;
  getAiInboxSuggestionsByBatch(userId: string, batchId: string): Promise<AiInboxSuggestion[]>;
  updateAiInboxSuggestionStatus(id: number, status: string, executedAt?: Date): Promise<AiInboxSuggestion | undefined>;
  deleteAiInboxSuggestionsByBatch(userId: string, batchId: string): Promise<boolean>;
  clearOldAiInboxSuggestions(userId: string): Promise<void>;

  // Email action history methods (AI learning)
  recordEmailAction(userId: string, action: { messageId: string; actionType: string; senderEmail?: string; subjectKeywords?: string[]; isNewsletter?: boolean; isPromotion?: boolean; folderMovedTo?: string }): Promise<void>;
  getEmailActionPatterns(userId: string): Promise<{ deletedDomains: string[]; deletedSenders: string[]; archivedDomains: string[]; newsletterPatterns: string[] }>;

  // Custom folders methods
  getCustomFolders(userId: string): Promise<CustomFolder[]>;
  createCustomFolder(userId: string, name: string, aiDescription?: string): Promise<CustomFolder>;
  updateCustomFolder(id: number, userId: string, updates: { name?: string; aiDescription?: string; icon?: string }): Promise<CustomFolder | undefined>;
  deleteCustomFolder(id: number, userId: string): Promise<boolean>;

  // Email folder assignment methods
  assignEmailToFolder(userId: string, messageId: string, folderId: number): Promise<EmailFolderAssignment>;
  getEmailFolderAssignment(userId: string, messageId: string): Promise<EmailFolderAssignment | undefined>;
  getEmailsInFolder(userId: string, folderId: number): Promise<string[]>; // Returns messageIds
  removeEmailFromFolder(userId: string, messageId: string): Promise<boolean>;

  // Starred emails methods (UI-only, not synced with Nylas)
  isEmailStarred(userId: string, messageId: string): Promise<boolean>;
  getStarredEmailIds(userId: string): Promise<string[]>;
  toggleStarEmail(userId: string, messageId: string): Promise<boolean>; // Returns new starred state

  // Local email state methods (UI-only, not synced with Nylas mailbox)
  getLocalEmailState(userId: string, messageId: string): Promise<LocalEmailState | undefined>;
  getAllLocalEmailStates(userId: string): Promise<Map<string, string>>; // Returns messageId -> folder map
  setLocalEmailFolder(userId: string, messageId: string, folder: string): Promise<LocalEmailState>;
  getLocalEmailsByFolder(userId: string, folder: string): Promise<string[]>; // Returns messageIds
  getLocalTrashedEmails(userId: string): Promise<string[]>;
  getLocalArchivedEmails(userId: string): Promise<string[]>;
  permanentlyDeleteEmail(userId: string, messageId: string): Promise<boolean>;
  restoreEmailToInbox(userId: string, messageId: string): Promise<LocalEmailState | undefined>;

  // Testimonials methods
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  getApprovedTestimonials(): Promise<Testimonial[]>;
  getAllTestimonials(): Promise<Testimonial[]>;
  getPendingTestimonials(): Promise<Testimonial[]>;
  updateTestimonialStatus(id: number, status: string): Promise<Testimonial | undefined>;
  deleteTestimonial(id: number): Promise<boolean>;
  getUserTestimonial(userId: string): Promise<Testimonial | undefined>;

  // Daily send limit methods (Free plan)
  checkDailySendLimit(userId: string): Promise<{ canSend: boolean; remaining: number; resetAt: Date | null }>;
  incrementDailySendCount(userId: string): Promise<void>;

  // Email Campaign methods (Business plan only)
  createCampaign(campaign: InsertCampaign): Promise<EmailCampaign>;
  getCampaigns(userId: string): Promise<EmailCampaign[]>;
  getCampaign(id: number): Promise<EmailCampaign | undefined>;
  updateCampaign(id: number, updates: Partial<EmailCampaign>): Promise<EmailCampaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;
  addCampaignRecipients(campaignId: number, recipients: { email: string; name?: string }[]): Promise<CampaignRecipient[]>;
  getCampaignRecipients(campaignId: number): Promise<CampaignRecipient[]>;
  updateCampaignRecipientStatus(id: number, status: string, errorMessage?: string): Promise<CampaignRecipient | undefined>;
  deleteCampaignRecipient(id: number): Promise<boolean>;
  clearCampaignRecipients(campaignId: number): Promise<boolean>;

  // Cached emails methods for instant loading
  getCachedEmails(userId: number): Promise<any[]>;
  saveCachedEmails(userId: number, emails: any[]): Promise<void>;
  clearCachedEmails(userId: number): Promise<void>;

  // Feature flags methods
  getFeatureFlag(key: string): Promise<FeatureFlag | undefined>;
  getAllFeatureFlags(): Promise<FeatureFlag[]>;
  setFeatureFlag(key: string, enabled: boolean, allowedEmails?: string[], description?: string): Promise<FeatureFlag>;
  isFeatureEnabled(key: string, userEmail?: string): Promise<boolean>;

  // Referral methods
  getUserByReferralCode(code: string): Promise<User | undefined>;
  generateReferralCode(userId: string): Promise<string>;
  createReferral(referrerUserId: string, referredUserId: string): Promise<Referral>;
  markReferralSubscribed(referredUserId: string): Promise<void>;
  getReferralStats(userId: string): Promise<{ total: number; subscribed: number }>;
  getReferrals(userId: string): Promise<Referral[]>;
  applyProCredit(userId: string, months: number): Promise<void>;
}

const avatarColors = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", 
  "#10B981", "#06B6D4", "#6366F1", "#84CC16", "#F97316"
];

function getRandomAvatarColor(): string {
  return avatarColors[Math.floor(Math.random() * avatarColors.length)];
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private emails: Map<number, Email>;
  private drafts: Map<number, Draft>;
  private nylasGrants: Map<string, NylasGrant>;
  private emailIdCounter: number;
  private draftIdCounter: number;
  private nylasGrantIdCounter: number;

  constructor() {
    this.users = new Map();
    this.emails = new Map();
    this.drafts = new Map();
    this.nylasGrants = new Map();
    this.emailIdCounter = 1;
    this.draftIdCounter = 1;
    this.nylasGrantIdCounter = 1;
    
    this.seedEmails();
  }

  private seedEmails() {
    const sampleEmails: Omit<Email, "id">[] = [
      {
        sender: "Sarah Collins",
        senderEmail: "sarah.collins@techcorp.com",
        subject: "Client Meeting Recap",
        preview: "Here are the key points from our client meeting...",
        body: `Hi there,

Here are the key points from our client meeting:

-- We've reviewed the project status and discussed the next steps.

-- You'll follow up on the action items.

-- Next call scheduled for Friday.

Let me know if you have any questions.

Sarah

Donec linque, dolbe nisi sat, ede congensazid naation inget Eloc. Ssocna pretrescription opip rat, necconallam teisosipendiseasspien cookie sim non, modo transcilib simsc fettuern qpot dente tg pertoque.`,
        receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-1",
        avatarColor: "#EC4899",
      },
      {
        sender: "Brad Walters",
        senderEmail: "brad.walters@company.io",
        subject: "Meeting Tomorrow",
        preview: "Just a reminder about our meeting scheduled...",
        body: `Hi,

Just a reminder about our meeting scheduled for tomorrow at 2 PM.

We'll be discussing:
- Q4 objectives and targets
- Team expansion plans
- Budget allocation for next quarter

Please come prepared with your department updates.

Best,
Brad`,
        receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-2",
        avatarColor: "#F59E0B",
      },
      {
        sender: "Michael Chen",
        senderEmail: "michael.chen@startup.co",
        subject: "Q4 Budget Review",
        preview: "I've completed the Q4 budget analysis. Please...",
        body: `Hi,

I've completed the Q4 budget analysis. Please review the attached document and let me know your thoughts.

Key highlights:
- Marketing spend increased by 15%
- R&D allocation on track
- Customer acquisition costs down 8%

Happy to discuss any concerns.

Best,
Michael`,
        receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isRead: false,
        isStarred: true,
        folder: "inbox",
        threadId: "thread-3",
        avatarColor: "#3B82F6",
      },
      {
        sender: "Jessica Martinez",
        senderEmail: "jessica.m@enterprise.com",
        subject: "Welcome to the Team!",
        preview: "Welcome aboard! We're looking forward to ha...",
        body: `Welcome aboard! We're looking forward to having you on the team.

Here's what you need to know for your first week:

1. Orientation is Monday at 9 AM
2. Your workspace is on the 3rd floor
3. IT will set up your accounts on day one

If you have any questions before your start date, feel free to reach out.

Looking forward to working with you!

Jessica Martinez
HR Director`,
        receivedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-4",
        avatarColor: "#8B5CF6",
      },
      {
        sender: "David Park",
        senderEmail: "david.park@solutions.net",
        subject: "Project Update",
        preview: "Just wanted to share a quick update on the...",
        body: `Hi team,

Just wanted to share a quick update on the current project status:

Phase 1: Complete ✓
Phase 2: In progress (75% done)
Phase 3: Scheduled to start next week

We're on track to meet the deadline. Great work everyone!

Let me know if you need anything.

David`,
        receivedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-5",
        avatarColor: "#10B981",
      },
      {
        sender: "Emily Zhang",
        senderEmail: "emily.zhang@designstudio.com",
        subject: "New Brand Guidelines",
        preview: "The updated brand guidelines are ready for...",
        body: `Hi team,

The updated brand guidelines are ready for review. I've attached the PDF with all the new specifications.

Key changes include:
- Updated color palette with accessibility improvements
- New typography hierarchy
- Revised logo usage guidelines
- Social media template updates

Please review and share any feedback by end of week.

Thanks,
Emily`,
        receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-6",
        avatarColor: "#06B6D4",
      },
      {
        sender: "Robert Kim",
        senderEmail: "robert.kim@analytics.io",
        subject: "Monthly Analytics Report",
        preview: "Here's the monthly performance report with...",
        body: `Hello,

Here's the monthly performance report with key metrics and insights.

Highlights:
- Website traffic up 23% month-over-month
- Conversion rate improved to 4.2%
- Average session duration increased by 45 seconds
- Mobile traffic now accounts for 68% of total visits

I'll be presenting these findings at Thursday's meeting.

Best regards,
Robert Kim
Data Analytics Lead`,
        receivedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        isRead: true,
        isStarred: true,
        folder: "inbox",
        threadId: "thread-7",
        avatarColor: "#6366F1",
      },
      {
        sender: "Amanda Foster",
        senderEmail: "amanda.f@legal.co",
        subject: "Contract Review Needed",
        preview: "Could you please review the attached contract...",
        body: `Hi,

Could you please review the attached contract before our meeting with the vendor next week?

There are a few clauses that need attention:
1. Liability limitation in Section 4.2
2. Payment terms in Section 7
3. Termination clause modifications

Let me know your availability for a quick call to discuss.

Amanda Foster
Legal Department`,
        receivedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-8",
        avatarColor: "#EF4444",
      },
      {
        sender: "Tom Richardson",
        senderEmail: "tom.r@engineering.tech",
        subject: "Server Maintenance Notice",
        preview: "Scheduled maintenance this weekend will...",
        body: `Team,

Scheduled maintenance this weekend will affect the following services:

Saturday 11 PM - Sunday 3 AM (EST):
- Main application servers
- Database backups
- API endpoints

Please plan accordingly and save any work in progress before the maintenance window.

Contact IT support if you experience any issues.

Tom Richardson
Infrastructure Team`,
        receivedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-9",
        avatarColor: "#84CC16",
      },
      {
        sender: "Lisa Thompson",
        senderEmail: "lisa.t@marketing.com",
        subject: "Campaign Launch Update",
        preview: "Great news! Our Q4 campaign is performing...",
        body: `Hi everyone,

Great news! Our Q4 campaign is performing above expectations.

Current metrics:
- 2.3M impressions in first 48 hours
- Click-through rate of 3.8%
- Social engagement up 156%
- Email open rate at 28.5%

The creative team did an amazing job. Let's keep this momentum going!

Lisa Thompson
Marketing Director`,
        receivedAt: new Date(Date.now() - 30 * 60 * 1000),
        isRead: false,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-10",
        avatarColor: "#F97316",
      },
      {
        sender: "Kevin O'Brien",
        senderEmail: "kevin.obrien@finance.net",
        subject: "Expense Report Approval",
        preview: "Your expense report has been approved and...",
        body: `Hello,

Your expense report for November has been approved and processed.

Details:
- Total amount: $1,247.50
- Category: Travel & Entertainment
- Reimbursement date: December 15th

The funds will be deposited directly to your account.

Kevin O'Brien
Finance Department`,
        receivedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-11",
        avatarColor: "#3B82F6",
      },
      {
        sender: "Nina Patel",
        senderEmail: "nina.patel@product.io",
        subject: "Feature Request Discussion",
        preview: "I'd like to schedule a call to discuss the...",
        body: `Hi,

I'd like to schedule a call to discuss the new feature requests from our enterprise clients.

Priority items:
1. Advanced reporting dashboard
2. API rate limit increases
3. Custom workflow automation
4. SSO integration improvements

When works best for you this week?

Nina Patel
Product Manager`,
        receivedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        isRead: false,
        isStarred: true,
        folder: "inbox",
        threadId: "thread-12",
        avatarColor: "#8B5CF6",
      },
      {
        sender: "Chris Morgan",
        senderEmail: "chris.m@support.com",
        subject: "Customer Feedback Summary",
        preview: "Here's the weekly summary of customer feedback...",
        body: `Team,

Here's the weekly summary of customer feedback and support tickets.

This week's highlights:
- 94% customer satisfaction rate
- Average response time: 2.3 hours
- Most requested feature: Dark mode (already in development!)
- Common issue: Login timeout (fix deployed yesterday)

Full report attached for detailed analysis.

Chris Morgan
Customer Success`,
        receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-13",
        avatarColor: "#10B981",
      },
      {
        sender: "Rachel Adams",
        senderEmail: "rachel.a@hr.company.com",
        subject: "Holiday Schedule Reminder",
        preview: "Please submit your holiday time-off requests...",
        body: `Hello everyone,

Please submit your holiday time-off requests by December 10th.

Important dates:
- December 24-25: Company closed
- December 31 - January 1: Company closed
- January 2: Regular business hours resume

If you have any questions about your remaining PTO balance, please reach out.

Happy holidays!
Rachel Adams
Human Resources`,
        receivedAt: new Date(Date.now() - 96 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-14",
        avatarColor: "#EC4899",
      },
      {
        sender: "James Wilson",
        senderEmail: "james.w@partnerships.biz",
        subject: "Partnership Opportunity",
        preview: "I wanted to reach out about a potential...",
        body: `Hi,

I wanted to reach out about a potential partnership opportunity between our companies.

We've been following your recent product launches and believe there's great synergy for collaboration.

Would you be available for an introductory call next week? I'd love to explore how we might work together.

Best regards,
James Wilson
Business Development`,
        receivedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        folder: "inbox",
        threadId: "thread-15",
        avatarColor: "#F59E0B",
      },
    ];

    sampleEmails.forEach((email) => {
      const id = this.emailIdCounter++;
      this.emails.set(id, { ...email, id } as Email);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
    return user;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getEmails(folder?: string): Promise<Email[]> {
    const emails = Array.from(this.emails.values());
    if (folder) {
      return emails.filter((e) => e.folder === folder).sort((a, b) => 
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );
    }
    return emails.sort((a, b) => 
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );
  }

  async getEmail(id: number): Promise<Email | undefined> {
    return this.emails.get(id);
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const id = this.emailIdCounter++;
    const email: Email = {
      ...insertEmail,
      id,
      receivedAt: new Date(),
      isRead: insertEmail.isRead ?? false,
      isStarred: insertEmail.isStarred ?? false,
      folder: insertEmail.folder ?? "inbox",
      avatarColor: insertEmail.avatarColor ?? getRandomAvatarColor(),
      threadId: insertEmail.threadId ?? null,
    };
    this.emails.set(id, email);
    return email;
  }

  async updateEmail(id: number, updates: Partial<Email>): Promise<Email | undefined> {
    const email = this.emails.get(id);
    if (!email) return undefined;
    const updated = { ...email, ...updates };
    this.emails.set(id, updated);
    return updated;
  }

  async deleteEmail(id: number): Promise<boolean> {
    return this.emails.delete(id);
  }

  async getDraftByEmailId(emailId: number): Promise<Draft | undefined> {
    return Array.from(this.drafts.values()).find((d) => d.emailId === emailId);
  }

  async getDraft(id: number): Promise<Draft | undefined> {
    return this.drafts.get(id);
  }

  async createDraft(insertDraft: InsertDraft): Promise<Draft> {
    const id = this.draftIdCounter++;
    const now = new Date();
    const draft: Draft = {
      ...insertDraft,
      id,
      isAiGenerated: insertDraft.isAiGenerated ?? true,
      status: insertDraft.status ?? "draft",
      scheduledAt: insertDraft.scheduledAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.drafts.set(id, draft);
    return draft;
  }

  async updateDraft(id: number, updates: Partial<Draft>): Promise<Draft | undefined> {
    const draft = this.drafts.get(id);
    if (!draft) return undefined;
    const updated = { ...draft, ...updates, updatedAt: new Date() };
    this.drafts.set(id, updated);
    return updated;
  }

  async deleteDraft(id: number): Promise<boolean> {
    return this.drafts.delete(id);
  }

  async getScheduledDrafts(): Promise<Draft[]> {
    return Array.from(this.drafts.values())
      .filter(d => d.status === "scheduled" && d.scheduledAt)
      .sort((a, b) => {
        const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return timeA - timeB;
      });
  }

  async getUserDrafts(userId: string): Promise<Draft[]> {
    return Array.from(this.drafts.values())
      .filter(d => d.userId === userId && d.status === "draft")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getNylasGrant(userId: string): Promise<NylasGrant | undefined> {
    const [grant] = await db.select().from(nylasGrants).where(eq(nylasGrants.userId, userId));
    return grant;
  }

  async getNylasGrantByEmail(email: string): Promise<NylasGrant | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const [grant] = await db.select().from(nylasGrants).where(eq(nylasGrants.email, normalizedEmail));
    return grant;
  }

  async createNylasGrant(insertGrant: InsertNylasGrant): Promise<NylasGrant> {
    const [grant] = await db.insert(nylasGrants).values(insertGrant).returning();
    return grant;
  }

  async updateNylasGrant(userId: string, updates: Partial<NylasGrant>): Promise<NylasGrant | undefined> {
    const [grant] = await db.update(nylasGrants).set(updates).where(eq(nylasGrants.userId, userId)).returning();
    return grant;
  }

  async deleteNylasGrant(userId: string): Promise<boolean> {
    const result = await db.delete(nylasGrants).where(eq(nylasGrants.userId, userId)).returning();
    return result.length > 0;
  }

  async createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage> {
    const [created] = await db.insert(supportMessages).values(message).returning();
    return created;
  }

  // Assistant methods
  async getAssistantSettings(userId: string): Promise<AssistantSettings | undefined> {
    const [settings] = await db.select().from(assistantSettings).where(eq(assistantSettings.userId, userId));
    return settings;
  }

  async upsertAssistantSettings(userId: string, updates: Partial<AssistantSettings>): Promise<AssistantSettings> {
    const existing = await this.getAssistantSettings(userId);
    if (existing) {
      const [updated] = await db.update(assistantSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(assistantSettings.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(assistantSettings)
        .values({
          userId,
          selectedVoice: updates.selectedVoice || "vince",
          voiceOutputEnabled: updates.voiceOutputEnabled ?? true,
          canReadEmails: updates.canReadEmails ?? false,
          canDraftEmails: updates.canDraftEmails ?? false,
          canSendEmails: updates.canSendEmails ?? false,
        })
        .returning();
      return created;
    }
  }

  async getAssistantMessages(userId: string, sessionId?: number): Promise<AssistantMessage[]> {
    if (sessionId) {
      return db.select()
        .from(assistantMessages)
        .where(and(eq(assistantMessages.userId, userId), eq(assistantMessages.sessionId, sessionId)))
        .orderBy(assistantMessages.createdAt);
    }
    // Get messages for the active session or all if no session
    const activeSession = await this.getActiveSession(userId);
    if (activeSession) {
      return db.select()
        .from(assistantMessages)
        .where(and(eq(assistantMessages.userId, userId), eq(assistantMessages.sessionId, activeSession.id)))
        .orderBy(assistantMessages.createdAt);
    }
    // Fallback: get messages without session (legacy)
    return db.select()
      .from(assistantMessages)
      .where(eq(assistantMessages.userId, userId))
      .orderBy(assistantMessages.createdAt);
  }

  async addAssistantMessage(userId: string, role: string, content: string, sessionId?: number): Promise<AssistantMessage> {
    let actualSessionId = sessionId;
    if (!actualSessionId) {
      const activeSession = await this.getActiveSession(userId);
      if (activeSession) {
        actualSessionId = activeSession.id;
        // Update session title from first user message
        if (role === "user" && activeSession.title === "New Chat") {
          const title = content.length > 40 ? content.substring(0, 40) + "..." : content;
          await this.updateSessionTitle(userId, activeSession.id, title);
        }
      } else {
        const newSession = await this.createChatSession(userId);
        actualSessionId = newSession.id;
        if (role === "user") {
          const title = content.length > 40 ? content.substring(0, 40) + "..." : content;
          await this.updateSessionTitle(userId, newSession.id, title);
        }
      }
    }
    const [message] = await db.insert(assistantMessages)
      .values({ userId, role, content, sessionId: actualSessionId })
      .returning();
    return message;
  }

  async clearAssistantMessages(userId: string, sessionId?: number): Promise<void> {
    if (sessionId) {
      await db.delete(assistantMessages).where(
        and(eq(assistantMessages.userId, userId), eq(assistantMessages.sessionId, sessionId))
      );
    } else {
      const activeSession = await this.getActiveSession(userId);
      if (activeSession) {
        await db.delete(assistantMessages).where(
          and(eq(assistantMessages.userId, userId), eq(assistantMessages.sessionId, activeSession.id))
        );
      } else {
        await db.delete(assistantMessages).where(eq(assistantMessages.userId, userId));
      }
    }
  }

  // Chat session methods
  async getChatSessions(userId: string): Promise<ChatSession[]> {
    return db.select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));
  }

  async getActiveSession(userId: string): Promise<ChatSession | undefined> {
    const [session] = await db.select()
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, userId), eq(chatSessions.isActive, true)));
    return session;
  }

  async createChatSession(userId: string, title?: string): Promise<ChatSession> {
    // Deactivate all existing sessions
    await db.update(chatSessions)
      .set({ isActive: false })
      .where(eq(chatSessions.userId, userId));
    
    // Create new active session
    const [session] = await db.insert(chatSessions)
      .values({ userId, title: title || "New Chat", isActive: true })
      .returning();
    return session;
  }

  async setActiveSession(userId: string, sessionId: number): Promise<void> {
    // Deactivate all sessions for this user
    await db.update(chatSessions)
      .set({ isActive: false })
      .where(eq(chatSessions.userId, userId));
    
    // Activate the requested session only if it belongs to this user
    await db.update(chatSessions)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)));
  }

  async updateSessionTitle(userId: string, sessionId: number, title: string): Promise<ChatSession | undefined> {
    const [updated] = await db.update(chatSessions)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSession(userId: string, sessionId: number): Promise<boolean> {
    // First verify the session belongs to the user
    const [session] = await db.select().from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)));
    
    if (!session) return false;
    
    await db.delete(assistantMessages).where(eq(assistantMessages.sessionId, sessionId));
    await db.delete(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)));
    return true;
  }

  // Feedback methods
  async createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback> {
    const [created] = await db.insert(userFeedback).values(feedback).returning();
    return created;
  }

  async getUserFeedback(userId: string): Promise<UserFeedback[]> {
    return db.select()
      .from(userFeedback)
      .where(eq(userFeedback.userId, userId))
      .orderBy(desc(userFeedback.createdAt));
  }

  // Style profile methods
  async getUserStyleProfile(userId: string): Promise<UserStyleProfileRecord | undefined> {
    const [profile] = await db.select().from(userStyleProfiles).where(eq(userStyleProfiles.userId, userId));
    return profile;
  }

  async upsertUserStyleProfile(userId: string, profileUpdates: Partial<UserStyleProfile>): Promise<UserStyleProfileRecord> {
    const existing = await this.getUserStyleProfile(userId);
    const defaultProfile = userStyleProfileSchema.parse({});
    
    if (existing) {
      const mergedProfile = { ...existing.profile, ...profileUpdates };
      const [updated] = await db.update(userStyleProfiles)
        .set({ profile: mergedProfile, updatedAt: new Date() })
        .where(eq(userStyleProfiles.userId, userId))
        .returning();
      return updated;
    } else {
      const newProfile = { ...defaultProfile, ...profileUpdates };
      const [created] = await db.insert(userStyleProfiles)
        .values({ userId, profile: newProfile, feedbackScore: 0 })
        .returning();
      return created;
    }
  }

  async updateStyleProfileFromFeedback(userId: string, tags: string[]): Promise<void> {
    const profile = await this.getUserStyleProfile(userId);
    if (!profile) return;
    
    const updates: Partial<UserStyleProfile> = {};
    
    if (tags.includes("too_long")) {
      updates.length = profile.profile.length === "long" ? "medium" : "short";
    }
    if (tags.includes("too_short")) {
      updates.length = profile.profile.length === "short" ? "medium" : "long";
    }
    if (tags.includes("too_formal")) {
      updates.tone = profile.profile.tone === "professional" ? "friendly" : "casual";
    }
    if (tags.includes("too_casual")) {
      updates.tone = profile.profile.tone === "casual" ? "friendly" : "professional";
    }
    
    if (Object.keys(updates).length > 0) {
      await this.upsertUserStyleProfile(userId, updates);
    }
  }

  // Assistant actions methods
  async createAssistantAction(action: InsertAssistantAction): Promise<AssistantAction> {
    const [created] = await db.insert(assistantActions).values(action).returning();
    return created;
  }

  async getAssistantAction(id: number): Promise<AssistantAction | undefined> {
    const [action] = await db.select().from(assistantActions).where(eq(assistantActions.id, id));
    return action;
  }

  async getPendingAssistantActions(userId: string): Promise<AssistantAction[]> {
    return db.select()
      .from(assistantActions)
      .where(and(eq(assistantActions.userId, userId), eq(assistantActions.status, "pending")))
      .orderBy(desc(assistantActions.createdAt));
  }

  async updateAssistantActionStatus(id: number, status: string, executedAt?: Date): Promise<AssistantAction | undefined> {
    const updates: Partial<AssistantAction> = { status };
    if (executedAt) updates.executedAt = executedAt;
    
    const [updated] = await db.update(assistantActions)
      .set(updates)
      .where(eq(assistantActions.id, id))
      .returning();
    return updated;
  }

  // Assistant feedback methods
  async createAssistantFeedback(feedback: InsertAssistantFeedback): Promise<AssistantFeedbackRecord> {
    const [created] = await db.insert(assistantFeedback).values(feedback).returning();
    return created;
  }

  async getAssistantFeedbackByMessage(assistantMessageId: number): Promise<AssistantFeedbackRecord | undefined> {
    const [feedback] = await db.select()
      .from(assistantFeedback)
      .where(eq(assistantFeedback.assistantMessageId, assistantMessageId));
    return feedback;
  }

  // Message summary cache methods
  async getMessageSummary(userId: string, messageId: string): Promise<MessageSummaryCache | undefined> {
    const [cached] = await db.select()
      .from(messageSummaryCache)
      .where(and(eq(messageSummaryCache.userId, userId), eq(messageSummaryCache.messageId, messageId)));
    return cached;
  }

  async cacheMessageSummary(userId: string, messageId: string, summary: string): Promise<MessageSummaryCache> {
    const [created] = await db.insert(messageSummaryCache)
      .values({ userId, messageId, summary })
      .returning();
    return created;
  }

  // Assistant permissions methods
  async getAssistantPermissions(userId: string): Promise<AssistantPermissionsRecord | undefined> {
    const [perms] = await db.select()
      .from(assistantPermissions)
      .where(eq(assistantPermissions.userId, userId));
    return perms;
  }

  async upsertAssistantPermissions(userId: string, permissions: Partial<AssistantPermissions>): Promise<AssistantPermissionsRecord> {
    const existing = await this.getAssistantPermissions(userId);
    const defaultPerms = assistantPermissionsSchema.parse({});
    
    if (existing) {
      const merged = { ...existing.permissions, ...permissions };
      const [updated] = await db.update(assistantPermissions)
        .set({ permissions: merged, updatedAt: new Date() })
        .where(eq(assistantPermissions.userId, userId))
        .returning();
      return updated;
    } else {
      const merged = { ...defaultPerms, ...permissions };
      const [created] = await db.insert(assistantPermissions)
        .values({ userId, permissions: merged })
        .returning();
      return created;
    }
  }

  // Audit log methods
  async createAuditLog(userId: string, actionType: string, status: string, targetMessageId?: string, details?: string): Promise<AssistantAuditLogRecord> {
    const [created] = await db.insert(assistantAuditLog)
      .values({ userId, actionType, status, targetMessageId, details })
      .returning();
    return created;
  }

  async getRecentAuditLogs(userId: string, limit: number = 50): Promise<AssistantAuditLogRecord[]> {
    return db.select()
      .from(assistantAuditLog)
      .where(eq(assistantAuditLog.userId, userId))
      .orderBy(desc(assistantAuditLog.createdAt))
      .limit(limit);
  }

  // Security audit log methods (CASA Q52)
  async createSecurityAuditLog(log: InsertSecurityAuditLog): Promise<SecurityAuditLogRecord> {
    const [created] = await db.insert(securityAuditLog).values(log).returning();
    return created;
  }

  async getSecurityAuditLogs(userId?: string, limit: number = 100): Promise<SecurityAuditLogRecord[]> {
    if (userId) {
      return db.select()
        .from(securityAuditLog)
        .where(eq(securityAuditLog.userId, userId))
        .orderBy(desc(securityAuditLog.createdAt))
        .limit(limit);
    }
    return db.select()
      .from(securityAuditLog)
      .orderBy(desc(securityAuditLog.createdAt))
      .limit(limit);
  }

  // Linked accounts methods (account switching)
  async getLinkedAccounts(primaryUserId: string): Promise<LinkedAccount[]> {
    return db.select()
      .from(linkedAccounts)
      .where(eq(linkedAccounts.primaryUserId, primaryUserId))
      .orderBy(desc(linkedAccounts.createdAt));
  }

  async addLinkedAccount(primaryUserId: string, linkedUserId: string, linkedEmail: string, linkedDisplayName?: string, linkedPlan?: string): Promise<LinkedAccount> {
    // Get the primary user's info for the reverse link
    const primaryUser = await this.getUser(primaryUserId);
    
    // Create bidirectional links - save to BOTH accounts so they can switch from any device
    const [created] = await db.insert(linkedAccounts).values({
      primaryUserId,
      linkedUserId,
      linkedEmail,
      linkedDisplayName: linkedDisplayName || null,
      linkedAvatarUrl: null,
      linkedPlan: linkedPlan || null,
      skip2FA: true,
    }).returning();
    
    // Create the reverse link (B -> A) so the other account can also switch back
    // Check if reverse link already exists first
    const reverseExists = await this.isAccountLinked(linkedUserId, primaryUserId);
    if (!reverseExists && primaryUser) {
      await db.insert(linkedAccounts).values({
        primaryUserId: linkedUserId,
        linkedUserId: primaryUserId,
        linkedEmail: primaryUser.email,
        linkedDisplayName: primaryUser.displayName || null,
        linkedAvatarUrl: null,
        linkedPlan: primaryUser.plan || null,
        skip2FA: true,
      });
    }
    
    return created;
  }

  async removeLinkedAccount(primaryUserId: string, linkedUserId: string): Promise<boolean> {
    // Remove both directions of the link
    await db.delete(linkedAccounts).where(
      and(
        eq(linkedAccounts.primaryUserId, primaryUserId),
        eq(linkedAccounts.linkedUserId, linkedUserId)
      )
    );
    
    // Also remove the reverse direction so both accounts are unlinked
    await db.delete(linkedAccounts).where(
      and(
        eq(linkedAccounts.primaryUserId, linkedUserId),
        eq(linkedAccounts.linkedUserId, primaryUserId)
      )
    );
    
    return true;
  }

  async isAccountLinked(primaryUserId: string, linkedUserId: string): Promise<boolean> {
    const [existing] = await db.select()
      .from(linkedAccounts)
      .where(
        and(
          eq(linkedAccounts.primaryUserId, primaryUserId),
          eq(linkedAccounts.linkedUserId, linkedUserId)
        )
      );
    return !!existing;
  }

  // Contacts methods (email autocomplete)
  async getContacts(userId: string): Promise<Contact[]> {
    return db.select()
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(desc(contacts.useCount), desc(contacts.lastUsed))
      .limit(100);
  }

  async searchContacts(userId: string, query: string): Promise<Contact[]> {
    const lowerQuery = query.toLowerCase();
    const allContacts = await db.select()
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(desc(contacts.useCount), desc(contacts.lastUsed));
    
    return allContacts.filter(c => 
      c.email.toLowerCase().includes(lowerQuery) ||
      (c.name && c.name.toLowerCase().includes(lowerQuery))
    ).slice(0, 10);
  }

  async saveContact(userId: string, email: string, name?: string): Promise<Contact> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Basic email validation
    if (!normalizedEmail || !normalizedEmail.includes("@") || normalizedEmail.length < 5) {
      throw new Error("Invalid email address");
    }
    
    // Check if contact already exists
    const [existing] = await db.select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.email, normalizedEmail)));
    
    if (existing) {
      // Update name if provided and different, increment use count
      const updates: Partial<Contact> = {
        lastUsed: new Date(),
        useCount: existing.useCount + 1,
      };
      if (name && name !== existing.name) {
        updates.name = name;
      }
      const [updated] = await db.update(contacts)
        .set(updates)
        .where(eq(contacts.id, existing.id))
        .returning();
      return updated;
    }
    
    // Create new contact
    const [created] = await db.insert(contacts).values({
      userId,
      email: normalizedEmail,
      name: name || null,
    }).returning();
    return created;
  }

  async incrementContactUse(userId: string, email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    await db.update(contacts)
      .set({ 
        useCount: sql`${contacts.useCount} + 1`,
        lastUsed: new Date(),
      })
      .where(and(eq(contacts.userId, userId), eq(contacts.email, normalizedEmail)));
  }

  // Pending sends methods (undo send)
  async createPendingSend(send: InsertPendingSend): Promise<PendingSend> {
    const [created] = await db.insert(pendingSends).values(send).returning();
    return created;
  }

  async getPendingSend(id: number): Promise<PendingSend | undefined> {
    const [send] = await db.select().from(pendingSends).where(eq(pendingSends.id, id));
    return send;
  }

  async getPendingSendsByUser(userId: string): Promise<PendingSend[]> {
    return db.select()
      .from(pendingSends)
      .where(and(eq(pendingSends.userId, userId), eq(pendingSends.status, "pending")))
      .orderBy(desc(pendingSends.createdAt));
  }

  async getPendingSendsReady(): Promise<PendingSend[]> {
    const now = new Date();
    return db.select()
      .from(pendingSends)
      .where(and(eq(pendingSends.status, "pending"), lte(pendingSends.scheduledSendAt, now)));
  }

  async cancelPendingSend(userId: string, id: number): Promise<boolean> {
    const [send] = await db.select().from(pendingSends)
      .where(and(eq(pendingSends.id, id), eq(pendingSends.userId, userId), eq(pendingSends.status, "pending")));
    
    if (!send) return false;
    
    await db.update(pendingSends)
      .set({ status: "cancelled" })
      .where(eq(pendingSends.id, id));
    return true;
  }

  async markPendingSendSent(id: number): Promise<PendingSend | undefined> {
    const [updated] = await db.update(pendingSends)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(pendingSends.id, id))
      .returning();
    return updated;
  }

  async claimPendingSendForProcessing(id: number): Promise<PendingSend | undefined> {
    const [claimed] = await db.update(pendingSends)
      .set({ status: "sending" })
      .where(and(eq(pendingSends.id, id), eq(pendingSends.status, "pending")))
      .returning();
    return claimed;
  }

  async markPendingSendFailed(id: number, errorMessage: string): Promise<PendingSend | undefined> {
    const [updated] = await db.update(pendingSends)
      .set({ status: "failed", failedAt: new Date(), errorMessage })
      .where(eq(pendingSends.id, id))
      .returning();
    return updated;
  }

  // Team invite methods (Business plan)
  async createTeamInvite(invite: InsertTeamInvite): Promise<TeamInvite> {
    const [created] = await db.insert(teamInvites).values(invite).returning();
    return created;
  }

  async getTeamInvite(id: number): Promise<TeamInvite | undefined> {
    const [invite] = await db.select().from(teamInvites).where(eq(teamInvites.id, id));
    return invite;
  }

  async getPendingInvitesForUser(inviteeId: string): Promise<TeamInvite[]> {
    return db.select()
      .from(teamInvites)
      .where(and(eq(teamInvites.inviteeId, inviteeId), eq(teamInvites.status, "pending")))
      .orderBy(desc(teamInvites.createdAt));
  }

  async getSentInvites(inviterId: string): Promise<TeamInvite[]> {
    return db.select()
      .from(teamInvites)
      .where(eq(teamInvites.inviterId, inviterId))
      .orderBy(desc(teamInvites.createdAt));
  }

  async updateTeamInviteStatus(id: number, status: string): Promise<TeamInvite | undefined> {
    const [updated] = await db.update(teamInvites)
      .set({ status, respondedAt: new Date() })
      .where(eq(teamInvites.id, id))
      .returning();
    return updated;
  }

  // Team members methods
  async createTeamMember(ownerId: string, memberId: string, role: string): Promise<TeamMember> {
    const [created] = await db.insert(teamMembers).values({ ownerId, memberId, role }).returning();
    return created;
  }

  async getTeamMembers(ownerId: string): Promise<TeamMember[]> {
    return db.select().from(teamMembers).where(eq(teamMembers.ownerId, ownerId));
  }

  async getTeamMembership(memberId: string): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.memberId, memberId));
    return member;
  }

  async removeTeamMember(ownerId: string, memberId: string): Promise<boolean> {
    const result = await db.delete(teamMembers)
      .where(and(eq(teamMembers.ownerId, ownerId), eq(teamMembers.memberId, memberId)))
      .returning();
    return result.length > 0;
  }

  async getTeamMemberCount(ownerId: string): Promise<number> {
    const members = await db.select().from(teamMembers).where(eq(teamMembers.ownerId, ownerId));
    return members.length;
  }

  // Notifications methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const unread = await db.select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return unread.length;
  }

  async markNotificationAsRead(userId: string, notificationId: number): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Owner panel methods
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats(): Promise<{ total: number; free: number; pro: number; premium: number }> {
    const allUsers = await db.select().from(users);
    const stats = { total: allUsers.length, free: 0, pro: 0, premium: 0 };
    for (const user of allUsers) {
      if (user.plan === "free") stats.free++;
      else if (user.plan === "pro") stats.pro++;
      else if (user.plan === "premium") stats.premium++;
    }
    return stats;
  }

  async getAllUserFeedback(): Promise<UserFeedback[]> {
    return db.select().from(userFeedback).orderBy(desc(userFeedback.createdAt));
  }

  async updateFeedbackStatus(id: number, status: string): Promise<UserFeedback | undefined> {
    const [updated] = await db.update(userFeedback)
      .set({ status })
      .where(eq(userFeedback.id, id))
      .returning();
    return updated;
  }

  async createActivityLog(userId: string | null, userEmail: string | null, actionType: string, details?: string, metadata?: Record<string, unknown>): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs)
      .values({ userId, userEmail, actionType, details, metadata })
      .returning();
    return created;
  }

  async getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    return db.select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async sendNotificationToUsers(userIds: string[], type: string, title: string, message: string, data?: Record<string, unknown>): Promise<void> {
    for (const userId of userIds) {
      await db.insert(notifications).values({
        userId,
        type,
        title,
        message,
        isRead: false,
        data: data || null,
      });
    }
  }

  async getUsersByPlan(plan: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.plan, plan as "free" | "pro" | "premium"));
  }

  // AI usage tracking methods
  async getAiUsageToday(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const [usage] = await db.select()
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.usageDate, today)));
    return usage?.draftsGenerated || 0;
  }

  async incrementAiUsage(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const [existing] = await db.select()
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.usageDate, today)));
    
    if (existing) {
      await db.update(aiUsage)
        .set({ 
          draftsGenerated: existing.draftsGenerated + 1,
          updatedAt: new Date()
        })
        .where(eq(aiUsage.id, existing.id));
    } else {
      await db.insert(aiUsage).values({
        userId,
        usageDate: today,
        draftsGenerated: 1,
      });
    }
  }

  // Financial tracking methods
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    const dateStr = new Date().toISOString().split('T')[0];
    await this.updateDailyFinancials(dateStr);
    return created;
  }

  async getExpenses(startDate?: Date, endDate?: Date, category?: ExpenseCategory): Promise<Expense[]> {
    let query = db.select().from(expenses).orderBy(desc(expenses.expenseDate));
    
    const conditions: any[] = [];
    if (startDate) {
      conditions.push(sql`${expenses.expenseDate} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${expenses.expenseDate} <= ${endDate}`);
    }
    if (category) {
      conditions.push(eq(expenses.category, category));
    }
    
    if (conditions.length > 0) {
      return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.expenseDate));
    }
    return query;
  }

  async updateExpense(id: number, updates: Partial<Expense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses).set(updates).where(eq(expenses.id, id)).returning();
    return updated;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return true;
  }

  async createRevenue(rev: InsertRevenue): Promise<Revenue> {
    const [created] = await db.insert(revenue).values(rev).returning();
    const dateStr = new Date().toISOString().split('T')[0];
    await this.updateDailyFinancials(dateStr);
    return created;
  }

  async getRevenue(startDate?: Date, endDate?: Date): Promise<Revenue[]> {
    const conditions: any[] = [];
    if (startDate) {
      conditions.push(sql`${revenue.revenueDate} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${revenue.revenueDate} <= ${endDate}`);
    }
    
    if (conditions.length > 0) {
      return db.select().from(revenue).where(and(...conditions)).orderBy(desc(revenue.revenueDate));
    }
    return db.select().from(revenue).orderBy(desc(revenue.revenueDate));
  }

  async getFinancialSummary(startDate: Date, endDate: Date): Promise<{ totalExpenses: number; totalRevenue: number; netProfit: number; expensesByCategory: Record<string, number>; revenueByPlan: Record<string, number> }> {
    const expensesList = await this.getExpenses(startDate, endDate);
    const revenueList = await this.getRevenue(startDate, endDate);
    
    const totalExpenses = expensesList.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalRevenue = revenueList.reduce((sum, r) => sum + Number(r.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    
    const expensesByCategory: Record<string, number> = {};
    for (const exp of expensesList) {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + Number(exp.amount);
    }
    
    const revenueByPlan: Record<string, number> = {};
    for (const rev of revenueList) {
      revenueByPlan[rev.plan] = (revenueByPlan[rev.plan] || 0) + Number(rev.amount);
    }
    
    return { totalExpenses, totalRevenue, netProfit, expensesByCategory, revenueByPlan };
  }

  async getDailyFinancials(startDate: Date, endDate: Date): Promise<DailyFinancials[]> {
    return db.select().from(dailyFinancials)
      .where(and(
        sql`${dailyFinancials.date} >= ${startDate.toISOString().split('T')[0]}`,
        sql`${dailyFinancials.date} <= ${endDate.toISOString().split('T')[0]}`
      ))
      .orderBy(desc(dailyFinancials.date));
  }

  async updateDailyFinancials(date: string): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const summary = await this.getFinancialSummary(startOfDay, endOfDay);
    
    const existing = await db.select().from(dailyFinancials).where(eq(dailyFinancials.date, date));
    
    if (existing.length > 0) {
      await db.update(dailyFinancials)
        .set({
          totalExpenses: summary.totalExpenses,
          totalRevenue: summary.totalRevenue,
          netProfit: summary.netProfit,
          expenseBreakdown: summary.expensesByCategory,
          revenueBreakdown: summary.revenueByPlan,
          updatedAt: new Date(),
        })
        .where(eq(dailyFinancials.date, date));
    } else {
      await db.insert(dailyFinancials).values({
        date,
        totalExpenses: summary.totalExpenses,
        totalRevenue: summary.totalRevenue,
        netProfit: summary.netProfit,
        expenseBreakdown: summary.expensesByCategory,
        revenueBreakdown: summary.revenueByPlan,
      });
    }
  }

  // 2FA Verification codes methods
  async createVerificationCode(email: string, type: string): Promise<VerificationCode> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Invalidate any existing unused codes for this email+type to prevent conflicts
    await db.update(verificationCodes)
      .set({ used: true })
      .where(and(
        eq(verificationCodes.email, normalizedEmail),
        eq(verificationCodes.type, type),
        eq(verificationCodes.used, false)
      ));
    
    // Generate a cryptographically secure 6-digit code
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const code = (100000 + (randomBuffer[0] % 900000)).toString();
    // Code expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const [result] = await db.insert(verificationCodes).values({
      email: normalizedEmail,
      code,
      type,
      expiresAt,
    }).returning();
    
    return result;
  }

  async getVerificationCode(email: string, code: string, type: string): Promise<VerificationCode | undefined> {
    const [result] = await db.select().from(verificationCodes)
      .where(and(
        eq(verificationCodes.email, email.toLowerCase().trim()),
        eq(verificationCodes.code, code),
        eq(verificationCodes.type, type),
        eq(verificationCodes.used, false),
        gte(verificationCodes.expiresAt, new Date())
      ));
    return result;
  }

  async markVerificationCodeUsed(id: number): Promise<void> {
    await db.update(verificationCodes)
      .set({ used: true })
      .where(eq(verificationCodes.id, id));
  }

  async cleanupExpiredCodes(): Promise<void> {
    await db.delete(verificationCodes)
      .where(lte(verificationCodes.expiresAt, new Date()));
  }

  // Login sessions methods
  async createLoginSession(session: InsertUserLoginSession): Promise<UserLoginSession> {
    const [result] = await db.insert(userLoginSessions).values(session).returning();
    return result;
  }

  async getLoginSessions(userId: string): Promise<UserLoginSession[]> {
    return db.select().from(userLoginSessions)
      .where(eq(userLoginSessions.userId, userId))
      .orderBy(desc(userLoginSessions.lastActiveAt));
  }

  async updateLoginSessionActivity(sessionId: string): Promise<void> {
    await db.update(userLoginSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(userLoginSessions.sessionId, sessionId));
  }

  async deleteLoginSession(sessionId: string): Promise<boolean> {
    const result = await db.delete(userLoginSessions)
      .where(eq(userLoginSessions.sessionId, sessionId));
    return true;
  }

  async deleteAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    if (exceptSessionId) {
      await db.delete(userLoginSessions)
        .where(and(
          eq(userLoginSessions.userId, userId),
          ne(userLoginSessions.sessionId, exceptSessionId)
        ));
    } else {
      await db.delete(userLoginSessions)
        .where(eq(userLoginSessions.userId, userId));
    }
  }

  // Writing samples methods (AI learning)
  async createWritingSample(sample: InsertWritingSample): Promise<WritingSample> {
    const [result] = await db.insert(writingSamples).values(sample).returning();
    return result;
  }

  async getWritingSamples(userId: string, limit: number = 20): Promise<WritingSample[]> {
    return db.select().from(writingSamples)
      .where(eq(writingSamples.userId, userId))
      .orderBy(desc(writingSamples.createdAt))
      .limit(limit);
  }

  async getWritingSampleCount(userId: string): Promise<number> {
    const result = await db.select({ count: count() }).from(writingSamples)
      .where(eq(writingSamples.userId, userId));
    return result[0]?.count ?? 0;
  }

  async deleteOldWritingSamples(userId: string, keepCount: number): Promise<void> {
    const samples = await db.select({ id: writingSamples.id }).from(writingSamples)
      .where(eq(writingSamples.userId, userId))
      .orderBy(desc(writingSamples.createdAt));
    
    if (samples.length > keepCount) {
      const idsToDelete = samples.slice(keepCount).map(s => s.id);
      for (const id of idsToDelete) {
        await db.delete(writingSamples).where(eq(writingSamples.id, id));
      }
    }
  }

  // Learned writing style methods
  async getLearnedWritingStyle(userId: string): Promise<LearnedWritingStyle | undefined> {
    const [result] = await db.select().from(learnedWritingStyles)
      .where(eq(learnedWritingStyles.userId, userId))
      .limit(1);
    return result;
  }

  async upsertLearnedWritingStyle(userId: string, style: Partial<InsertLearnedWritingStyle>): Promise<LearnedWritingStyle> {
    const existing = await this.getLearnedWritingStyle(userId);
    
    if (existing) {
      const [updated] = await db.update(learnedWritingStyles)
        .set({
          ...style,
          updatedAt: new Date(),
        })
        .where(eq(learnedWritingStyles.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(learnedWritingStyles)
        .values({
          userId,
          styleAnalysis: style.styleAnalysis || "",
          commonPhrases: style.commonPhrases || [],
          greetingPatterns: style.greetingPatterns || [],
          signOffPatterns: style.signOffPatterns || [],
          toneDescription: style.toneDescription,
          avgSentenceLength: style.avgSentenceLength,
          samplesAnalyzed: style.samplesAnalyzed || 0,
        })
        .returning();
      return created;
    }
  }

  // Email notes methods
  async getEmailNote(userId: string, messageId: string): Promise<EmailNote | undefined> {
    const [result] = await db.select().from(emailNotes)
      .where(and(eq(emailNotes.userId, userId), eq(emailNotes.messageId, messageId)))
      .limit(1);
    return result;
  }

  async createEmailNote(note: InsertEmailNote): Promise<EmailNote> {
    const [created] = await db.insert(emailNotes).values(note).returning();
    return created;
  }

  async updateEmailNote(userId: string, messageId: string, content: string): Promise<EmailNote | undefined> {
    const [updated] = await db.update(emailNotes)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(emailNotes.userId, userId), eq(emailNotes.messageId, messageId)))
      .returning();
    return updated;
  }

  async deleteEmailNote(userId: string, messageId: string): Promise<boolean> {
    const result = await db.delete(emailNotes)
      .where(and(eq(emailNotes.userId, userId), eq(emailNotes.messageId, messageId)));
    return (result.rowCount ?? 0) > 0;
  }

  // AI inbox suggestions methods
  async createAiInboxSuggestion(suggestion: InsertAiInboxSuggestion): Promise<AiInboxSuggestion> {
    const [created] = await db.insert(aiInboxSuggestions).values(suggestion).returning();
    return created;
  }

  async getPendingAiInboxSuggestions(userId: string): Promise<AiInboxSuggestion[]> {
    return db.select().from(aiInboxSuggestions)
      .where(and(eq(aiInboxSuggestions.userId, userId), eq(aiInboxSuggestions.status, "pending")))
      .orderBy(desc(aiInboxSuggestions.createdAt));
  }

  async getApprovedAiInboxSuggestions(userId: string): Promise<AiInboxSuggestion[]> {
    return db.select().from(aiInboxSuggestions)
      .where(and(eq(aiInboxSuggestions.userId, userId), eq(aiInboxSuggestions.status, "approved")))
      .orderBy(desc(aiInboxSuggestions.createdAt));
  }

  async getAllActiveAiInboxSuggestions(userId: string): Promise<AiInboxSuggestion[]> {
    return db.select().from(aiInboxSuggestions)
      .where(and(
        eq(aiInboxSuggestions.userId, userId),
        sql`${aiInboxSuggestions.status} IN ('pending', 'approved')`
      ))
      .orderBy(desc(aiInboxSuggestions.createdAt));
  }

  async getAiInboxSuggestionsByBatch(userId: string, batchId: string): Promise<AiInboxSuggestion[]> {
    return db.select().from(aiInboxSuggestions)
      .where(and(eq(aiInboxSuggestions.userId, userId), eq(aiInboxSuggestions.batchId, batchId)))
      .orderBy(desc(aiInboxSuggestions.confidence));
  }

  async updateAiInboxSuggestionStatus(id: number, status: string, executedAt?: Date): Promise<AiInboxSuggestion | undefined> {
    const [updated] = await db.update(aiInboxSuggestions)
      .set({ status, executedAt: executedAt || undefined })
      .where(eq(aiInboxSuggestions.id, id))
      .returning();
    return updated;
  }

  async deleteAiInboxSuggestionsByBatch(userId: string, batchId: string): Promise<boolean> {
    const result = await db.delete(aiInboxSuggestions)
      .where(and(eq(aiInboxSuggestions.userId, userId), eq(aiInboxSuggestions.batchId, batchId)));
    return (result.rowCount ?? 0) > 0;
  }

  async clearOldAiInboxSuggestions(userId: string): Promise<void> {
    await db.delete(aiInboxSuggestions)
      .where(and(
        eq(aiInboxSuggestions.userId, userId),
        ne(aiInboxSuggestions.status, "pending")
      ));
  }

  // Email action history methods (AI learning)
  async recordEmailAction(userId: string, action: { messageId: string; actionType: string; senderEmail?: string; subjectKeywords?: string[]; isNewsletter?: boolean; isPromotion?: boolean; folderMovedTo?: string }): Promise<void> {
    const senderDomain = action.senderEmail?.split("@")[1] || null;
    await db.insert(emailActionHistory).values({
      userId,
      messageId: action.messageId,
      actionType: action.actionType,
      senderEmail: action.senderEmail || null,
      senderDomain,
      subjectKeywords: action.subjectKeywords || [],
      isNewsletter: action.isNewsletter || false,
      isPromotion: action.isPromotion || false,
      folderMovedTo: action.folderMovedTo || null,
    });
  }

  async getEmailActionPatterns(userId: string): Promise<{ deletedDomains: string[]; deletedSenders: string[]; archivedDomains: string[]; newsletterPatterns: string[] }> {
    const actions = await db.select().from(emailActionHistory)
      .where(eq(emailActionHistory.userId, userId))
      .orderBy(desc(emailActionHistory.createdAt))
      .limit(500);
    
    const deletedDomains: Map<string, number> = new Map();
    const deletedSenders: Map<string, number> = new Map();
    const archivedDomains: Map<string, number> = new Map();
    const newsletterPatterns: Set<string> = new Set();

    for (const action of actions) {
      if (action.actionType === "delete" || action.actionType === "trash") {
        if (action.senderDomain) {
          deletedDomains.set(action.senderDomain, (deletedDomains.get(action.senderDomain) || 0) + 1);
        }
        if (action.senderEmail) {
          deletedSenders.set(action.senderEmail, (deletedSenders.get(action.senderEmail) || 0) + 1);
        }
      }
      if (action.actionType === "archive") {
        if (action.senderDomain) {
          archivedDomains.set(action.senderDomain, (archivedDomains.get(action.senderDomain) || 0) + 1);
        }
      }
      if (action.isNewsletter && action.senderDomain) {
        newsletterPatterns.add(action.senderDomain);
      }
    }

    // Return domains/senders that have been actioned at least 2 times (pattern)
    return {
      deletedDomains: Array.from(deletedDomains.entries()).filter(([_, count]) => count >= 2).map(([domain]) => domain),
      deletedSenders: Array.from(deletedSenders.entries()).filter(([_, count]) => count >= 2).map(([sender]) => sender),
      archivedDomains: Array.from(archivedDomains.entries()).filter(([_, count]) => count >= 2).map(([domain]) => domain),
      newsletterPatterns: Array.from(newsletterPatterns),
    };
  }

  // Custom folders methods
  async getCustomFolders(userId: string): Promise<CustomFolder[]> {
    return db.select().from(customFolders)
      .where(eq(customFolders.userId, userId))
      .orderBy(customFolders.createdAt);
  }

  async createCustomFolder(userId: string, name: string, aiDescription?: string): Promise<CustomFolder> {
    const [created] = await db.insert(customFolders).values({
      userId,
      name,
      aiDescription: aiDescription || null,
    }).returning();
    return created;
  }

  async updateCustomFolder(id: number, userId: string, updates: { name?: string; aiDescription?: string; icon?: string }): Promise<CustomFolder | undefined> {
    const [updated] = await db.update(customFolders)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(customFolders.id, id), eq(customFolders.userId, userId)))
      .returning();
    return updated;
  }

  async deleteCustomFolder(id: number, userId: string): Promise<boolean> {
    const deleted = await db.delete(customFolders)
      .where(and(eq(customFolders.id, id), eq(customFolders.userId, userId)))
      .returning();
    if (deleted.length > 0) {
      await db.delete(emailFolderAssignments)
        .where(and(eq(emailFolderAssignments.userId, userId), eq(emailFolderAssignments.folderId, id)));
    }
    return deleted.length > 0;
  }

  // Email folder assignment methods
  async assignEmailToFolder(userId: string, messageId: string, folderId: number): Promise<EmailFolderAssignment> {
    // First remove any existing assignment for this email
    await db.delete(emailFolderAssignments)
      .where(and(eq(emailFolderAssignments.userId, userId), eq(emailFolderAssignments.messageId, messageId)));
    
    // Then create the new assignment
    const [created] = await db.insert(emailFolderAssignments).values({
      userId,
      messageId,
      folderId,
    }).returning();
    return created;
  }

  async getEmailFolderAssignment(userId: string, messageId: string): Promise<EmailFolderAssignment | undefined> {
    const [assignment] = await db.select().from(emailFolderAssignments)
      .where(and(eq(emailFolderAssignments.userId, userId), eq(emailFolderAssignments.messageId, messageId)));
    return assignment;
  }

  async getEmailsInFolder(userId: string, folderId: number): Promise<string[]> {
    const assignments = await db.select().from(emailFolderAssignments)
      .where(and(eq(emailFolderAssignments.userId, userId), eq(emailFolderAssignments.folderId, folderId)));
    return assignments.map(a => a.messageId);
  }

  async removeEmailFromFolder(userId: string, messageId: string): Promise<boolean> {
    const result = await db.delete(emailFolderAssignments)
      .where(and(eq(emailFolderAssignments.userId, userId), eq(emailFolderAssignments.messageId, messageId)));
    return (result.rowCount ?? 0) > 0;
  }

  async isEmailStarred(userId: string, messageId: string): Promise<boolean> {
    const result = await db.select().from(starredEmails)
      .where(and(eq(starredEmails.userId, userId), eq(starredEmails.messageId, messageId)))
      .limit(1);
    return result.length > 0;
  }

  async getStarredEmailIds(userId: string): Promise<string[]> {
    const result = await db.select({ messageId: starredEmails.messageId }).from(starredEmails)
      .where(eq(starredEmails.userId, userId));
    return result.map(r => r.messageId);
  }

  async toggleStarEmail(userId: string, messageId: string): Promise<boolean> {
    const isStarred = await this.isEmailStarred(userId, messageId);
    if (isStarred) {
      await db.delete(starredEmails)
        .where(and(eq(starredEmails.userId, userId), eq(starredEmails.messageId, messageId)));
      return false;
    } else {
      await db.insert(starredEmails).values({ userId, messageId });
      return true;
    }
  }

  // Local email state methods (UI-only, not synced with Nylas mailbox)
  async getLocalEmailState(userId: string, messageId: string): Promise<LocalEmailState | undefined> {
    const [state] = await db.select().from(localEmailStates)
      .where(and(eq(localEmailStates.userId, userId), eq(localEmailStates.messageId, messageId)));
    return state;
  }

  async getAllLocalEmailStates(userId: string): Promise<Map<string, string>> {
    const states = await db.select({ messageId: localEmailStates.messageId, localFolder: localEmailStates.localFolder })
      .from(localEmailStates)
      .where(eq(localEmailStates.userId, userId));
    return new Map(states.map(s => [s.messageId, s.localFolder]));
  }

  async setLocalEmailFolder(userId: string, messageId: string, folder: string): Promise<LocalEmailState> {
    const existing = await this.getLocalEmailState(userId, messageId);
    if (existing) {
      const [updated] = await db.update(localEmailStates)
        .set({ localFolder: folder, updatedAt: new Date() })
        .where(and(eq(localEmailStates.userId, userId), eq(localEmailStates.messageId, messageId)))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(localEmailStates)
        .values({ userId, messageId, localFolder: folder })
        .returning();
      return created;
    }
  }

  async getLocalEmailsByFolder(userId: string, folder: string): Promise<string[]> {
    const states = await db.select({ messageId: localEmailStates.messageId })
      .from(localEmailStates)
      .where(and(eq(localEmailStates.userId, userId), eq(localEmailStates.localFolder, folder)));
    return states.map(s => s.messageId);
  }

  async getLocalTrashedEmails(userId: string): Promise<string[]> {
    return this.getLocalEmailsByFolder(userId, "trash");
  }

  async getLocalArchivedEmails(userId: string): Promise<string[]> {
    return this.getLocalEmailsByFolder(userId, "archived");
  }

  async permanentlyDeleteEmail(userId: string, messageId: string): Promise<boolean> {
    const result = await db.delete(localEmailStates)
      .where(and(eq(localEmailStates.userId, userId), eq(localEmailStates.messageId, messageId)));
    // Also remove from starred if present
    await db.delete(starredEmails)
      .where(and(eq(starredEmails.userId, userId), eq(starredEmails.messageId, messageId)));
    return (result.rowCount ?? 0) > 0;
  }

  async restoreEmailToInbox(userId: string, messageId: string): Promise<LocalEmailState | undefined> {
    const [updated] = await db.update(localEmailStates)
      .set({ localFolder: "inbox", updatedAt: new Date() })
      .where(and(eq(localEmailStates.userId, userId), eq(localEmailStates.messageId, messageId)))
      .returning();
    return updated;
  }

  // Testimonials methods
  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    const [created] = await db.insert(testimonials).values(testimonial).returning();
    return created;
  }

  async getApprovedTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials)
      .where(eq(testimonials.status, "approved"))
      .orderBy(desc(testimonials.createdAt));
  }

  async getAllTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials)
      .orderBy(desc(testimonials.createdAt));
  }

  async getPendingTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials)
      .where(eq(testimonials.status, "pending"))
      .orderBy(desc(testimonials.createdAt));
  }

  async updateTestimonialStatus(id: number, status: string): Promise<Testimonial | undefined> {
    const [updated] = await db.update(testimonials)
      .set({ status, reviewedAt: new Date() })
      .where(eq(testimonials.id, id))
      .returning();
    return updated;
  }

  async deleteTestimonial(id: number): Promise<boolean> {
    const result = await db.delete(testimonials).where(eq(testimonials.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getUserTestimonial(userId: string): Promise<Testimonial | undefined> {
    const [testimonial] = await db.select().from(testimonials)
      .where(eq(testimonials.userId, userId))
      .limit(1);
    return testimonial;
  }

  // Daily send limit methods (Free plan - 5 emails per day)
  async checkDailySendLimit(userId: string): Promise<{ canSend: boolean; remaining: number; resetAt: Date | null }> {
    const FREE_DAILY_LIMIT = 5;
    const user = await this.getUser(userId);
    if (!user) {
      return { canSend: false, remaining: 0, resetAt: null };
    }

    // Paid plans have unlimited sends
    if (user.plan !== "free") {
      return { canSend: true, remaining: -1, resetAt: null };
    }

    const now = new Date();
    let resetAt = user.dailySendResetAt;
    let count = user.dailySendCount;

    // Check if we need to reset the counter (24 hours elapsed)
    if (!resetAt || now >= resetAt) {
      // Reset the counter
      const newResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await db.update(users)
        .set({ dailySendCount: 0, dailySendResetAt: newResetAt })
        .where(eq(users.id, userId));
      return { canSend: true, remaining: FREE_DAILY_LIMIT, resetAt: newResetAt };
    }

    const remaining = Math.max(0, FREE_DAILY_LIMIT - count);
    return { canSend: remaining > 0, remaining, resetAt };
  }

  async incrementDailySendCount(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user || user.plan !== "free") {
      return;
    }

    const now = new Date();
    let newCount = user.dailySendCount + 1;
    let resetAt = user.dailySendResetAt;

    // If no reset time set, set it for 24 hours from now
    if (!resetAt || now >= resetAt) {
      resetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      newCount = 1;
    }

    await db.update(users)
      .set({ dailySendCount: newCount, dailySendResetAt: resetAt })
      .where(eq(users.id, userId));
  }

  // Email Campaign methods (Business plan only)
  async createCampaign(campaign: InsertCampaign): Promise<EmailCampaign> {
    const [created] = await db.insert(emailCampaigns).values(campaign).returning();
    return created;
  }

  async getCampaigns(userId: string): Promise<EmailCampaign[]> {
    return await db.select().from(emailCampaigns)
      .where(eq(emailCampaigns.userId, userId))
      .orderBy(desc(emailCampaigns.createdAt));
  }

  async getCampaign(id: number): Promise<EmailCampaign | undefined> {
    const [campaign] = await db.select().from(emailCampaigns)
      .where(eq(emailCampaigns.id, id));
    return campaign;
  }

  async updateCampaign(id: number, updates: Partial<EmailCampaign>): Promise<EmailCampaign | undefined> {
    const [updated] = await db.update(emailCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailCampaigns.id, id))
      .returning();
    return updated;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    // First delete all recipients
    await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, id));
    // Then delete the campaign
    const result = await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async addCampaignRecipients(campaignId: number, recipients: { email: string; name?: string }[]): Promise<CampaignRecipient[]> {
    if (recipients.length === 0) return [];
    const toInsert = recipients.map(r => ({ campaignId, email: r.email, name: r.name, status: "pending" }));
    const inserted = await db.insert(campaignRecipients).values(toInsert).returning();
    // Update total recipients count
    await db.update(emailCampaigns)
      .set({ totalRecipients: sql`${emailCampaigns.totalRecipients} + ${recipients.length}` })
      .where(eq(emailCampaigns.id, campaignId));
    return inserted;
  }

  async getCampaignRecipients(campaignId: number): Promise<CampaignRecipient[]> {
    return await db.select().from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, campaignId))
      .orderBy(campaignRecipients.createdAt);
  }

  async updateCampaignRecipientStatus(id: number, status: string, errorMessage?: string): Promise<CampaignRecipient | undefined> {
    const updates: Partial<CampaignRecipient> = { status };
    if (status === "sent") {
      updates.sentAt = new Date();
    }
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }
    const [updated] = await db.update(campaignRecipients)
      .set(updates)
      .where(eq(campaignRecipients.id, id))
      .returning();
    return updated;
  }

  async deleteCampaignRecipient(id: number): Promise<boolean> {
    const recipient = await db.select().from(campaignRecipients).where(eq(campaignRecipients.id, id));
    if (recipient.length > 0) {
      await db.update(emailCampaigns)
        .set({ totalRecipients: sql`GREATEST(${emailCampaigns.totalRecipients} - 1, 0)` })
        .where(eq(emailCampaigns.id, recipient[0].campaignId));
    }
    const result = await db.delete(campaignRecipients).where(eq(campaignRecipients.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async clearCampaignRecipients(campaignId: number): Promise<boolean> {
    await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, campaignId));
    await db.update(emailCampaigns)
      .set({ totalRecipients: 0 })
      .where(eq(emailCampaigns.id, campaignId));
    return true;
  }

  // Cached emails methods for instant loading
  async getCachedEmails(userId: number): Promise<any[]> {
    const cached = await db.select().from(cachedEmails)
      .where(eq(cachedEmails.userId, userId))
      .orderBy(desc(cachedEmails.receivedAt));
    
    return cached.map((email, index) => ({
      id: index + 1,
      nylasId: email.nylasId,
      sender: email.sender,
      senderEmail: email.senderEmail,
      subject: email.subject,
      preview: decryptEmailContent(email.preview) || "",
      body: decryptEmailContent(email.body) || "",
      receivedAt: email.receivedAt,
      isRead: email.isRead,
      isStarred: false,
      folder: email.folder,
      threadId: email.threadId,
      avatarColor: email.avatarColor,
    }));
  }

  async saveCachedEmails(userId: number, emails: any[]): Promise<void> {
    const userIdStr = String(userId);

    // Get existing cached email IDs to detect new emails
    const existingCached = await db.select({ nylasId: cachedEmails.nylasId })
      .from(cachedEmails)
      .where(eq(cachedEmails.userId, userId));
    const existingIds = new Set(existingCached.map(e => e.nylasId));

    // Only detect new emails if we have a previous cache baseline
    if (existingIds.size > 0) {
      // Find new unread inbox emails not already in cache
      const newEmails = emails.filter(e => 
        e.nylasId && !existingIds.has(e.nylasId) && !e.isRead && (e.folder === "inbox" || !e.folder)
      );

      if (newEmails.length > 0) {
        // Check which email IDs already have notifications to avoid duplicates
        const recentNotifications = await db.select()
          .from(notifications)
          .where(and(
            eq(notifications.userId, userIdStr),
            sql`${notifications.type} IN ('new_email', 'new_email_batch')`,
            sql`${notifications.createdAt} > NOW() - INTERVAL '1 hour'`
          ));
        const notifiedEmailIds = new Set(
          recentNotifications
            .filter(n => n.data && (n.data as any).emailId)
            .map(n => (n.data as any).emailId)
        );

        const trulyNewEmails = newEmails.filter(e => !notifiedEmailIds.has(e.nylasId));

        if (trulyNewEmails.length > 0 && trulyNewEmails.length <= 5) {
          for (const email of trulyNewEmails) {
            await this.createNotification({
              userId: userIdStr,
              type: "new_email",
              title: email.sender || "New Email",
              message: email.subject || "No subject",
              isRead: false,
              data: { emailId: email.nylasId, senderEmail: email.senderEmail, subject: email.subject },
            });
          }
        } else if (trulyNewEmails.length > 5) {
          await this.createNotification({
            userId: userIdStr,
            type: "new_email_batch",
            title: `${trulyNewEmails.length} new emails`,
            message: `You have ${trulyNewEmails.length} new emails in your inbox`,
            isRead: false,
            data: { count: trulyNewEmails.length },
          });
        }
      }
    }

    // Clear existing cache for user
    await db.delete(cachedEmails).where(eq(cachedEmails.userId, userId));
    
    // Insert new emails with encrypted body and preview
    if (emails.length > 0) {
      const toInsert = emails.map(email => ({
        nylasId: email.nylasId,
        userId,
        sender: email.sender,
        senderEmail: email.senderEmail,
        subject: email.subject,
        preview: encryptEmailContent(email.preview) || "",
        body: encryptEmailContent(email.body || ""),
        receivedAt: email.receivedAt ? new Date(email.receivedAt) : new Date(),
        isRead: email.isRead ?? false,
        folder: email.folder || "inbox",
        threadId: email.threadId,
        avatarColor: email.avatarColor,
      }));
      
      // Insert in batches to avoid query size limits
      const batchSize = 100;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        await db.insert(cachedEmails).values(batch);
      }
    }
  }

  async clearCachedEmails(userId: number): Promise<void> {
    await db.delete(cachedEmails).where(eq(cachedEmails.userId, userId));
  }

  // Feature flags methods
  async getFeatureFlag(key: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
    return flag;
  }

  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return await db.select().from(featureFlags).orderBy(featureFlags.key);
  }

  async setFeatureFlag(key: string, enabled: boolean, allowedEmails?: string[], description?: string): Promise<FeatureFlag> {
    const existing = await this.getFeatureFlag(key);
    
    if (existing) {
      const [updated] = await db.update(featureFlags)
        .set({
          enabled,
          allowedEmails: allowedEmails || existing.allowedEmails,
          description: description ?? existing.description,
          updatedAt: new Date(),
        })
        .where(eq(featureFlags.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(featureFlags)
        .values({
          key,
          enabled,
          allowedEmails: allowedEmails || [],
          description,
        })
        .returning();
      return created;
    }
  }

  async isFeatureEnabled(key: string, userEmail?: string): Promise<boolean> {
    const flag = await this.getFeatureFlag(key);
    
    if (!flag) {
      return true;
    }
    
    if (flag.enabled) {
      return true;
    }
    
    if (userEmail && flag.allowedEmails && flag.allowedEmails.length > 0) {
      return flag.allowedEmails.some(
        email => email.toLowerCase().trim() === userEmail.toLowerCase().trim()
      );
    }
    
    return false;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user;
  }

  async generateReferralCode(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    if (user?.referralCode) return user.referralCode;
    const code = randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
    return code;
  }

  async createReferral(referrerUserId: string, referredUserId: string): Promise<Referral> {
    const [referral] = await db.insert(referrals).values({
      referrerUserId,
      referredUserId,
      status: "registered",
    }).returning();
    return referral;
  }

  async markReferralSubscribed(referredUserId: string): Promise<void> {
    const [existing] = await db.select().from(referrals)
      .where(and(
        eq(referrals.referredUserId, referredUserId),
        eq(referrals.status, "registered")
      ));
    if (!existing) return;

    await db.update(referrals)
      .set({ status: "subscribed", connectedAt: new Date() })
      .where(eq(referrals.id, existing.id));

    const stats = await this.getReferralStats(existing.referrerUserId);
    if (stats.subscribed >= 2 && stats.subscribed % 2 === 0) {
      await this.applyProCredit(existing.referrerUserId, 1);
    }
  }

  async getReferralStats(userId: string): Promise<{ total: number; subscribed: number }> {
    const allReferrals = await db.select().from(referrals)
      .where(eq(referrals.referrerUserId, userId));
    const total = allReferrals.length;
    const subscribed = allReferrals.filter(r => r.status === "subscribed").length;
    return { total, subscribed };
  }

  async getReferrals(userId: string): Promise<Referral[]> {
    return db.select().from(referrals)
      .where(eq(referrals.referrerUserId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async applyProCredit(userId: string, months: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    const now = new Date();
    const currentEnd = user.proCreditsUntil && new Date(user.proCreditsUntil) > now
      ? new Date(user.proCreditsUntil)
      : now;
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + months);
    await db.update(users).set({ proCreditsUntil: newEnd }).where(eq(users.id, userId));
  }
}

export const storage = new MemStorage();
