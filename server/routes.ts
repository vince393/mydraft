import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import * as nylas from "./nylas";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MOCK_USER_ID = "demo-user";

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

function generateUnreadSignature(unreadEmailIds: number[]): string {
  return unreadEmailIds.sort((a, b) => a - b).join(",");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/nylas/auth-url", async (req, res) => {
    try {
      const provider = req.query.provider as string;
      if (!provider || !['google', 'microsoft'].includes(provider)) {
        return res.status(400).json({ error: "Invalid provider. Use 'google' or 'microsoft'" });
      }

      cleanupExpiredStates();
      
      const stateToken = generateStateToken();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      pendingOAuthStates.set(stateToken, { userId: MOCK_USER_ID, provider, expiresAt });
      
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
      const { code, state } = req.query;
      
      if (!code || typeof code !== 'string') {
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

  app.get("/api/nylas/status", async (req, res) => {
    try {
      const grant = await storage.getNylasGrant(MOCK_USER_ID);
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

  app.post("/api/nylas/disconnect", async (req, res) => {
    try {
      await storage.deleteNylasGrant(MOCK_USER_ID);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });
  
  app.get("/api/emails", async (req, res) => {
    try {
      const folder = req.query.folder as string | undefined;
      
      const grant = await storage.getNylasGrant(MOCK_USER_ID);
      if (grant) {
        const messages = await nylas.getMessages(grant.grantId, folder || "inbox");
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

  app.get("/api/emails/:id", async (req, res) => {
    try {
      const id = req.params.id;
      
      const grant = await storage.getNylasGrant(MOCK_USER_ID);
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

  app.patch("/api/emails/:id/read", async (req, res) => {
    try {
      const id = req.params.id;
      
      const grant = await storage.getNylasGrant(MOCK_USER_ID);
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

  app.patch("/api/emails/:id/folder", async (req, res) => {
    try {
      const id = req.params.id;
      const { folder } = req.body;
      
      if (!folder || !["inbox", "archived", "trash", "sent", "drafts", "junk"].includes(folder)) {
        return res.status(400).json({ error: "Invalid folder" });
      }
      
      const grant = await storage.getNylasGrant(MOCK_USER_ID);
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

  app.patch("/api/emails/:id/star", async (req, res) => {
    try {
      const id = req.params.id;
      const { starred } = req.body;
      
      const grant = await storage.getNylasGrant(MOCK_USER_ID);
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

  app.delete("/api/emails/:id", async (req, res) => {
    try {
      const id = req.params.id;
      
      const grant = await storage.getNylasGrant(MOCK_USER_ID);
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

  app.post("/api/send", async (req, res) => {
    try {
      const { to, subject, body, replyToMessageId } = req.body;
      
      if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ error: "Recipients required" });
      }
      if (!subject || !body) {
        return res.status(400).json({ error: "Subject and body required" });
      }
      
      const grant = await storage.getNylasGrant(MOCK_USER_ID);
      if (!grant) {
        return res.status(401).json({ error: "Not connected to email provider" });
      }
      
      await nylas.sendMessage(grant.grantId, to, subject, body, replyToMessageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.get("/api/drafts/:emailId", async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const draft = await storage.getDraftByEmailId(emailId);
      res.json(draft || null);
    } catch (error) {
      console.error("Error fetching draft:", error);
      res.status(500).json({ error: "Failed to fetch draft" });
    }
  });

  app.post("/api/drafts/generate", async (req, res) => {
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

  app.patch("/api/drafts/:id", async (req, res) => {
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

  app.post("/api/drafts/:id/send", async (req, res) => {
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

  app.post("/api/drafts/:id/schedule", async (req, res) => {
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

  app.post("/api/drafts/:id/cancel-schedule", async (req, res) => {
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

  app.get("/api/drafts/scheduled", async (req, res) => {
    try {
      const scheduled = await storage.getScheduledDrafts();
      res.json(scheduled);
    } catch (error) {
      console.error("Error fetching scheduled drafts:", error);
      res.status(500).json({ error: "Failed to fetch scheduled drafts" });
    }
  });

  app.delete("/api/drafts/:id", async (req, res) => {
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

  app.get("/api/response-time", async (req, res) => {
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

  return httpServer;
}
