import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/emails", async (req, res) => {
    try {
      const folder = req.query.folder as string | undefined;
      const emails = await storage.getEmails(folder || "inbox");
      res.json(emails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  app.get("/api/emails/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const email = await storage.getEmail(id);
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
      const id = parseInt(req.params.id);
      const email = await storage.updateEmail(id, { isRead: true });
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      res.json(email);
    } catch (error) {
      console.error("Error updating email:", error);
      res.status(500).json({ error: "Failed to update email" });
    }
  });

  app.patch("/api/emails/:id/star", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const email = await storage.getEmail(id);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      const updated = await storage.updateEmail(id, { isStarred: !email.isStarred });
      res.json(updated);
    } catch (error) {
      console.error("Error toggling star:", error);
      res.status(500).json({ error: "Failed to toggle star" });
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
      const { emailId } = req.body;
      
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

      const prompt = `You are a professional email assistant. Generate a professional, courteous reply to the following email. The reply should be concise, helpful, and maintain a professional tone suitable for business communication.

From: ${email.sender} <${email.senderEmail}>
Subject: ${email.subject}

${email.body}

Please write a professional reply that:
1. Acknowledges the sender's message
2. Addresses any questions or action items
3. Maintains a friendly but professional tone
4. Is concise (2-4 paragraphs)

Reply:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional email assistant that writes clear, concise, and professional email replies."
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

      const updated = await storage.updateDraft(id, { status: "sent" });
      
      res.json({ success: true, message: "Reply sent successfully", draft: updated });
    } catch (error) {
      console.error("Error sending draft:", error);
      res.status(500).json({ error: "Failed to send draft" });
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

  return httpServer;
}
