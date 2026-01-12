import { type User, type InsertUser, type Email, type InsertEmail, type Draft, type InsertDraft, type NylasGrant, type InsertNylasGrant, type AiPreferences, type SupportMessage, type InsertSupportMessage, type AssistantSettings, type AssistantMessage, users, nylasGrants, supportMessages, assistantSettings, assistantMessages } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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

  getNylasGrant(userId: string): Promise<NylasGrant | undefined>;
  getNylasGrantByEmail(email: string): Promise<NylasGrant | undefined>;
  createNylasGrant(grant: InsertNylasGrant): Promise<NylasGrant>;
  updateNylasGrant(userId: string, updates: Partial<NylasGrant>): Promise<NylasGrant | undefined>;
  deleteNylasGrant(userId: string): Promise<boolean>;

  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;

  // Assistant methods
  getAssistantSettings(userId: string): Promise<AssistantSettings | undefined>;
  upsertAssistantSettings(userId: string, updates: Partial<AssistantSettings>): Promise<AssistantSettings>;
  getAssistantMessages(userId: string): Promise<AssistantMessage[]>;
  addAssistantMessage(userId: string, role: string, content: string): Promise<AssistantMessage>;
  clearAssistantMessages(userId: string): Promise<void>;
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
        })
        .returning();
      return created;
    }
  }

  async getAssistantMessages(userId: string): Promise<AssistantMessage[]> {
    return db.select()
      .from(assistantMessages)
      .where(eq(assistantMessages.userId, userId))
      .orderBy(assistantMessages.createdAt);
  }

  async addAssistantMessage(userId: string, role: string, content: string): Promise<AssistantMessage> {
    const [message] = await db.insert(assistantMessages)
      .values({ userId, role, content })
      .returning();
    return message;
  }

  async clearAssistantMessages(userId: string): Promise<void> {
    await db.delete(assistantMessages).where(eq(assistantMessages.userId, userId));
  }
}

export const storage = new MemStorage();
