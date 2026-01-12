import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import * as nylas from "./nylas";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { aiPreferencesSchema } from "@shared/schema";

const scryptAsync = promisify(scrypt);

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

async function verifyPassword(storedPassword: string, suppliedPassword: string): Promise<boolean> {
  const [salt, hashedPassword] = storedPassword.split(":");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function getRedirectUri(req: any): string {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  return `${protocol}://${host}/api/nylas/callback`;
}

const pendingOAuthStates: Map<string, { userId: string; provider: string; expiresAt: number }> = new Map();

function generateStateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function cleanupExpiredStates(): void {
  const now = Date.now();
  for (const [token, data] of pendingOAuthStates.entries()) {
    if (data.expiresAt < now) {
      pendingOAuthStates.delete(token);
    }
  }
}

interface ResponseTimeCache {
  signature: string;
  estimatedMinutes: number;
  unreadCount: number;
  totalWords: number;
}

const responseTimeCache: Map<string, ResponseTimeCache> = new Map();

const formattedBodyCache: Map<string, { body: string; timestamp: number }> = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cleanupFormattedBodyCache() {
  const now = Date.now();
  for (const [key, value] of Array.from(formattedBodyCache.entries())) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      formattedBodyCache.delete(key);
    }
  }
  if (formattedBodyCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(formattedBodyCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, formattedBodyCache.size - CACHE_MAX_SIZE);
    toRemove.forEach(([key]) => formattedBodyCache.delete(key));
  }
}

function generateUnreadSignature(unreadEmailIds: number[]): string {
  return unreadEmailIds.sort((a, b) => a - b).join(",");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ email, password: hashedPassword });
      
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Session error" });
        }
        req.session.userId = user.id;
        res.json({ 
          user: { 
            id: user.id, 
            email: user.email, 
            plan: user.plan,
            onboardingCompleted: user.onboardingCompleted 
          } 
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValid = await verifyPassword(user.password, password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Session error" });
        }
        req.session.userId = user.id;
        res.json({ 
          user: { 
            id: user.id, 
            email: user.email, 
            plan: user.plan,
            onboardingCompleted: user.onboardingCompleted 
          } 
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.post("/api/support/contact", async (req, res) => {
    try {
      const { name, email, message } = req.body;
      
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required" });
      }

      if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
        return res.status(400).json({ error: "Invalid input format" });
      }

      if (name.length > 100 || email.length > 255 || message.length > 5000) {
        return res.status(400).json({ error: "Input too long" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      await storage.createSupportMessage({ name, email, message });
      
      console.log(`Support message received from ${email}: ${name}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Support contact error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.json({ user: null });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.json({ user: null });
    }

    const grant = await storage.getNylasGrant(user.id);
    
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        plan: user.plan,
        onboardingCompleted: user.onboardingCompleted,
        aiPreferences: user.aiPreferences,
        emailConnected: !!grant,
        connectedEmail: grant?.email || null,
        connectedProvider: grant?.provider || null,
        createdAt: user.createdAt
      } 
    });
  });

  app.post("/api/user/plan", requireAuth, async (req, res) => {
    try {
      const { plan } = req.body;
      if (!plan || !["free", "pro", "business"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const user = await storage.updateUser(req.session.userId!, { plan });
      res.json({ user: { id: user!.id, email: user!.email, plan: user!.plan } });
    } catch (error) {
      console.error("Plan update error:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  app.post("/api/user/onboarding", requireAuth, async (req, res) => {
    try {
      const { aiPreferences } = req.body;
      const parsed = aiPreferencesSchema.safeParse(aiPreferences);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid AI preferences" });
      }

      const user = await storage.updateUser(req.session.userId!, { 
        aiPreferences: parsed.data,
        onboardingCompleted: true 
      });
      res.json({ user: { id: user!.id, email: user!.email, onboardingCompleted: user!.onboardingCompleted } });
    } catch (error) {
      console.error("Onboarding error:", error);
      res.status(500).json({ error: "Failed to save onboarding" });
    }
  });

  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const grant = await storage.getNylasGrant(user.id);
      res.json({
        email: user.email,
        plan: user.plan,
        aiPreferences: user.aiPreferences,
        emailSignature: user.emailSignature,
        signatureEnabled: user.signatureEnabled,
        connectedEmail: grant ? { email: grant.email, provider: grant.provider } : null,
      });
    } catch (error) {
      console.error("Settings fetch error:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings/password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const isValid = await verifyPassword(user.password, currentPassword);
      if (!isValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(req.session.userId!, { password: hashedPassword });
      res.json({ success: true });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.put("/api/settings/signature", requireAuth, async (req, res) => {
    try {
      const { emailSignature, signatureEnabled } = req.body;
      await storage.updateUser(req.session.userId!, { 
        emailSignature: emailSignature ?? null,
        signatureEnabled: signatureEnabled ?? false
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Signature update error:", error);
      res.status(500).json({ error: "Failed to update signature" });
    }
  });

  app.put("/api/settings/ai-preferences", requireAuth, async (req, res) => {
    try {
      const { aiPreferences } = req.body;
      const parsed = aiPreferencesSchema.safeParse(aiPreferences);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid AI preferences" });
      }
      await storage.updateUser(req.session.userId!, { aiPreferences: parsed.data });
      res.json({ success: true });
    } catch (error) {
      console.error("AI preferences update error:", error);
      res.status(500).json({ error: "Failed to update AI preferences" });
    }
  });

  app.delete("/api/user", requireAuth, async (req, res) => {
    try {
      await storage.deleteNylasGrant(req.session.userId!);
      await storage.deleteUser(req.session.userId!);
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.get("/api/nylas/auth-url", requireAuth, async (req, res) => {
    try {
      const provider = req.query.provider as string;
      if (!provider || !['google', 'microsoft'].includes(provider)) {
        return res.status(400).json({ error: "Invalid provider. Use 'google' or 'microsoft'" });
      }

      cleanupExpiredStates();
      
      const stateToken = generateStateToken();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      pendingOAuthStates.set(stateToken, { userId: req.session.userId!, provider, expiresAt });
      
      const redirectUri = getRedirectUri(req);
      const authUrl = await nylas.getAuthUrl(provider, redirectUri, stateToken);
      
      res.json({ url: authUrl });
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/nylas/callback", async (req, res) => {
    try {
      console.log("OAuth callback received:", JSON.stringify(req.query));
      
      const { code, state, error, error_description } = req.query;
      
      if (error) {
        console.error("OAuth error from provider:", error, error_description);
        return res.redirect(`/connect-email?error=${encodeURIComponent(String(error_description || error))}`);
      }
      
      if (!code || typeof code !== 'string') {
        console.error("Missing authorization code. Query params:", req.query);
        return res.status(400).send("Missing authorization code");
      }

      if (!state || typeof state !== 'string') {
        console.error("Missing state token in OAuth callback");
        return res.redirect('/?error=invalid_state');
      }

      const storedState = pendingOAuthStates.get(state);
      if (!storedState) {
        console.error("Unknown or expired state token");
        return res.redirect('/?error=invalid_state');
      }

      if (storedState.expiresAt < Date.now()) {
        pendingOAuthStates.delete(state);
        console.error("State token expired");
        return res.redirect('/?error=session_expired');
      }

      pendingOAuthStates.delete(state);
      
      const { userId, provider } = storedState;

      const redirectUri = getRedirectUri(req);
      const grant = await nylas.exchangeCodeForGrant(code, redirectUri);

      const existingGrant = await storage.getNylasGrant(userId);
      if (existingGrant) {
        await storage.updateNylasGrant(userId, {
          grantId: grant.id,
          provider: grant.provider || provider,
          email: grant.email,
        });
      } else {
        await storage.createNylasGrant({
          userId: userId,
          grantId: grant.id,
          provider: grant.provider || provider,
          email: grant.email,
        });
      }

      res.redirect('/?connected=true');
    } catch (error) {
      console.error("Error in OAuth callback:", error);
      res.redirect('/?error=auth_failed');
    }
  });

  app.get("/api/nylas/status", requireAuth, async (req, res) => {
    try {
      const grant = await storage.getNylasGrant(req.session.userId!);
      if (grant) {
        res.json({ connected: true, email: grant.email, provider: grant.provider });
      } else {
        res.json({ connected: false });
      }
    } catch (error) {
      console.error("Error checking Nylas status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  app.post("/api/nylas/disconnect", requireAuth, async (req, res) => {
    try {
      await storage.deleteNylasGrant(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });
  
  app.get("/api/emails", requireAuth, async (req, res) => {
    try {
      const folder = req.query.folder as string | undefined;
      
      const grant = await storage.getNylasGrant(req.session.userId!);
      if (grant) {
        const messages = await nylas.getMessages(grant.grantId, folder || "inbox", grant.provider);
        const emails = messages.map((msg, index) => ({
          id: index + 1,
          nylasId: msg.id,
          sender: msg.from,
          senderEmail: msg.fromEmail,
          subject: msg.subject,
          preview: msg.preview,
          body: "",
          receivedAt: msg.date,
          isRead: msg.isRead,
          isStarred: msg.isStarred,
          folder: folder || "inbox",
          threadId: msg.threadId,
          avatarColor: msg.avatarColor,
        }));
        return res.json(emails);
      }
      
      const emails = await storage.getEmails(folder || "inbox");
      res.json(emails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  app.get("/api/emails/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      
      const grant = await storage.getNylasGrant(req.session.userId!);
      if (grant && id.length > 10) {
        const message = await nylas.getMessage(grant.grantId, id);
        return res.json({
          id: id,
          nylasId: id,
          sender: message.from,
          senderEmail: message.fromEmail,
          subject: message.subject,
          preview: "",
          body: message.body,
          receivedAt: message.date,
          isRead: message.isRead,
          isStarred: message.isStarred,
          folder: "inbox",
          threadId: message.threadId,
          avatarColor: "#3B82F6",
          to: message.to,
          cc: message.cc,
        });
      }
      
      const numericId = parseInt(id);
      const email = await storage.getEmail(numericId);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      res.json(email);
    } catch (error) {
      console.error("Error fetching email:", error);
      res.status(500).json({ error: "Failed to fetch email" });
    }
  });

  app.patch("/api/emails/:id/read", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      
      const grant = await storage.getNylasGrant(req.session.userId!);
      if (grant && id.length > 10) {
        await nylas.markAsRead(grant.grantId, id);
        return res.json({ success: true });
      }
      
      const numericId = parseInt(id);
      const email = await storage.updateEmail(numericId, { isRead: true });
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      res.json(email);
    } catch (error) {
      console.error("Error updating email:", error);
      res.status(500).json({ error: "Failed to update email" });
    }
  });

  app.patch("/api/emails/:id/folder", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const { folder } = req.body;
      
      if (!folder || !["inbox", "archived", "trash", "sent", "drafts", "junk"].includes(folder)) {
        return res.status(400).json({ error: "Invalid folder" });
      }
      
      const grant = await storage.getNylasGrant(req.session.userId!);
      if (grant && id.length > 10) {
        if (folder === "trash") {
          await nylas.trashMessage(grant.grantId, id);
        } else if (folder === "archived") {
          await nylas.archiveMessage(grant.grantId, id);
        }
        return res.json({ success: true });
      }
      
      const numericId = parseInt(id);
      const email = await storage.updateEmail(numericId, { folder });
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      res.json(email);
    } catch (error) {
      console.error("Error moving email:", error);
      res.status(500).json({ error: "Failed to move email" });
    }
  });

  app.patch("/api/emails/:id/star", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const { starred } = req.body;
      
      const grant = await storage.getNylasGrant(req.session.userId!);
      if (grant && id.length > 10) {
        await nylas.toggleStar(grant.grantId, id, starred ?? true);
        return res.json({ success: true });
      }
      
      const numericId = parseInt(id);
      const email = await storage.getEmail(numericId);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      const updated = await storage.updateEmail(numericId, { isStarred: !email.isStarred });
      res.json(updated);
    } catch (error) {
      console.error("Error toggling star:", error);
      res.status(500).json({ error: "Failed to toggle star" });
    }
  });

  app.delete("/api/emails/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      
      const grant = await storage.getNylasGrant(req.session.userId!);
      if (grant && id.length > 10) {
        await nylas.deleteMessage(grant.grantId, id);
        return res.status(204).send();
      }
      
      const numericId = parseInt(id);
      const deleted = await storage.deleteEmail(numericId);
      if (!deleted) {
        return res.status(404).json({ error: "Email not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting email:", error);
      res.status(500).json({ error: "Failed to delete email" });
    }
  });

  app.post("/api/emails/:id/format", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const { body } = req.body;

      if (!body) {
        return res.status(400).json({ error: "Email body is required" });
      }

      const cacheKey = `${req.session.userId}-${id}`;
      cleanupFormattedBodyCache();
      const cached = formattedBodyCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json({ formattedBody: cached.body });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an email formatting assistant. Your job is to clean up and reformat email content to make it easier to read while preserving important formatting.

Rules:
- Remove excessive whitespace, broken formatting, and messy HTML artifacts
- Clean up the structure with proper paragraphs using <p> tags
- PRESERVE these HTML tags: <b>, <strong>, <i>, <em>, <a href="...">
- Keep bold text wrapped in <strong> or <b> tags
- Keep italic text wrapped in <em> or <i> tags  
- Keep links as clickable <a href="url">text</a> tags
- Use <br> for line breaks within paragraphs
- Format lists using <ul>/<ol> and <li> tags
- Remove email signatures, legal disclaimers, and repeated quoted text from previous emails
- Remove tracking pixels, image placeholders, and broken links
- Keep important links but remove tracking parameters from URLs
- Remove any other HTML tags not mentioned above (tables, divs, spans, etc.)

Output clean, well-formatted HTML that preserves bold, italic, and link formatting.
IMPORTANT: Output ONLY the HTML content directly. Do NOT wrap in markdown code blocks like \`\`\`html. Do NOT include any markdown formatting.`
          },
          {
            role: "user",
            content: `Please clean up and format this email content:\n\n${body}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      let formattedBody = completion.choices[0]?.message?.content || body;
      
      // Strip markdown code block markers if present
      formattedBody = formattedBody.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      
      formattedBodyCache.set(cacheKey, { body: formattedBody, timestamp: Date.now() });
      
      res.json({ formattedBody });
    } catch (error) {
      console.error("Error formatting email:", error);
      res.status(500).json({ error: "Failed to format email" });
    }
  });

  app.post("/api/send", requireAuth, async (req, res) => {
    try {
      const { to, cc, bcc, subject, body, replyToMessageId } = req.body;
      
      if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ error: "Recipients required" });
      }
      if (!subject || !body) {
        return res.status(400).json({ error: "Subject and body required" });
      }
      
      const grant = await storage.getNylasGrant(req.session.userId!);
      if (!grant) {
        return res.status(401).json({ error: "Not connected to email provider" });
      }
      
      await nylas.sendMessage(grant.grantId, to, subject, body, replyToMessageId, cc, bcc);
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.get("/api/drafts/:emailId", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const draft = await storage.getDraftByEmailId(emailId);
      res.json(draft || null);
    } catch (error) {
      console.error("Error fetching draft:", error);
      res.status(500).json({ error: "Failed to fetch draft" });
    }
  });

  app.post("/api/drafts/generate", requireAuth, async (req, res) => {
    try {
      const { emailId, tone = "professional" } = req.body;
      
      if (!emailId) {
        return res.status(400).json({ error: "Email ID is required" });
      }

      const email = await storage.getEmail(emailId);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }

      const existingDraft = await storage.getDraftByEmailId(emailId);
      if (existingDraft) {
        await storage.deleteDraft(existingDraft.id);
      }

      const toneDescriptions: Record<string, string> = {
        professional: "professional, courteous, and business-appropriate",
        friendly: "warm, friendly, and approachable while remaining respectful",
        casual: "relaxed, conversational, and informal",
        formal: "highly formal, respectful, and traditional business communication",
        concise: "brief, direct, and to-the-point with minimal pleasantries",
      };

      const toneDesc = toneDescriptions[tone] || toneDescriptions.professional;

      const prompt = `You are an email assistant. Generate a reply to the following email. The reply should be ${toneDesc}.

From: ${email.sender} <${email.senderEmail}>
Subject: ${email.subject}

${email.body}

Please write a reply that:
1. Acknowledges the sender's message
2. Addresses any questions or action items
3. Uses a ${tone} tone throughout
4. Is concise (2-4 paragraphs)

Reply:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an email assistant that writes clear, concise email replies with a ${tone} tone.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 1024,
      });

      const generatedContent = response.choices[0]?.message?.content || "Unable to generate reply. Please try again.";

      const draft = await storage.createDraft({
        emailId,
        content: generatedContent,
        isAiGenerated: true,
        status: "draft",
      });

      res.json(draft);
    } catch (error) {
      console.error("Error generating draft:", error);
      res.status(500).json({ error: "Failed to generate draft" });
    }
  });

  app.patch("/api/drafts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { content } = req.body;
      
      const draft = await storage.updateDraft(id, { 
        content,
        isAiGenerated: false 
      });
      
      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }
      
      res.json(draft);
    } catch (error) {
      console.error("Error updating draft:", error);
      res.status(500).json({ error: "Failed to update draft" });
    }
  });

  app.post("/api/drafts/:id/send", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const draft = await storage.getDraft(id);
      
      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }

      const updated = await storage.updateDraft(id, { status: "sent", scheduledAt: null });
      
      res.json({ success: true, message: "Reply sent successfully", draft: updated });
    } catch (error) {
      console.error("Error sending draft:", error);
      res.status(500).json({ error: "Failed to send draft" });
    }
  });

  app.post("/api/drafts/:id/schedule", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { scheduledAt } = req.body;
      
      if (!scheduledAt) {
        return res.status(400).json({ error: "scheduledAt is required" });
      }

      const draft = await storage.getDraft(id);
      
      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }

      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: "Scheduled time must be in the future" });
      }

      const updated = await storage.updateDraft(id, { 
        status: "scheduled", 
        scheduledAt: scheduledDate 
      });
      
      res.json({ success: true, message: "Reply scheduled successfully", draft: updated });
    } catch (error) {
      console.error("Error scheduling draft:", error);
      res.status(500).json({ error: "Failed to schedule draft" });
    }
  });

  app.post("/api/drafts/:id/cancel-schedule", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const draft = await storage.getDraft(id);
      
      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }

      if (draft.status !== "scheduled") {
        return res.status(400).json({ error: "Draft is not scheduled" });
      }

      const updated = await storage.updateDraft(id, { 
        status: "draft", 
        scheduledAt: null 
      });
      
      res.json({ success: true, message: "Schedule cancelled", draft: updated });
    } catch (error) {
      console.error("Error cancelling schedule:", error);
      res.status(500).json({ error: "Failed to cancel schedule" });
    }
  });

  app.get("/api/drafts/scheduled", requireAuth, async (req, res) => {
    try {
      const scheduled = await storage.getScheduledDrafts();
      res.json(scheduled);
    } catch (error) {
      console.error("Error fetching scheduled drafts:", error);
      res.status(500).json({ error: "Failed to fetch scheduled drafts" });
    }
  });

  app.delete("/api/drafts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDraft(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Draft not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting draft:", error);
      res.status(500).json({ error: "Failed to delete draft" });
    }
  });

  app.get("/api/response-time", requireAuth, async (req, res) => {
    try {
      const folder = req.query.folder as string | undefined;
      const targetFolder = folder || "inbox";
      const emails = await storage.getEmails(targetFolder);
      
      const unreadEmails = emails.filter(e => !e.isRead);
      
      if (unreadEmails.length === 0) {
        responseTimeCache.delete(targetFolder);
        return res.json({ 
          estimatedMinutes: 0, 
          unreadCount: 0,
          totalWords: 0,
          message: "All caught up!" 
        });
      }

      const unreadIds = unreadEmails.map(e => e.id);
      const currentSignature = generateUnreadSignature(unreadIds);
      
      const cached = responseTimeCache.get(targetFolder);
      if (cached && cached.signature === currentSignature) {
        return res.json({
          estimatedMinutes: cached.estimatedMinutes,
          unreadCount: cached.unreadCount,
          totalWords: cached.totalWords
        });
      }

      const totalWords = unreadEmails.reduce((sum, email) => {
        const bodyWords = email.body.split(/\s+/).filter(w => w.length > 0).length;
        const subjectWords = email.subject.split(/\s+/).filter(w => w.length > 0).length;
        return sum + bodyWords + subjectWords;
      }, 0);

      const emailSummaries = unreadEmails.slice(0, 5).map(e => ({
        subject: e.subject,
        preview: e.preview,
        wordCount: e.body.split(/\s+/).filter(w => w.length > 0).length
      }));

      const prompt = `You are an email productivity assistant. Based on the following unread emails, estimate how many minutes it would take a typical professional to read and thoughtfully respond to all of them.

Unread email count: ${unreadEmails.length}
Total words across all unread emails: ${totalWords}

Sample of unread emails:
${emailSummaries.map((e, i) => `${i + 1}. Subject: "${e.subject}" - ${e.wordCount} words - Preview: "${e.preview}"`).join('\n')}

Consider:
- Average reading speed: 200-250 words per minute
- Time to compose thoughtful replies (2-5 minutes per email depending on complexity)
- Some emails may require research or more detailed responses

Return ONLY a JSON object with this exact format:
{"estimatedMinutes": <number>}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an email productivity assistant that estimates response times. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 100,
      });

      const content = response.choices[0]?.message?.content || '{"estimatedMinutes": 5}';
      let estimatedMinutes = 5;
      
      try {
        const parsed = JSON.parse(content);
        estimatedMinutes = parsed.estimatedMinutes || 5;
      } catch {
        const match = content.match(/\d+/);
        if (match) {
          estimatedMinutes = parseInt(match[0]);
        }
      }

      const finalMinutes = Math.max(1, Math.round(estimatedMinutes));
      
      responseTimeCache.set(targetFolder, {
        signature: currentSignature,
        estimatedMinutes: finalMinutes,
        unreadCount: unreadEmails.length,
        totalWords
      });

      res.json({ 
        estimatedMinutes: finalMinutes,
        unreadCount: unreadEmails.length,
        totalWords
      });
    } catch (error) {
      console.error("Error estimating response time:", error);
      const emails = await storage.getEmails("inbox");
      const unreadEmails = emails.filter(e => !e.isRead);
      const totalWords = unreadEmails.reduce((sum, email) => {
        return sum + email.body.split(/\s+/).filter(w => w.length > 0).length;
      }, 0);
      const fallbackMinutes = Math.max(1, Math.round(unreadEmails.length * 3 + totalWords / 200));
      res.json({ 
        estimatedMinutes: fallbackMinutes,
        unreadCount: unreadEmails.length,
        totalWords
      });
    }
  });

  // ============ ASSISTANT ENDPOINTS ============

  // Get assistant settings
  app.get("/api/assistant/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getAssistantSettings(req.session.userId!);
      if (!settings) {
        return res.json({ selectedVoice: "vince", voiceOutputEnabled: true });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching assistant settings:", error);
      res.status(500).json({ error: "Failed to fetch assistant settings" });
    }
  });

  // Update assistant settings
  app.post("/api/assistant/settings", requireAuth, async (req, res) => {
    try {
      const { selectedVoice, voiceOutputEnabled } = req.body;
      const settings = await storage.upsertAssistantSettings(req.session.userId!, {
        selectedVoice,
        voiceOutputEnabled
      });
      res.json(settings);
    } catch (error) {
      console.error("Error updating assistant settings:", error);
      res.status(500).json({ error: "Failed to update assistant settings" });
    }
  });

  // Get assistant conversation history
  app.get("/api/assistant/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getAssistantMessages(req.session.userId!);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching assistant messages:", error);
      res.status(500).json({ error: "Failed to fetch assistant messages" });
    }
  });

  // Chat with assistant
  app.post("/api/assistant/chat", requireAuth, async (req, res) => {
    try {
      const { message, voiceId = "vince" } = req.body;
      const userId = req.session.userId!;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Save user message
      await storage.addAssistantMessage(userId, "user", message);

      // Gather context for the assistant
      const user = await storage.getUser(userId);
      const grant = await storage.getNylasGrant(userId);
      const emails = await storage.getEmails("inbox");
      
      const voiceNames: Record<string, string> = {
        vince: "Vince",
        alex: "Alex",
        leo: "Leo",
        max: "Max"
      };

      const assistantName = voiceNames[voiceId] || "Vince";

      // Build context about user's account and emails
      const unreadCount = emails.filter(e => !e.isRead).length;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEmails = emails.filter(e => new Date(e.receivedAt) >= todayStart);
      const starredCount = emails.filter(e => e.isStarred).length;

      // Get recent conversation history for context
      const recentMessages = await storage.getAssistantMessages(userId);
      const conversationHistory = recentMessages.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

      const systemPrompt = `You are ${assistantName}, a professional personal assistant for an email inbox application called MailFlow.

PERSONALITY:
- Professional, calm, concise
- No emojis, no jokes, no casual slang
- Executive assistant tone
- Short, clear responses by default

YOUR KNOWLEDGE:
1. PRODUCT KNOWLEDGE - You know how MailFlow works:
   - Users can view, read, star, archive, and trash emails
   - AI can generate reply drafts with different tones
   - Users connect their email (Gmail/Outlook) via OAuth
   - Plans: Free, Pro ($12/mo), Business ($29/mo) with 14-day trials
   - Features: AI drafts, smart inbox, email scheduling

2. USER ACCOUNT INFO:
   - User email: ${user?.email || "Unknown"}
   - Connected email: ${grant?.email || "Not connected"}
   - Email provider: ${grant?.provider || "None"}
   - Plan: ${user?.plan || "free"}
   - Onboarding completed: ${user?.onboardingCompleted ? "Yes" : "No"}

3. USER'S EMAIL DATA (current state):
   - Total emails in inbox: ${emails.length}
   - Unread emails: ${unreadCount}
   - Starred emails: ${starredCount}
   - Emails received today: ${todayEmails.length}
   ${todayEmails.length > 0 ? `- Today's senders: ${[...new Set(todayEmails.map(e => e.sender))].slice(0, 5).join(", ")}` : ""}
   ${unreadCount > 0 ? `- Recent unread subjects: ${emails.filter(e => !e.isRead).slice(0, 3).map(e => `"${e.subject}"`).join(", ")}` : ""}

STRICT RULES:
- Only answer inbox questions using the real data provided above
- If you don't have data, say so explicitly
- Never guess or make up email content
- Distinguish between product help, account info, and inbox analysis
- Keep responses under 3 sentences unless more detail is specifically requested`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const responseContent = completion.choices[0]?.message?.content || "I apologize, I couldn't process that request.";
      
      // Save assistant response
      await storage.addAssistantMessage(userId, "assistant", responseContent);

      res.json({ response: responseContent });
    } catch (error) {
      console.error("Error in assistant chat:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Clear assistant conversation
  app.delete("/api/assistant/messages", requireAuth, async (req, res) => {
    try {
      await storage.clearAssistantMessages(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing assistant messages:", error);
      res.status(500).json({ error: "Failed to clear messages" });
    }
  });

  return httpServer;
}
