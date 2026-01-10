import { type User, type InsertUser, type Email, type InsertEmail, type Draft, type InsertDraft } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  private emailIdCounter: number;
  private draftIdCounter: number;

  constructor() {
    this.users = new Map();
    this.emails = new Map();
    this.drafts = new Map();
    this.emailIdCounter = 1;
    this.draftIdCounter = 1;
    
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
    ];

    sampleEmails.forEach((email) => {
      const id = this.emailIdCounter++;
      this.emails.set(id, { ...email, id } as Email);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
}

export const storage = new MemStorage();
