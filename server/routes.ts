import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import * as nylas from "./nylas";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { aiPreferencesSchema } from "@shared/schema";
import { z } from "zod";
import { registerAudioRoutes } from "./replit_integrations/audio";

const assistantPermissionsUpdateSchema = z.object({
  canReadEmails: z.boolean().optional(),
  canSendEmails: z.boolean().optional(),
  canArchive: z.boolean().optional(),
  canTrash: z.boolean().optional(),
  canSearch: z.boolean().optional(),
  requireConfirmation: z.boolean().optional(),
  maxEmailsPerDay: z.number().int().min(0).max(100).optional()
}).strict();

const scryptAsync = promisify(scrypt);

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
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

// Owner/Admin authentication middleware
async function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    console.log("[requireOwner] No session userId");
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    console.log("[requireOwner] User not found for id:", req.session.userId);
    return res.status(401).json({ error: "User not found" });
  }
  
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
  const userEmail = user.email.toLowerCase().trim();
  console.log("[requireOwner] Checking:", { userEmail, ownerEmail, match: userEmail === ownerEmail });
  
  if (!ownerEmail || userEmail !== ownerEmail) {
    return res.status(403).json({ error: "Access denied. Owner privileges required." });
  }
  
  next();
}

// Plan-based gating middleware
async function requirePlan(minPlan: "pro" | "premium") {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    const planHierarchy: Record<string, number> = { free: 0, pro: 1, premium: 2 };
    const userPlanLevel = planHierarchy[user.plan || "free"] || 0;
    const requiredLevel = planHierarchy[minPlan];
    
    if (userPlanLevel < requiredLevel) {
      return res.status(403).json({ 
        error: "Plan upgrade required", 
        requiredPlan: minPlan,
        currentPlan: user.plan || "free"
      });
    }
    
    next();
  };
}

// Helper to get user plan
async function getUserPlan(userId: string): Promise<string> {
  const user = await storage.getUser(userId);
  return user?.plan || "free";
}

// Check if user has at least the specified plan
function hasPlan(userPlan: string, minPlan: "pro" | "premium"): boolean {
  const planHierarchy: Record<string, number> = { free: 0, pro: 1, premium: 2 };
  return (planHierarchy[userPlan] || 0) >= planHierarchy[minPlan];
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
const translationCache: Map<string, { detectedLanguage: string; translatedSubject: string; translatedBody: string; timestamp: number }> = new Map();
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

function cleanupTranslationCache() {
  const now = Date.now();
  for (const [key, value] of Array.from(translationCache.entries())) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      translationCache.delete(key);
    }
  }
  if (translationCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(translationCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, translationCache.size - CACHE_MAX_SIZE);
    toRemove.forEach(([key]) => translationCache.delete(key));
  }
}

function generateUnreadSignature(unreadEmailIds: number[]): string {
  return unreadEmailIds.sort((a, b) => a - b).join(",");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  registerAudioRoutes(app);

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Normalize email to prevent duplicate accounts
      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ email: normalizedEmail, password: hashedPassword });
      
      // Log signup activity
      await storage.createActivityLog(user.id, normalizedEmail, "signup", "New user registered");
      
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

      // Normalize email for consistent lookup
      const normalizedEmail = email.toLowerCase().trim();

      const user = await storage.getUserByEmail(normalizedEmail);
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

  // User feedback endpoints
  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const { feedbackType, message } = req.body;
      
      if (!feedbackType || !message) {
        return res.status(400).json({ error: "Feedback type and message are required" });
      }

      const validTypes = ["feature_request", "bug_report", "general"];
      if (!validTypes.includes(feedbackType)) {
        return res.status(400).json({ error: "Invalid feedback type" });
      }

      if (typeof message !== "string" || message.length > 5000) {
        return res.status(400).json({ error: "Message too long or invalid" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const feedback = await storage.createUserFeedback({
        userId: user.id,
        userEmail: user.email,
        feedbackType,
        message: message.trim(),
      });

      console.log(`Feedback received from ${user.email}: ${feedbackType}`);

      res.json({ success: true, feedback });
    } catch (error) {
      console.error("Feedback submission error:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.get("/api/feedback", requireAuth, async (req, res) => {
    try {
      const feedback = await storage.getUserFeedback(req.session.userId!);
      res.json(feedback);
    } catch (error) {
      console.error("Feedback fetch error:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
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
      if (!plan || !["free", "pro", "premium"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const currentUser = await storage.getUser(req.session.userId!);
      const oldPlan = currentUser?.plan || "free";
      
      const user = await storage.updateUser(req.session.userId!, { plan });
      
      // Log plan change activity
      if (oldPlan !== plan) {
        const planHierarchy: Record<string, number> = { free: 0, pro: 1, premium: 2 };
        const actionType = planHierarchy[plan] > planHierarchy[oldPlan] ? "plan_upgrade" : "plan_downgrade";
        await storage.createActivityLog(
          user!.id, 
          user!.email, 
          actionType, 
          `Plan changed from ${oldPlan} to ${plan}`
        );
      }
      
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

      // Normalize the email from OAuth provider
      const normalizedEmail = grant.email.toLowerCase().trim();

      // Check if this OAuth email is already connected to a different user
      const existingGrantByEmail = await storage.getNylasGrantByEmail(normalizedEmail);
      
      if (existingGrantByEmail && existingGrantByEmail.userId !== userId) {
        // This email is already connected to another account
        // Log the current user into that existing account instead
        const existingUser = await storage.getUser(existingGrantByEmail.userId);
        
        if (existingUser) {
          // Update the grant with fresh OAuth tokens
          await storage.updateNylasGrant(existingGrantByEmail.userId, {
            grantId: grant.id,
            provider: grant.provider || provider,
            email: normalizedEmail,
          });
          
          // Switch session to the existing account
          req.session.userId = existingUser.id;
          await new Promise<void>((resolve, reject) => {
            req.session.save((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          return res.redirect('/?connected=true&account_merged=true');
        }
      }

      // Normal flow: connect email to current user
      const existingGrant = await storage.getNylasGrant(userId);
      const currentUser = await storage.getUser(userId);
      
      if (existingGrant) {
        await storage.updateNylasGrant(userId, {
          grantId: grant.id,
          provider: grant.provider || provider,
          email: normalizedEmail,
        });
      } else {
        await storage.createNylasGrant({
          userId: userId,
          grantId: grant.id,
          provider: grant.provider || provider,
          email: normalizedEmail,
        });
        
        // Log email connection activity
        await storage.createActivityLog(
          userId, 
          currentUser?.email || normalizedEmail, 
          "email_connected", 
          `Connected ${grant.provider || provider} email: ${normalizedEmail}`
        );
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
      const allFolders = req.query.allFolders === "true";
      
      const grant = await storage.getNylasGrant(req.session.userId!);
      if (grant) {
        let allMessages: any[] = [];
        
        if (allFolders) {
          // Fetch from all folders for threading
          const folders = ["inbox", "sent", "trash", "junk", "archived"] as const;
          const folderResults = await Promise.allSettled(
            folders.map(async (f) => {
              try {
                const messages = await nylas.getMessages(grant.grantId, f, grant.provider);
                return messages.map(m => ({ ...m, folder: f }));
              } catch {
                return [];
              }
            })
          );
          
          for (const result of folderResults) {
            if (result.status === "fulfilled") {
              allMessages.push(...result.value);
            }
          }
          
          // Deduplicate by message ID
          const seen = new Set<string>();
          allMessages = allMessages.filter(msg => {
            if (seen.has(msg.id)) return false;
            seen.add(msg.id);
            return true;
          });
        } else {
          const messages = await nylas.getMessages(grant.grantId, folder || "inbox", grant.provider);
          allMessages = messages.map(m => ({ ...m, folder: folder || "inbox" }));
        }
        
        const emails = allMessages.map((msg, index) => ({
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
          folder: msg.folder || folder || "inbox",
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

  // Get unread counts per folder
  app.get("/api/emails/unread-counts", requireAuth, async (req, res) => {
    try {
      const grant = await storage.getNylasGrant(req.session.userId!);
      
      const counts: Record<string, number> = {
        inbox: 0,
        sent: 0,
        archived: 0,
        trash: 0,
        drafts: 0,
        junk: 0
      };
      
      if (grant) {
        // Fetch from Nylas for all folders that can have unread messages
        const folders = ["inbox", "junk", "trash"] as const;
        
        await Promise.all(folders.map(async (folder) => {
          try {
            const messages = await nylas.getMessages(grant.grantId, folder, grant.provider);
            counts[folder] = messages.filter((m: any) => !m.isRead && m.unread !== false).length;
          } catch (err) {
            // Silently ignore folder fetch errors (folder may not exist)
            console.log(`Could not fetch ${folder} for unread count`);
          }
        }));
        
        // Note: sent/drafts/archived don't have "unread" concept for user's own messages
      } else {
        // Fallback to local storage
        const allEmails = await storage.getEmails();
        for (const email of allEmails) {
          const folder = email.folder || "inbox";
          if (!email.isRead && counts[folder] !== undefined) {
            counts[folder]++;
          }
        }
      }
      
      res.json(counts);
    } catch (error) {
      console.error("Error fetching unread counts:", error);
      res.status(500).json({ error: "Failed to fetch unread counts" });
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
        nylas.invalidateMessagesCache(grant.grantId);
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
        nylas.invalidateMessagesCache(grant.grantId);
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
        nylas.invalidateMessagesCache(grant.grantId);
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
        nylas.invalidateMessagesCache(grant.grantId);
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

  app.post("/api/emails/:id/detect-language", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const userPlan = user?.plan || "free";
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({
          error: "Pro plan required for language detection",
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }
      
      const id = req.params.id;
      const { subject, body } = req.body;

      if (!body) {
        return res.status(400).json({ error: "Email body is required" });
      }

      const sampleText = (subject ? subject + "\n\n" : "") + body.slice(0, 1000);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a language detection system. Analyze the text and return ONLY a JSON object with these fields:
- languageCode: ISO 639-1 two-letter code (e.g., "en", "es", "fr", "de", "zh", "ja", "ko", "ar", "ru", "pt")
- languageName: Full name in English (e.g., "English", "Spanish", "French")
- confidence: number between 0 and 1

If the text is primarily in English, return languageCode: "en".
Return ONLY valid JSON, no other text.`
          },
          {
            role: "user",
            content: sampleText
          }
        ],
        max_tokens: 100,
        temperature: 0,
      });

      const responseText = completion.choices[0]?.message?.content || '{"languageCode":"en","languageName":"English","confidence":0.5}';
      
      try {
        const parsed = JSON.parse(responseText.replace(/```json\n?|\n?```/g, '').trim());
        const languageCode = (parsed.languageCode || "en").toLowerCase().split('-')[0].split('_')[0];
        const isEnglish = languageCode === "en";
        res.json({
          languageCode,
          languageName: parsed.languageName || "English",
          confidence: parsed.confidence || 0.5,
          isEnglish
        });
      } catch {
        res.json({ languageCode: "en", languageName: "English", confidence: 0.5, isEnglish: true });
      }
    } catch (error) {
      console.error("Error detecting language:", error);
      res.status(500).json({ error: "Failed to detect language" });
    }
  });

  app.post("/api/emails/:id/translate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const userPlan = user?.plan || "free";
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({
          error: "Pro plan required for email translation",
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }
      
      const id = req.params.id;
      const { subject, body, sourceLanguage } = req.body;

      if (!body) {
        return res.status(400).json({ error: "Email body is required" });
      }

      const cacheKey = `${req.session.userId}-${id}-en`;
      cleanupTranslationCache();
      const cached = translationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json({
          translatedSubject: cached.translatedSubject,
          translatedBody: cached.translatedBody,
          detectedLanguage: cached.detectedLanguage,
          cached: true
        });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the email from ${sourceLanguage || "the source language"} to English.

Rules:
- Maintain the original formatting and structure
- Preserve HTML tags if present
- Keep proper nouns, names, and brand names in their original form
- Translate naturally, not word-for-word
- Return a JSON object with two fields: "subject" (translated subject) and "body" (translated body)
- Return ONLY valid JSON, no other text`
          },
          {
            role: "user",
            content: JSON.stringify({ subject: subject || "", body })
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(responseText.replace(/```json\n?|\n?```/g, '').trim());
        const result = {
          translatedSubject: parsed.subject || subject || "",
          translatedBody: parsed.body || body,
          detectedLanguage: sourceLanguage || "unknown"
        };
        
        translationCache.set(cacheKey, { ...result, timestamp: Date.now() });
        
        res.json({ ...result, cached: false });
      } catch {
        res.status(500).json({ error: "Failed to parse translation" });
      }
    } catch (error) {
      console.error("Error translating email:", error);
      res.status(500).json({ error: "Failed to translate email" });
    }
  });

  app.post("/api/send", requireAuth, async (req, res) => {
    try {
      const { to, cc, bcc, subject, body, replyToMessageId, delaySeconds = 5, immediate = false, scheduledFor } = req.body;
      
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
      
      // Check if user has Pro/Business plan for scheduled sends
      if (scheduledFor) {
        // Validate scheduledFor is a valid date
        const parsedDate = new Date(scheduledFor);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ error: "Invalid scheduled time format" });
        }
        
        const user = await storage.getUser(req.session.userId!);
        if (!user || (user.plan !== "pro" && user.plan !== "premium" && user.plan !== "business")) {
          return res.status(403).json({ error: "Schedule send is a Pro/Business feature" });
        }
      }

      // If immediate send is requested (e.g., from undo confirmation), send now
      if (immediate) {
        await nylas.sendMessage(grant.grantId, to, subject, body, replyToMessageId, cc, bcc);
        nylas.invalidateMessagesCache(grant.grantId);
        return res.json({ success: true, sent: true });
      }
      
      // Determine scheduled send time
      let scheduledSendAt: Date;
      let isScheduledSend = false;
      
      if (scheduledFor) {
        // Future scheduled send (Pro/Business feature)
        scheduledSendAt = new Date(scheduledFor);
        if (scheduledSendAt <= new Date()) {
          return res.status(400).json({ error: "Scheduled time must be in the future" });
        }
        isScheduledSend = true;
      } else {
        // Regular delayed send with undo window
        const delay = Math.min(Math.max(delaySeconds, 1), 30); // Clamp between 1-30 seconds
        scheduledSendAt = new Date(Date.now() + delay * 1000);
      }
      
      const pendingSend = await storage.createPendingSend({
        userId: req.session.userId!,
        grantId: grant.grantId,
        payload: { to, cc, bcc, subject, body, replyToMessageId },
        scheduledSendAt,
        delaySeconds: isScheduledSend ? 0 : Math.min(Math.max(delaySeconds, 1), 30),
        status: "pending",
      });
      
      res.json({ 
        success: true, 
        pendingSendId: pendingSend.id, 
        scheduledSendAt: pendingSend.scheduledSendAt,
        delaySeconds: isScheduledSend ? 0 : Math.min(Math.max(delaySeconds, 1), 30),
        isScheduledSend
      });
    } catch (error) {
      console.error("Error scheduling email:", error);
      res.status(500).json({ error: "Failed to schedule email" });
    }
  });

  // Get pending sends for current user (for restoring undo state on page reload)
  app.get("/api/pending-sends", requireAuth, async (req, res) => {
    try {
      const pending = await storage.getPendingSendsByUser(req.session.userId!);
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending sends:", error);
      res.status(500).json({ error: "Failed to fetch pending sends" });
    }
  });

  // Cancel a pending send (undo)
  app.post("/api/pending-sends/:id/cancel", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const cancelled = await storage.cancelPendingSend(req.session.userId!, id);
      if (!cancelled) {
        return res.status(404).json({ error: "Pending send not found or already sent" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error canceling pending send:", error);
      res.status(500).json({ error: "Failed to cancel pending send" });
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

  // AI draft generation - all plans can use, free plan has 5/day limit
  app.post("/api/drafts/generate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const userPlan = user?.plan || "free";
      
      // Check free plan daily limit
      const FREE_DAILY_LIMIT = 5;
      if (userPlan === "free") {
        const todayUsage = await storage.getAiUsageToday(req.session.userId!);
        if (todayUsage >= FREE_DAILY_LIMIT) {
          return res.status(403).json({
            error: "Daily AI draft limit reached",
            limitReached: true,
            used: todayUsage,
            limit: FREE_DAILY_LIMIT,
            remaining: 0,
            currentPlan: userPlan
          });
        }
      }
      
      const { emailId, tone = "professional", emailContent } = req.body;
      
      // Can provide either emailId to look up, or emailContent directly
      let emailData: { sender: string; senderEmail: string; subject: string; body: string; preview?: string } | null = null;
      
      if (emailContent) {
        // Direct email content provided (for multi-email responses)
        emailData = emailContent;
      } else if (emailId) {
        // Try to find email by numeric ID first
        const numericId = parseInt(emailId);
        if (!isNaN(numericId) && numericId > 0) {
          const email = await storage.getEmail(numericId);
          if (email) {
            emailData = email;
          }
        }
        
        // If not found and looks like a Nylas ID (longer string), fetch from Nylas
        if (!emailData && emailId.length > 10) {
          const grant = await storage.getNylasGrant(req.session.userId!);
          if (grant) {
            try {
              const message = await nylas.getMessage(grant.grantId, emailId);
              if (message) {
                emailData = {
                  sender: message.from,
                  senderEmail: message.fromEmail,
                  subject: message.subject,
                  body: message.body,
                  preview: "",
                };
              }
            } catch (nylasError) {
              console.error("Error fetching email from Nylas:", nylasError);
            }
          }
        }
      }
      
      if (!emailData) {
        return res.status(400).json({ error: "Email ID or content is required" });
      }

      // Use preview or body - some emails only have preview
      const emailBody = emailData.body || emailData.preview || "";

      const toneDescriptions: Record<string, string> = {
        professional: "professional, courteous, and business-appropriate",
        friendly: "warm, friendly, and approachable while remaining respectful",
        casual: "relaxed, conversational, and informal",
        formal: "highly formal, respectful, and traditional business communication",
        concise: "brief, direct, and to-the-point with minimal pleasantries",
      };

      const toneDesc = toneDescriptions[tone] || toneDescriptions.professional;

      const prompt = `You are an email assistant. Generate a reply to the following email. The reply should be ${toneDesc}.

From: ${emailData.sender} <${emailData.senderEmail}>
Subject: ${emailData.subject}

${emailBody}

Please write a reply that:
1. Acknowledges the sender's message appropriately
2. Addresses any questions or action items mentioned
3. Uses a ${tone} tone throughout
4. Is concise (2-4 paragraphs)
5. Do NOT include greeting like "Dear" or sign-off - just the body content

Reply:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an email assistant that writes clear, concise email replies with a ${tone} tone. Write only the email body without greetings or sign-offs.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 1024,
      });

      const generatedContent = response.choices[0]?.message?.content;
      
      if (!generatedContent || generatedContent.trim().length === 0) {
        return res.status(422).json({ 
          error: "Unable to generate AI response",
          reason: "The email format or content could not be processed. This may be due to unusual formatting, empty content, or unsupported characters.",
          canRetry: true
        });
      }

      // If emailId was numeric, save the draft
      const numericEmailId = parseInt(emailId);
      let draft = null;
      if (!isNaN(numericEmailId)) {
        const existingDraft = await storage.getDraftByEmailId(numericEmailId);
        if (existingDraft) {
          await storage.deleteDraft(existingDraft.id);
        }
        
        draft = await storage.createDraft({
          emailId: numericEmailId,
          content: generatedContent,
          isAiGenerated: true,
          status: "draft",
        });
      } else {
        // For Nylas IDs, just return the content without saving
        draft = {
          id: 0,
          emailId: 0,
          content: generatedContent,
          isAiGenerated: true,
          status: "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Increment usage for free plan users
      if (userPlan === "free") {
        await storage.incrementAiUsage(req.session.userId!);
      }

      res.json(draft);
    } catch (error: any) {
      console.error("Error generating draft:", error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = "Unable to generate AI response";
      let reason = "An unexpected error occurred while processing your request.";
      
      if (error?.code === "content_filter") {
        reason = "The email content was flagged by content filters and cannot be processed.";
      } else if (error?.code === "context_length_exceeded") {
        reason = "The email is too long to process. Try with a shorter email.";
      } else if (error?.message?.includes("rate limit")) {
        reason = "Too many requests. Please wait a moment and try again.";
      } else if (error?.message?.includes("timeout")) {
        reason = "The request timed out. Please try again.";
      }
      
      res.status(500).json({ error: errorMessage, reason, canRetry: true });
    }
  });

  // AI Polish - improves existing text
  app.post("/api/ai/polish", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const userPlan = user?.plan || "free";
      
      const { text, mode = "basic" } = req.body;
      
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: "Text is required" });
      }

      // Advanced polish modes are only for Pro+ users (basic and casual free for all)
      const advancedModes = ["formal", "concise", "persuasive", "empathetic", "executive"];
      if (advancedModes.includes(mode) && userPlan === "free") {
        return res.status(403).json({ 
          error: "Advanced polish modes require Pro or Business plan",
          currentPlan: userPlan,
          requiredPlan: "pro"
        });
      }

      const modeInstructions: Record<string, string> = {
        basic: "Fix grammar, spelling, and punctuation. Improve clarity while keeping the original tone and meaning.",
        formal: "Make the text more formal and professional. Use proper business language.",
        casual: "Make the text more casual and friendly while remaining professional.",
        concise: "Shorten the text while preserving key information. Remove redundancy.",
        persuasive: "Make the text more compelling and persuasive.",
        empathetic: "Add more empathetic and understanding language.",
        executive: "Rewrite for an executive audience - brief, impactful, and action-oriented.",
      };

      const instruction = modeInstructions[mode] || modeInstructions.basic;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an email writing assistant. Your task: ${instruction}. Return ONLY the improved text without any explanations or quotes around it.`
          },
          {
            role: "user",
            content: text
          }
        ],
        max_completion_tokens: 1024,
      });

      const polishedText = response.choices[0]?.message?.content;
      
      if (!polishedText || polishedText.trim().length === 0) {
        return res.status(422).json({ error: "Unable to polish text" });
      }

      res.json({ polished: polishedText.trim() });
    } catch (error) {
      console.error("Error polishing text:", error);
      res.status(500).json({ error: "Failed to polish text" });
    }
  });

  // AI Refine - modify existing response based on instructions
  app.post("/api/ai/refine", requireAuth, async (req, res) => {
    try {
      const { text, instruction, originalEmail } = req.body;
      
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      if (!instruction || instruction.trim().length === 0) {
        return res.status(400).json({ error: "Instruction is required" });
      }

      let contextPrompt = "";
      if (originalEmail) {
        contextPrompt = `

Original email being responded to:
From: ${originalEmail.sender} <${originalEmail.senderEmail}>
Subject: ${originalEmail.subject}
${originalEmail.body || originalEmail.preview || ""}
`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an email writing assistant. Modify the given email response based on the user's instruction. Return ONLY the modified text without explanations.${contextPrompt}`
          },
          {
            role: "user",
            content: `Current response:
${text}

Instruction: ${instruction}

Please modify the response according to the instruction.`
          }
        ],
        max_completion_tokens: 1024,
      });

      const refinedText = response.choices[0]?.message?.content;
      
      if (!refinedText || refinedText.trim().length === 0) {
        return res.status(422).json({ error: "Unable to refine text" });
      }

      res.json({ refined: refinedText.trim() });
    } catch (error) {
      console.error("Error refining text:", error);
      res.status(500).json({ error: "Failed to refine text" });
    }
  });

  // Quick AI draft generation for compose dialog (returns subject + body)
  // All plans can use AI drafts - free plan has 5/day limit
  app.post("/api/drafts/quick-generate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const userPlan = user?.plan || "free";
      
      // Check free plan daily limit
      const FREE_DAILY_LIMIT = 5;
      if (userPlan === "free") {
        const todayUsage = await storage.getAiUsageToday(req.session.userId!);
        if (todayUsage >= FREE_DAILY_LIMIT) {
          return res.status(403).json({
            error: "Daily AI draft limit reached",
            limitReached: true,
            used: todayUsage,
            limit: FREE_DAILY_LIMIT,
            remaining: 0,
            currentPlan: userPlan
          });
        }
      }
      
      const { mode, originalEmail, instructions, tone: requestedTone, existingBody } = req.body;
      
      // Use requested tone or fall back to user's AI preferences
      const aiPrefs = user?.aiPreferences as { replyTone?: string } | undefined;
      const tone = requestedTone || aiPrefs?.replyTone || "professional";
      
      const toneDescriptions: Record<string, string> = {
        professional: "professional, courteous, and business-appropriate",
        friendly: "warm, friendly, and approachable while remaining respectful",
        concise: "brief, direct, and to-the-point with minimal pleasantries",
        casual: "casual, relaxed, and conversational",
        formal: "formal, respectful, and traditional business style",
        custom: "professional and thoughtful",
      };
      const toneDesc = toneDescriptions[tone] || toneDescriptions.professional;

      let prompt: string;
      let systemMessage: string;

      if (mode === "reply" || mode === "replyAll") {
        systemMessage = `You are an email assistant that writes clear, concise email replies. Always respond in JSON format with "subject" and "body" fields.`;
        
        // If there's existing body content, user wants to refine/tweak it
        const existingContent = existingBody?.trim() || "";
        
        if (existingContent) {
          prompt = `Improve and refine this draft reply with a ${toneDesc} tone.

Original email being replied to:
From: ${originalEmail?.from || "Unknown"} <${originalEmail?.fromEmail || ""}>
Subject: ${originalEmail?.subject || "No subject"}

${originalEmail?.body?.replace(/<[^>]*>/g, '').substring(0, 1500) || ""}

Current draft reply:
${existingContent}

${instructions ? `User instructions for changes: ${instructions}` : "Improve the clarity, tone, and professionalism of this draft."}

Provide an improved version that:
1. Maintains the user's intended message
2. Uses a ${tone} tone throughout
3. Is clear and well-structured

Respond with JSON only: {"subject": "Re: ${originalEmail?.subject || ''}", "body": "Your improved reply text here..."}`;
        } else {
          prompt = `Generate a reply to this email with a ${toneDesc} tone.

Original email:
From: ${originalEmail?.from || "Unknown"} <${originalEmail?.fromEmail || ""}>
Subject: ${originalEmail?.subject || "No subject"}

${originalEmail?.body?.replace(/<[^>]*>/g, '').substring(0, 2000) || ""}

${instructions ? `Additional instructions: ${instructions}` : ""}

Write a reply that:
1. Acknowledges the sender's message
2. Addresses any questions or action items
3. Uses a ${tone} tone throughout
4. Is concise (2-3 paragraphs max)

Respond with JSON only: {"subject": "Re: ${originalEmail?.subject || ''}", "body": "Your reply text here..."}`;
        }
      } else if (mode === "forward") {
        systemMessage = `You are an email assistant. Always respond in JSON format with "subject" and "body" fields.`;
        
        const existingContent = existingBody?.trim() || "";
        
        if (existingContent) {
          prompt = `Improve this forwarding message with a ${toneDesc} tone.

Original email being forwarded:
From: ${originalEmail?.from || "Unknown"}
Subject: ${originalEmail?.subject || "No subject"}

Current forwarding message:
${existingContent}

${instructions ? `User instructions for changes: ${instructions}` : "Improve the clarity and tone of this forwarding message."}

Respond with JSON only: {"subject": "Fwd: ${originalEmail?.subject || ''}", "body": "Your improved forwarding message here..."}`;
        } else {
          prompt = `Generate a brief forwarding message for this email with a ${toneDesc} tone.

Original email being forwarded:
From: ${originalEmail?.from || "Unknown"}
Subject: ${originalEmail?.subject || "No subject"}

${instructions ? `Additional instructions: ${instructions}` : "Write a brief message to introduce why you're forwarding this email. Keep it to 1-2 sentences."}

Respond with JSON only: {"subject": "Fwd: ${originalEmail?.subject || ''}", "body": "Your forwarding message here..."}`;
        }
      } else {
        // New email
        systemMessage = `You are an email assistant that helps compose professional emails. Always respond in JSON format with "subject" and "body" fields.`;
        
        const existingContent = existingBody?.trim() || "";
        
        if (existingContent) {
          prompt = `Improve and refine this email draft with a ${toneDesc} tone.

Current draft:
${existingContent}

${instructions ? `User instructions for changes: ${instructions}` : "Improve the clarity, tone, and professionalism of this draft."}

Provide an improved version that:
1. Maintains the user's intended message
2. Uses a ${tone} tone throughout
3. Is clear and well-structured

Respond with JSON only: {"subject": "Appropriate subject for this email", "body": "Your improved email text here..."}`;
        } else if (instructions) {
          prompt = `Write a new email with a ${toneDesc} tone.

Instructions: ${instructions}

Write a clear, well-structured email that:
1. Has a clear subject line based on the instructions
2. Uses a ${tone} tone throughout
3. Is appropriately detailed

Respond with JSON only: {"subject": "Your subject here", "body": "Your email body here..."}`;
        } else {
          prompt = `Generate a new email with a ${toneDesc} tone. Since no specific context is provided, create a professional template email that the user can customize.

Write a brief, customizable email template that:
1. Has a clear, professional subject line
2. Uses a ${tone} tone
3. Is concise and easy to customize

Respond with JSON only: {"subject": "Your subject here", "body": "Your email body here..."}`;
        }
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 512,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content || content.trim().length === 0) {
        return res.status(422).json({ 
          error: "Unable to generate AI response",
          reason: "The email format or content could not be processed. This may be due to unusual formatting or unsupported content.",
          canRetry: true
        });
      }
      
      // Increment usage for free plan users
      if (userPlan === "free") {
        await storage.incrementAiUsage(req.session.userId!);
      }
      
      try {
        const parsed = JSON.parse(content);
        
        // Get remaining count for free users
        const todayUsage = userPlan === "free" ? await storage.getAiUsageToday(req.session.userId!) : 0;
        const remaining = userPlan === "free" ? Math.max(0, 5 - todayUsage) : null;
        
        res.json({
          subject: parsed.subject || "",
          body: parsed.body || "",
          usage: userPlan === "free" ? { used: todayUsage, limit: 5, remaining } : null,
        });
      } catch {
        res.json({ subject: "", body: content });
      }
    } catch (error: any) {
      console.error("Error generating quick draft:", error);
      
      let errorMessage = "Unable to generate AI response";
      let reason = "An unexpected error occurred while processing your request.";
      
      if (error?.code === "content_filter") {
        reason = "The email content was flagged by content filters and cannot be processed.";
      } else if (error?.code === "context_length_exceeded") {
        reason = "The email is too long to process. Try with a shorter email.";
      } else if (error?.message?.includes("rate limit")) {
        reason = "Too many requests. Please wait a moment and try again.";
      } else if (error?.message?.includes("timeout")) {
        reason = "The request timed out. Please try again.";
      }
      
      res.status(500).json({ error: errorMessage, reason, canRetry: true });
    }
  });

  // Get AI usage status for current user
  app.get("/api/ai-usage", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const userPlan = user?.plan || "free";
      
      if (userPlan !== "free") {
        return res.json({ unlimited: true, plan: userPlan });
      }
      
      const todayUsage = await storage.getAiUsageToday(req.session.userId!);
      const limit = 5;
      const remaining = Math.max(0, limit - todayUsage);
      
      res.json({
        unlimited: false,
        plan: userPlan,
        used: todayUsage,
        limit,
        remaining,
      });
    } catch (error) {
      console.error("Error getting AI usage:", error);
      res.status(500).json({ error: "Failed to get AI usage" });
    }
  });

  // AI Polish endpoint - improve existing text
  // Basic polish is free for all, advanced options (longer, shorter, concise) are Pro+
  app.post("/api/drafts/polish", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const userPlan = user?.plan || "free";
      const isPro = userPlan === "pro" || userPlan === "premium" || userPlan === "business";
      
      const { content, polishType = "polish", subject } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }
      
      // Check if user has access to advanced polish options
      if ((polishType === "longer" || polishType === "shorter" || polishType === "concise") && !isPro) {
        return res.status(403).json({
          error: "Pro plan required for advanced polish options",
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }
      
      let prompt: string;
      let systemMessage: string;
      
      switch (polishType) {
        case "longer":
          systemMessage = "You are an expert editor. Expand the given text while maintaining its core message and tone.";
          prompt = `Expand this email text to be longer and more detailed. Add more context, examples, or explanations while keeping the same professional tone. Do not add unnecessary fluff - make the additions meaningful.

Original text:
${content}

${subject ? `Context - Email subject: ${subject}` : ""}

Return only the expanded text, nothing else.`;
          break;
          
        case "shorter":
          systemMessage = "You are an expert editor. Shorten the given text while preserving key information.";
          prompt = `Make this email text shorter while keeping the essential message. Remove redundancy and unnecessary words.

Original text:
${content}

${subject ? `Context - Email subject: ${subject}` : ""}

Return only the shortened text, nothing else.`;
          break;
          
        case "concise":
          systemMessage = "You are an expert editor. Make the text more concise and direct.";
          prompt = `Rewrite this email text to be more concise and direct. Get straight to the point while maintaining professionalism.

Original text:
${content}

${subject ? `Context - Email subject: ${subject}` : ""}

Return only the concise version, nothing else.`;
          break;
          
        default: // "polish" - basic improvement
          systemMessage = "You are an expert editor. Improve the given text for clarity, grammar, and professionalism.";
          prompt = `Improve this email text for better clarity, grammar, and professional tone. Fix any errors and enhance readability while keeping the original meaning.

Original text:
${content}

${subject ? `Context - Email subject: ${subject}` : ""}

Return only the improved text, nothing else.`;
      }
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 1024,
      });
      
      const polishedContent = response.choices[0]?.message?.content || content;
      
      res.json({ content: polishedContent.trim() });
    } catch (error) {
      console.error("Error polishing content:", error);
      res.status(500).json({ error: "Failed to polish content" });
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

  app.get("/api/drafts", requireAuth, async (req, res) => {
    try {
      const drafts = await storage.getUserDrafts(req.session.userId!);
      res.json(drafts);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      res.status(500).json({ error: "Failed to fetch drafts" });
    }
  });

  app.post("/api/drafts", requireAuth, async (req, res) => {
    try {
      const { recipientEmail, recipientName, subject, content, emailId, isAiGenerated } = req.body;
      
      if (!recipientEmail || !subject || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const draft = await storage.createDraft({
        userId: req.session.userId!,
        emailId: emailId || null,
        recipientEmail,
        recipientName: recipientName || null,
        subject,
        content,
        isAiGenerated: isAiGenerated || false,
        status: "draft",
      });
      
      res.json(draft);
    } catch (error) {
      console.error("Error saving draft:", error);
      res.status(500).json({ error: "Failed to save draft" });
    }
  });

  app.put("/api/drafts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { subject, content } = req.body;
      
      const draft = await storage.getDraft(id);
      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }
      
      const updated = await storage.updateDraft(id, {
        subject: subject !== undefined ? subject : draft.subject,
        content: content !== undefined ? content : draft.content,
        updatedAt: new Date(),
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating draft:", error);
      res.status(500).json({ error: "Failed to update draft" });
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
      
      // Try to get emails from Nylas first, fall back to storage
      const grant = await storage.getNylasGrant(req.session.userId!);
      let unreadCount = 0;
      
      if (grant) {
        try {
          const messages = await nylas.getMessages(grant.grantId, targetFolder, grant.provider);
          unreadCount = messages.filter((m: any) => !m.isRead && m.unread !== false).length;
        } catch (err) {
          console.log(`Could not fetch ${targetFolder} for response time`);
        }
      } else {
        const emails = await storage.getEmails(targetFolder);
        unreadCount = emails.filter(e => !e.isRead).length;
      }
      
      if (unreadCount === 0) {
        return res.json({ 
          estimatedMinutes: 0, 
          unreadCount: 0,
          message: "All caught up!" 
        });
      }

      // Fast calculation: ~3 minutes per email (reading + thinking + replying)
      const estimatedMinutes = Math.max(1, Math.round(unreadCount * 3));

      res.json({ 
        estimatedMinutes,
        unreadCount
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
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : undefined;
      const messages = await storage.getAssistantMessages(req.session.userId!, sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching assistant messages:", error);
      res.status(500).json({ error: "Failed to fetch assistant messages" });
    }
  });

  // Get chat sessions (history)
  app.get("/api/assistant/sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getChatSessions(req.session.userId!);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  // Create new chat session (restart chat)
  app.post("/api/assistant/sessions", requireAuth, async (req, res) => {
    try {
      const { title } = req.body;
      const session = await storage.createChatSession(req.session.userId!, title);
      res.json(session);
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Switch to a different chat session
  app.post("/api/assistant/sessions/:sessionId/activate", requireAuth, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      await storage.setActiveSession(req.session.userId!, sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error switching chat session:", error);
      res.status(500).json({ error: "Failed to switch chat session" });
    }
  });

  // Delete a chat session
  app.delete("/api/assistant/sessions/:sessionId", requireAuth, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const deleted = await storage.deleteSession(req.session.userId!, sessionId);
      if (!deleted) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chat session:", error);
      res.status(500).json({ error: "Failed to delete chat session" });
    }
  });

  // Rename a chat session
  app.patch("/api/assistant/sessions/:sessionId", requireAuth, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { title } = req.body;
      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Title is required" });
      }
      const updated = await storage.updateSessionTitle(req.session.userId!, sessionId, title);
      if (!updated) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error renaming chat session:", error);
      res.status(500).json({ error: "Failed to rename chat session" });
    }
  });

  // Chat with assistant - Full email capabilities (requires Pro+)
  app.post("/api/assistant/chat", requireAuth, async (req, res) => {
    try {
      const { message, voiceId = "vince" } = req.body;
      const userId = req.session.userId!;

      // Plan gating: requires Pro or Premium
      const userPlan = await getUserPlan(userId);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({ 
          error: "Plan upgrade required", 
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Save user message
      await storage.addAssistantMessage(userId, "user", message);

      // Gather context for the assistant
      const user = await storage.getUser(userId);
      const grant = await storage.getNylasGrant(userId);
      const permissions = await storage.getAssistantPermissions(userId);
      const defaultPerms = { canReadEmails: true, canSendEmails: false, canArchive: false, canTrash: false, canSearch: true, requireConfirmation: true };
      const perms = permissions?.permissions || defaultPerms;
      
      // Fetch real emails from Nylas if connected
      let nylasMessages: any[] = [];
      let emailContext = "";
      
      if (grant && perms.canReadEmails) {
        try {
          nylasMessages = await nylas.getMessages(grant.grantId);
          // Log the read action
          await storage.createAuditLog(userId, "read", "executed", undefined, `Fetched ${nylasMessages.length} emails for context`);
          
          // Build detailed email context
          const recentEmails = nylasMessages.slice(0, 15);
          emailContext = recentEmails.map((m: any, i: number) => {
            const from = m.from?.[0]?.email || "unknown";
            const name = m.from?.[0]?.name || from;
            const subject = m.subject || "(no subject)";
            const date = m.date ? new Date(m.date * 1000).toLocaleString() : "unknown date";
            const unread = m.unread ? "[UNREAD]" : "";
            const starred = m.starred ? "[STARRED]" : "";
            const snippet = m.snippet?.substring(0, 150) || "";
            return `${i + 1}. ${unread}${starred} FROM: ${name} <${from}>\n   SUBJECT: ${subject}\n   DATE: ${date}\n   PREVIEW: ${snippet}...`;
          }).join("\n\n");
        } catch (e) {
          console.error("Error fetching Nylas messages:", e);
          emailContext = "Unable to fetch emails at this time.";
        }
      }
      
      const assistantName = "Vince";

      // Build stats from Nylas data
      const unreadCount = nylasMessages.filter((m: any) => m.unread).length;
      const starredCount = nylasMessages.filter((m: any) => m.starred).length;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEmails = nylasMessages.filter((m: any) => m.date && new Date(m.date * 1000) >= todayStart);

      // Get recent conversation history for context
      const recentMessages = await storage.getAssistantMessages(userId);
      const conversationHistory = recentMessages.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

      const systemPrompt = `You are ${assistantName}, a powerful and friendly AI email assistant for MailFlow. You have FULL ACCESS to the user's email inbox and can perform any email action they request.

PERSONALITY:
- Warm, capable, and proactive - like having a trusted executive assistant
- Confident in your abilities to help manage their inbox
- Natural and conversational, not robotic
- Encouraging and supportive about email management

YOUR CAPABILITIES (what you CAN do):
${perms.canReadEmails ? "- READ emails: You can see and read all their emails in detail" : "- READ: Disabled by user"}
${perms.canSendEmails ? "- SEND emails: You can compose and send new emails (with confirmation)" : "- SEND: Disabled - user must enable in settings"}
${perms.canArchive ? "- ARCHIVE emails: You can archive emails (with confirmation)" : "- ARCHIVE: Disabled - user must enable in settings"}  
${perms.canTrash ? "- TRASH emails: You can delete emails (with confirmation)" : "- TRASH: Disabled - user must enable in settings"}
${perms.canSearch ? "- SEARCH emails: You can search and find specific emails" : "- SEARCH: Disabled by user"}

ACTION COMMANDS - When the user asks you to perform an action, respond with a special format:
- To send/reply/forward: Include [ACTION:SEND] and the draft content
- To archive: Include [ACTION:ARCHIVE:messageId]
- To trash: Include [ACTION:TRASH:messageId]
- The system will create a pending action that requires user confirmation

SECURITY:
- All actions require user confirmation before execution
- You never share email content with anyone except the user
- All your actions are logged for security

USER ACCOUNT:
- User email: ${user?.email || "Unknown"}
- Connected email: ${grant?.email || "Not connected"}
- Email provider: ${grant?.provider || "None"}
- Plan: ${user?.plan || "free"}

INBOX STATUS:
- Total emails visible: ${nylasMessages.length}
- Unread emails: ${unreadCount}
- Starred emails: ${starredCount}
- Emails today: ${todayEmails.length}

${emailContext ? `CURRENT INBOX (most recent 15 emails):
${emailContext}` : "No emails loaded - user may need to connect their email account."}

RESPONSE STYLE:
- Be specific when discussing emails - reference senders, subjects, and content
- When asked about an email, quote relevant parts
- Proactively offer to help with actions: "Would you like me to reply to this?" or "I can archive that for you"
- For action requests, explain what you'll do and ask for confirmation
- Keep responses conversational but informative`;

      // Add a brief thinking delay for more natural conversation feel (800-1500ms)
      const thinkingDelay = 800 + Math.random() * 700;
      await new Promise(resolve => setTimeout(resolve, thinkingDelay));

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message }
        ],
        max_tokens: 800,
        temperature: 0.8,
      });

      let responseContent = completion.choices[0]?.message?.content || "I apologize, I couldn't process that request.";
      
      // Check for action commands in the response and create pending actions
      const actionMatch = responseContent.match(/\[ACTION:(SEND|ARCHIVE|TRASH)(?::([^\]]+))?\]/);
      if (actionMatch) {
        const actionType = actionMatch[1].toLowerCase();
        const messageId = actionMatch[2];
        
        // Create pending action for user confirmation
        if (actionType === "send" && perms.canSendEmails) {
          // Extract draft content from response
          const draftMatch = responseContent.match(/(?:draft|email):\s*([\s\S]*?)(?:\[ACTION|$)/i);
          const draftBody = draftMatch?.[1]?.trim() || "";
          
          await storage.createAssistantAction({
            userId,
            actionType: "send",
            status: "pending",
            metadata: { body: draftBody }
          });
          await storage.createAuditLog(userId, "send", "initiated", undefined, "Draft created for user confirmation");
        } else if (actionType === "archive" && messageId && perms.canArchive) {
          await storage.createAssistantAction({
            userId,
            actionType: "archive",
            status: "pending",
            metadata: { messageId }
          });
          await storage.createAuditLog(userId, "archive", "initiated", messageId, "Archive action pending confirmation");
        } else if (actionType === "trash" && messageId && perms.canTrash) {
          await storage.createAssistantAction({
            userId,
            actionType: "trash",
            status: "pending",
            metadata: { messageId }
          });
          await storage.createAuditLog(userId, "trash", "initiated", messageId, "Trash action pending confirmation");
        }
        
        // Remove action tags from displayed response
        responseContent = responseContent.replace(/\[ACTION:[^\]]+\]/g, "").trim();
      }
      
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

  // Voice transcription endpoint using OpenAI Whisper (requires Premium)
  app.post("/api/assistant/transcribe", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Plan gating: voice features require Premium
      const userPlan = await getUserPlan(userId);
      if (!hasPlan(userPlan, "premium")) {
        return res.status(403).json({ 
          error: "Plan upgrade required", 
          requiredPlan: "premium",
          currentPlan: userPlan
        });
      }
      
      const { audio, mimeType } = req.body;
      
      if (!audio || typeof audio !== "string") {
        return res.status(400).json({ error: "Audio data required" });
      }

      // Validate base64 format and size (max 25MB for Whisper)
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(audio)) {
        return res.status(400).json({ error: "Invalid audio format" });
      }
      
      const maxSizeBytes = 25 * 1024 * 1024; // 25MB limit
      const estimatedSize = (audio.length * 3) / 4;
      if (estimatedSize > maxSizeBytes) {
        return res.status(400).json({ error: "Audio file too large" });
      }

      // Validate mime type
      const allowedMimeTypes = ["audio/webm", "audio/mp3", "audio/wav", "audio/m4a", "audio/ogg"];
      const safeMimeType = allowedMimeTypes.includes(mimeType) ? mimeType : "audio/webm";

      // Convert base64 to buffer and create a File object for Whisper
      const audioBuffer = Buffer.from(audio, "base64");
      const audioFile = new File([audioBuffer], "audio.webm", { 
        type: safeMimeType 
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "gpt-4o-mini-transcribe",
        response_format: "json",
      });

      const transcript = (transcription as any).text?.trim() || "";
      
      res.json({ transcript });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // ============ AI MAILBOX ACTION ENDPOINTS ============

  // Get AI context (user profile + preferences + allowed actions) (requires Pro+)
  app.get("/api/ai/context", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Plan gating: requires Pro or Premium
      const userPlan = await getUserPlan(userId);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({ 
          error: "Plan upgrade required", 
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }
      
      const user = await storage.getUser(userId);
      const grant = await storage.getNylasGrant(userId);
      const styleProfile = await storage.getUserStyleProfile(userId);
      const pendingActions = await storage.getPendingAssistantActions(userId);
      
      const defaultProfile = {
        tone: "professional",
        length: "medium",
        greetingStyle: "hi",
        signOff: "Best regards",
        formattingPreference: "paragraphs",
        allowedActions: "draft-only",
        customInstructions: undefined
      };

      res.json({
        user: {
          id: user?.id,
          email: user?.email,
          plan: user?.plan,
          connectedEmail: grant?.email,
          provider: grant?.provider
        },
        styleProfile: styleProfile?.profile || defaultProfile,
        pendingActions: pendingActions.map(a => ({
          id: a.id,
          actionType: a.actionType,
          status: a.status,
          metadata: a.metadata,
          createdAt: a.createdAt
        })),
        capabilities: {
          canDraft: true,
          canSend: !!grant,
          canArchive: !!grant,
          canTrash: !!grant,
          canSearch: !!grant
        }
      });
    } catch (error) {
      console.error("Error fetching AI context:", error);
      res.status(500).json({ error: "Failed to fetch AI context" });
    }
  });

  // Update user style profile (requires Pro+)
  app.post("/api/ai/style-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Plan gating: requires Pro or Premium
      const userPlan = await getUserPlan(userId);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({ 
          error: "Plan upgrade required", 
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }
      
      const { tone, length, greetingStyle, signOff, formattingPreference, allowedActions, customInstructions } = req.body;
      
      const profile = await storage.upsertUserStyleProfile(userId, {
        tone,
        length,
        greetingStyle,
        signOff,
        formattingPreference,
        allowedActions,
        customInstructions
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating style profile:", error);
      res.status(500).json({ error: "Failed to update style profile" });
    }
  });

  // Get assistant permissions
  app.get("/api/ai/permissions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const perms = await storage.getAssistantPermissions(userId);
      const defaultPerms = { 
        canReadEmails: true, 
        canSendEmails: false, 
        canArchive: false, 
        canTrash: false, 
        canSearch: true, 
        requireConfirmation: true,
        maxEmailsPerDay: 10
      };
      res.json(perms?.permissions || defaultPerms);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Update assistant permissions
  app.post("/api/ai/permissions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Validate request body with strict schema
      const parseResult = assistantPermissionsUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid permissions data",
          details: parseResult.error.errors.map(e => e.message)
        });
      }
      
      const validatedData = parseResult.data;
      
      // Reject empty updates
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ error: "No permission updates provided" });
      }
      
      // Get current permissions to merge with updates
      const currentPerms = await storage.getAssistantPermissions(userId);
      const defaultPerms = {
        canReadEmails: true,
        canSendEmails: false,
        canArchive: false,
        canTrash: false,
        canSearch: true,
        requireConfirmation: true,
        maxEmailsPerDay: 10
      };
      
      const currentPermissions = currentPerms?.permissions || defaultPerms;
      
      // SECURITY: Enforce that requireConfirmation cannot be disabled if destructive permissions are enabled
      const sensitivePerms = ['canSendEmails', 'canArchive', 'canTrash'];
      const hasDestructiveEnabled = sensitivePerms.some(p => 
        (validatedData as any)[p] === true || 
        (currentPermissions as any)[p] === true && (validatedData as any)[p] !== false
      );
      
      if (validatedData.requireConfirmation === false && hasDestructiveEnabled) {
        return res.status(403).json({ 
          error: "Security policy requires confirmation for accounts with send, archive, or trash permissions enabled",
          code: "CONFIRMATION_REQUIRED"
        });
      }
      
      // SECURITY: When enabling destructive permissions, ensure confirmation stays on
      const enablingDestructive = sensitivePerms.some(p => (validatedData as any)[p] === true);
      const newPermissions = { ...currentPermissions, ...validatedData };
      
      if (enablingDestructive && !newPermissions.requireConfirmation) {
        newPermissions.requireConfirmation = true;
      }
      
      const result = await storage.upsertAssistantPermissions(userId, newPermissions);
      
      // Log permission changes with before/after values for security audit
      const changes = Object.entries(validatedData)
        .map(([key, value]) => `${key}: ${(currentPermissions as any)[key]} → ${value}`)
        .join(", ");
      await storage.createAuditLog(userId, "permissions_update", "executed", undefined, 
        `Permission changes: ${changes}`);
      
      res.json(result.permissions);
    } catch (error) {
      console.error("Error updating permissions:", error);
      res.status(500).json({ error: "Failed to update permissions" });
    }
  });

  // Get audit log history
  app.get("/api/ai/audit-log", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getRecentAuditLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit log:", error);
      res.status(500).json({ error: "Failed to fetch audit log" });
    }
  });

  // Generate AI draft (compose/reply/reply-all/forward) (requires Pro+)
  app.post("/api/ai/draft", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Plan gating: requires Pro or Premium
      const userPlan = await getUserPlan(userId);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({ 
          error: "Plan upgrade required", 
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }
      
      const { actionType, messageId, instructions, to, cc, bcc, subject } = req.body;
      
      if (!actionType || !["compose", "reply", "reply-all", "forward"].includes(actionType)) {
        return res.status(400).json({ error: "Valid actionType required: compose, reply, reply-all, forward" });
      }

      const user = await storage.getUser(userId);
      const grant = await storage.getNylasGrant(userId);
      const styleProfile = await storage.getUserStyleProfile(userId);
      
      const profile = styleProfile?.profile || {
        tone: "professional",
        length: "medium",
        greetingStyle: "hi",
        signOff: "Best regards",
        formattingPreference: "paragraphs"
      };

      let originalMessage: any = null;
      let originalBody = "";
      let recipientEmail = "";
      let recipientName = "";
      let originalSubject = "";

      // For reply/forward, fetch the original message
      if (messageId && actionType !== "compose") {
        if (grant) {
          try {
            const messages = await nylas.getMessages(grant.grantId);
            originalMessage = messages.find((m: any) => m.id === messageId);
            if (originalMessage) {
              originalBody = typeof originalMessage.body === "string" ? originalMessage.body : "";
              recipientEmail = originalMessage.from?.[0]?.email || "";
              recipientName = originalMessage.from?.[0]?.name || "";
              originalSubject = originalMessage.subject || "";
            }
          } catch (e) {
            console.error("Error fetching original message:", e);
          }
        }
      }

      // Build the draft prompt
      const profileWithCustom = profile as typeof profile & { customInstructions?: string };
      const toneGuide = {
        professional: "formal, business-appropriate language",
        friendly: "warm and approachable tone",
        concise: "brief and to-the-point",
        casual: "relaxed and conversational",
        custom: profileWithCustom.customInstructions || "professional tone"
      };

      const lengthGuide = {
        short: "1-2 short paragraphs maximum",
        medium: "2-3 paragraphs",
        long: "detailed response with multiple paragraphs"
      };

      const greetingGuide = {
        none: "No greeting, start directly with content",
        hi: "Start with 'Hi' or 'Hello'",
        name: `Start with 'Hi ${recipientName}' or 'Hello ${recipientName}'`,
        formal: `Start with 'Dear ${recipientName || "Sir/Madam"}'`
      };

      let systemPrompt = `You are an email drafting assistant. Generate a professional email draft.

STYLE REQUIREMENTS:
- Tone: ${toneGuide[profile.tone as keyof typeof toneGuide] || toneGuide.professional}
- Length: ${lengthGuide[profile.length as keyof typeof lengthGuide] || lengthGuide.medium}
- Greeting: ${greetingGuide[profile.greetingStyle as keyof typeof greetingGuide] || greetingGuide.hi}
- Sign-off: End with "${profile.signOff}"
- Format: ${profile.formattingPreference === "bullets" ? "Use bullet points where appropriate" : profile.formattingPreference === "mixed" ? "Mix paragraphs and bullet points as needed" : "Use flowing paragraphs"}

RULES:
- Write only the email body, no subject line
- Do not add [Your Name] or similar placeholders
- Be direct and clear
- Match the context and intent provided`;

      let userPrompt = "";
      
      if (actionType === "compose") {
        userPrompt = `Write a new email${to ? ` to ${to}` : ""}${subject ? ` about "${subject}"` : ""}.
${instructions ? `\nInstructions: ${instructions}` : ""}`;
      } else if (actionType === "reply" || actionType === "reply-all") {
        userPrompt = `Write a reply to this email:

FROM: ${recipientName} <${recipientEmail}>
SUBJECT: ${originalSubject}
BODY:
${originalBody.substring(0, 2000)}

${instructions ? `\nInstructions: ${instructions}` : ""}`;
      } else if (actionType === "forward") {
        userPrompt = `Write a forwarding message for this email${to ? ` to ${to}` : ""}:

ORIGINAL EMAIL:
FROM: ${recipientName} <${recipientEmail}>
SUBJECT: ${originalSubject}
BODY:
${originalBody.substring(0, 1500)}

${instructions ? `\nInstructions: ${instructions}` : "Include a brief note explaining why you're forwarding this."}`;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const draftBody = completion.choices[0]?.message?.content || "";

      // Create a pending action for this draft
      const action = await storage.createAssistantAction({
        userId,
        actionType: actionType === "compose" ? "send" : actionType,
        status: "pending",
        metadata: {
          messageId: messageId || undefined,
          to: to ? [to] : (recipientEmail ? [recipientEmail] : undefined),
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject: subject || (actionType === "reply" || actionType === "reply-all" ? `Re: ${originalSubject}` : actionType === "forward" ? `Fwd: ${originalSubject}` : undefined),
          body: draftBody,
          originalMessageId: messageId || undefined
        }
      });

      res.json({
        actionId: action.id,
        actionType,
        draft: {
          to: to || recipientEmail,
          cc,
          bcc,
          subject: action.metadata?.subject,
          body: draftBody
        },
        status: "pending"
      });
    } catch (error) {
      console.error("Error generating AI draft:", error);
      res.status(500).json({ error: "Failed to generate draft" });
    }
  });

  // Review/improve an existing draft (requires Pro+)
  app.post("/api/ai/review", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Plan gating: requires Pro or Premium
      const userPlan = await getUserPlan(userId);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({ 
          error: "Plan upgrade required", 
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }
      
      const { draft, improvementType, customInstructions } = req.body;
      
      if (!draft || typeof draft !== "string") {
        return res.status(400).json({ error: "Draft content is required" });
      }

      const styleProfile = await storage.getUserStyleProfile(userId);
      const profile = styleProfile?.profile || { tone: "professional", length: "medium" };

      const improvementPrompts: Record<string, string> = {
        shorter: "Make this email more concise while keeping the key points.",
        longer: "Expand this email with more detail and context.",
        formal: "Make this email more professional and formal.",
        casual: "Make this email more friendly and casual.",
        clearer: "Improve the clarity and readability of this email.",
        grammar: "Fix any grammar, spelling, or punctuation errors.",
        tone: `Adjust the tone to be more ${profile.tone}.`,
        custom: customInstructions || "Improve this email."
      };

      const instruction = improvementPrompts[improvementType] || improvementPrompts.clearer;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are an email editing assistant. Improve the provided email draft according to the instructions. Return only the improved email body, no explanations." 
          },
          { 
            role: "user", 
            content: `${instruction}\n\nOriginal draft:\n${draft}` 
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const improvedDraft = completion.choices[0]?.message?.content || draft;

      res.json({
        original: draft,
        improved: improvedDraft,
        improvementType
      });
    } catch (error) {
      console.error("Error reviewing draft:", error);
      res.status(500).json({ error: "Failed to review draft" });
    }
  });

  // Confirm and execute an action (send/trash/archive) (requires Pro+)
  app.post("/api/ai/confirm-action", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Plan gating: requires Pro or Premium
      const userPlan = await getUserPlan(userId);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({ 
          error: "Plan upgrade required", 
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }
      
      const { actionId, modifications } = req.body;
      
      if (!actionId) {
        return res.status(400).json({ error: "actionId is required" });
      }

      const action = await storage.getAssistantAction(actionId);
      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }

      if (action.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (action.status !== "pending") {
        return res.status(400).json({ error: `Action already ${action.status}` });
      }

      const grant = await storage.getNylasGrant(userId);
      if (!grant) {
        return res.status(400).json({ error: "No email account connected" });
      }

      // Apply any modifications to the action metadata
      const finalMetadata = modifications 
        ? { ...action.metadata, ...modifications }
        : action.metadata;

      let result: any = { success: false };

      try {
        switch (action.actionType) {
          case "send":
          case "reply":
          case "reply-all":
          case "forward":
            // Send the email via Nylas
            if (finalMetadata?.to && finalMetadata?.body) {
              await nylas.sendMessage(
                grant.grantId,
                finalMetadata.to as string[],
                finalMetadata.subject || "",
                finalMetadata.body as string,
                action.actionType !== "send" ? finalMetadata.originalMessageId : undefined,
                finalMetadata.cc as string[] | undefined,
                finalMetadata.bcc as string[] | undefined
              );
              nylas.invalidateMessagesCache(grant.grantId);
              result = { success: true, message: "Email sent successfully" };
            } else {
              result = { success: false, error: "Missing recipient or body" };
            }
            break;

          case "trash":
            if (finalMetadata?.messageId) {
              await nylas.trashMessage(grant.grantId, finalMetadata.messageId);
              nylas.invalidateMessagesCache(grant.grantId);
              result = { success: true, message: "Email moved to trash" };
            } else {
              result = { success: false, error: "Missing messageId" };
            }
            break;

          case "archive":
            if (finalMetadata?.messageId) {
              await nylas.archiveMessage(grant.grantId, finalMetadata.messageId);
              nylas.invalidateMessagesCache(grant.grantId);
              result = { success: true, message: "Email archived" };
            } else {
              result = { success: false, error: "Missing messageId" };
            }
            break;

          default:
            result = { success: false, error: `Unknown action type: ${action.actionType}` };
        }
      } catch (nylasError) {
        console.error("Nylas action error:", nylasError);
        result = { success: false, error: "Failed to execute email action" };
      }

      // Update action status
      const newStatus = result.success ? "executed" : "pending";
      await storage.updateAssistantActionStatus(
        actionId, 
        newStatus, 
        result.success ? new Date() : undefined
      );

      res.json({
        ...result,
        actionId,
        status: newStatus
      });
    } catch (error) {
      console.error("Error confirming action:", error);
      res.status(500).json({ error: "Failed to confirm action" });
    }
  });

  // Cancel a pending action (requires Pro+)
  app.post("/api/ai/cancel-action", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Plan gating: requires Pro or Premium
      const userPlan = await getUserPlan(userId);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({ 
          error: "Plan upgrade required", 
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }
      
      const { actionId } = req.body;
      
      if (!actionId) {
        return res.status(400).json({ error: "actionId is required" });
      }

      const action = await storage.getAssistantAction(actionId);
      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }

      if (action.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.updateAssistantActionStatus(actionId, "cancelled");
      res.json({ success: true, actionId, status: "cancelled" });
    } catch (error) {
      console.error("Error cancelling action:", error);
      res.status(500).json({ error: "Failed to cancel action" });
    }
  });

  // Store feedback and update user profile (requires Pro+)
  app.post("/api/ai/feedback", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Plan gating: requires Pro or Premium
      const userPlan = await getUserPlan(userId);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({ 
          error: "Plan upgrade required", 
          requiredPlan: "pro",
          currentPlan: userPlan
        });
      }
      
      const { assistantMessageId, rating, tags, comment } = req.body;
      
      if (!assistantMessageId) {
        return res.status(400).json({ error: "assistantMessageId is required" });
      }

      // Create feedback record
      const feedback = await storage.createAssistantFeedback({
        userId,
        assistantMessageId,
        rating: rating || null,
        tags: tags || null,
        comment: comment || null
      });

      // Update style profile based on feedback tags
      if (tags && Array.isArray(tags) && tags.length > 0) {
        await storage.updateStyleProfileFromFeedback(userId, tags);
      }

      res.json({ success: true, feedbackId: feedback.id });
    } catch (error) {
      console.error("Error storing feedback:", error);
      res.status(500).json({ error: "Failed to store feedback" });
    }
  });

  // Get feedback for a specific message
  app.get("/api/ai/feedback/:messageId", requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ error: "Invalid messageId" });
      }

      const feedback = await storage.getAssistantFeedbackByMessage(messageId);
      res.json(feedback || null);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // =====================
  // NOTIFICATIONS ROUTES
  // =====================
  
  // Get all notifications for current user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // Mark single notification as read
  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ error: "Invalid notification ID" });
      }
      const notification = await storage.markNotificationAsRead(userId, notificationId);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // =====================
  // TEAM INVITES ROUTES (Business plan only)
  // =====================

  // Send a team invite (Business plan only)
  app.post("/api/team/invite", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { inviteeEmail } = req.body;

      if (!inviteeEmail || typeof inviteeEmail !== "string") {
        return res.status(400).json({ error: "Invitee email is required" });
      }

      // Check if user has Business plan
      const user = await storage.getUser(userId);
      if (!user || user.plan !== "premium") {
        return res.status(403).json({ error: "Team invites are only available on the Business plan" });
      }

      // Check team member limit (max 1 member = 2 total including owner)
      const memberCount = await storage.getTeamMemberCount(userId);
      if (memberCount >= 1) {
        return res.status(400).json({ error: "Team limit reached. Business plan allows 1 additional team member." });
      }

      // Check if pending invites already exist
      const sentInvites = await storage.getSentInvites(userId);
      const pendingCount = sentInvites.filter(i => i.status === "pending").length;
      if (pendingCount + memberCount >= 1) {
        return res.status(400).json({ error: "You already have a pending invite or team member." });
      }

      // Find the invitee user
      const invitee = await storage.getUserByEmail(inviteeEmail.toLowerCase().trim());
      if (!invitee) {
        return res.status(404).json({ error: "User not found. They must have an account to receive an invite." });
      }

      // Can't invite yourself
      if (invitee.id === userId) {
        return res.status(400).json({ error: "You cannot invite yourself" });
      }

      // Check if invitee is already a team member somewhere
      const existingMembership = await storage.getTeamMembership(invitee.id);
      if (existingMembership) {
        return res.status(400).json({ error: "This user is already on another team" });
      }

      // Check if there's already a pending invite
      const existingInvites = sentInvites.filter(i => i.inviteeId === invitee.id && i.status === "pending");
      if (existingInvites.length > 0) {
        return res.status(400).json({ error: "You already have a pending invite to this user" });
      }

      // Create the invite
      const invite = await storage.createTeamInvite({
        inviterId: userId,
        inviteeId: invitee.id,
        status: "pending"
      });

      // Create notification for invitee
      await storage.createNotification({
        userId: invitee.id,
        type: "team_invite_received",
        title: "Team Invite Received",
        message: `${user.email} invited you to join their team`,
        isRead: false,
        data: { inviteId: invite.id, inviterId: userId, inviterEmail: user.email }
      });

      // Log activity
      await storage.createActivityLog(userId, user.email, "team_invite_sent", `Invited ${inviteeEmail} to team`);

      res.json({ success: true, invite });
    } catch (error) {
      console.error("Error sending team invite:", error);
      res.status(500).json({ error: "Failed to send team invite" });
    }
  });

  // Get sent invites
  app.get("/api/team/invites/sent", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const invites = await storage.getSentInvites(userId);
      
      // Enrich with invitee email
      const enrichedInvites = await Promise.all(invites.map(async (invite) => {
        const invitee = await storage.getUser(invite.inviteeId);
        return {
          ...invite,
          inviteeEmail: invitee?.email || "Unknown"
        };
      }));
      
      res.json(enrichedInvites);
    } catch (error) {
      console.error("Error fetching sent invites:", error);
      res.status(500).json({ error: "Failed to fetch sent invites" });
    }
  });

  // Get pending invites received
  app.get("/api/team/invites/pending", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const invites = await storage.getPendingInvitesForUser(userId);
      
      // Enrich with inviter email
      const enrichedInvites = await Promise.all(invites.map(async (invite) => {
        const inviter = await storage.getUser(invite.inviterId);
        return {
          ...invite,
          inviterEmail: inviter?.email || "Unknown"
        };
      }));
      
      res.json(enrichedInvites);
    } catch (error) {
      console.error("Error fetching pending invites:", error);
      res.status(500).json({ error: "Failed to fetch pending invites" });
    }
  });

  // Accept team invite
  app.post("/api/team/invite/:id/accept", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const inviteId = parseInt(req.params.id);
      
      if (isNaN(inviteId)) {
        return res.status(400).json({ error: "Invalid invite ID" });
      }

      const invite = await storage.getTeamInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      if (invite.inviteeId !== userId) {
        return res.status(403).json({ error: "This invite is not for you" });
      }

      if (invite.status !== "pending") {
        return res.status(400).json({ error: "This invite has already been responded to" });
      }

      // Check if user is already on a team
      const existingMembership = await storage.getTeamMembership(userId);
      if (existingMembership) {
        return res.status(400).json({ error: "You are already on a team" });
      }

      // Update invite status
      await storage.updateTeamInviteStatus(inviteId, "accepted");

      // Create team membership
      await storage.createTeamMember(invite.inviterId, userId, "member");

      // Notify inviter
      const user = await storage.getUser(userId);
      await storage.createNotification({
        userId: invite.inviterId,
        type: "team_invite_accepted",
        title: "Team Invite Accepted",
        message: `${user?.email || "Someone"} accepted your team invite`,
        isRead: false,
        data: { inviteId }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting team invite:", error);
      res.status(500).json({ error: "Failed to accept team invite" });
    }
  });

  // Decline team invite
  app.post("/api/team/invite/:id/decline", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const inviteId = parseInt(req.params.id);
      
      if (isNaN(inviteId)) {
        return res.status(400).json({ error: "Invalid invite ID" });
      }

      const invite = await storage.getTeamInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      if (invite.inviteeId !== userId) {
        return res.status(403).json({ error: "This invite is not for you" });
      }

      if (invite.status !== "pending") {
        return res.status(400).json({ error: "This invite has already been responded to" });
      }

      // Update invite status
      await storage.updateTeamInviteStatus(inviteId, "declined");

      // Notify inviter
      const user = await storage.getUser(userId);
      await storage.createNotification({
        userId: invite.inviterId,
        type: "team_invite_declined",
        title: "Team Invite Declined",
        message: `${user?.email || "Someone"} declined your team invite`,
        isRead: false,
        data: { inviteId }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error declining team invite:", error);
      res.status(500).json({ error: "Failed to decline team invite" });
    }
  });

  // Get current team members
  app.get("/api/team/members", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const members = await storage.getTeamMembers(userId);
      
      // Enrich with member email
      const enrichedMembers = await Promise.all(members.map(async (member) => {
        const memberUser = await storage.getUser(member.memberId);
        return {
          ...member,
          memberEmail: memberUser?.email || "Unknown"
        };
      }));
      
      res.json(enrichedMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Remove team member
  app.delete("/api/team/member/:memberId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const memberId = req.params.memberId;
      
      const success = await storage.removeTeamMember(userId, memberId);
      if (!success) {
        return res.status(404).json({ error: "Team member not found" });
      }

      // Notify the removed member
      const user = await storage.getUser(userId);
      await storage.createNotification({
        userId: memberId,
        type: "team_removed",
        title: "Removed from Team",
        message: `You have been removed from ${user?.email || "someone"}'s team`,
        isRead: false,
        data: {}
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  // Get current user's team membership status
  app.get("/api/team/membership", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const membership = await storage.getTeamMembership(userId);
      
      if (membership) {
        const owner = await storage.getUser(membership.ownerId);
        return res.json({
          isMember: true,
          ownerId: membership.ownerId,
          ownerEmail: owner?.email || "Unknown",
          role: membership.role,
          joinedAt: membership.joinedAt
        });
      }
      
      res.json({ isMember: false });
    } catch (error) {
      console.error("Error fetching membership:", error);
      res.status(500).json({ error: "Failed to fetch membership" });
    }
  });

  // ==================== OWNER PANEL ROUTES ====================

  // Check if current user is owner
  app.get("/api/owner/check", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.json({ isOwner: false });
      }
      
      const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
      const isOwner = ownerEmail && user.email.toLowerCase().trim() === ownerEmail;
      
      res.json({ isOwner });
    } catch (error) {
      console.error("Error checking owner status:", error);
      res.status(500).json({ error: "Failed to check owner status" });
    }
  });

  // Owner Dashboard Stats
  app.get("/api/owner/stats", requireOwner, async (req, res) => {
    try {
      const userStats = await storage.getUserStats();
      const allUsers = await storage.getAllUsers();
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Calculate signups
      const signupsToday = allUsers.filter(u => new Date(u.createdAt) >= today).length;
      const signupsThisWeek = allUsers.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;
      
      // Active users (simplified - users created in timeframe for now)
      const activeUsers7Days = allUsers.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;
      const activeUsers30Days = allUsers.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length;
      
      // Get connected email accounts count
      const usersWithGrants = await Promise.all(
        allUsers.map(async (user) => {
          const grant = await storage.getNylasGrant(user.id);
          return grant ? 1 : 0;
        })
      );
      const connectedAccounts = usersWithGrants.reduce((sum: number, val: number) => sum + val, 0 as number);
      
      // AI usage totals (from audit logs)
      const aiUsageTotals = {
        draftsGenerated: 0,
        emailsSent: 0,
        polishUsed: 0,
      };
      
      res.json({
        totalUsers: userStats.total,
        activeUsers7Days,
        activeUsers30Days,
        freeUsers: userStats.free,
        proUsers: userStats.pro,
        premiumUsers: userStats.premium,
        connectedAccounts,
        signupsToday,
        signupsThisWeek,
        aiUsage: aiUsageTotals,
        estimatedMRR: (userStats.pro * 24) + (userStats.premium * 49)
      });
    } catch (error) {
      console.error("Error fetching owner stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Suspend/unsuspend user
  app.post("/api/owner/users/:userId/suspend", requireOwner, async (req, res) => {
    try {
      const { userId } = req.params;
      const { suspended } = req.body;
      // TODO: Add suspended field to users table and implement
      res.json({ success: true, userId, suspended });
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  // Reset user AI usage limits
  app.post("/api/owner/users/:userId/reset-limits", requireOwner, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Reset dailyAICount to 0 and clear lastAICountReset
      await storage.updateUser(userId, { 
        dailyAICount: 0, 
        lastAICountReset: new Date() 
      });
      res.json({ success: true, message: "Usage limits reset" });
    } catch (error) {
      console.error("Error resetting limits:", error);
      res.status(500).json({ error: "Failed to reset limits" });
    }
  });

  // Get system status
  app.get("/api/owner/system-status", requireOwner, async (req, res) => {
    try {
      // Check various service statuses
      const status = {
        database: "healthy",
        nylas: process.env.NYLAS_API_KEY ? "configured" : "not_configured",
        stripe: process.env.STRIPE_SECRET_KEY ? "configured" : "not_configured",
        openai: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? "configured" : "not_configured",
        lastChecked: new Date().toISOString(),
      };
      res.json(status);
    } catch (error) {
      console.error("Error fetching system status:", error);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  // Get feature flags
  app.get("/api/owner/feature-flags", requireOwner, async (req, res) => {
    try {
      // TODO: Implement feature flags table
      const flags = [
        { id: "ai_draft", name: "AI Draft", enabled: true, plans: ["free", "pro", "premium"] },
        { id: "ai_polish", name: "AI Polish", enabled: true, plans: ["pro", "premium"] },
        { id: "schedule_send", name: "Schedule Send", enabled: true, plans: ["pro", "premium"] },
        { id: "voice_assistant", name: "Voice Assistant", enabled: true, plans: ["premium"] },
        { id: "multi_email_reply", name: "Multi-Email Reply", enabled: true, plans: ["pro", "premium"] },
      ];
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ error: "Failed to fetch flags" });
    }
  });

  // Toggle feature flag
  app.patch("/api/owner/feature-flags/:flagId", requireOwner, async (req, res) => {
    try {
      const { flagId } = req.params;
      const { enabled, plans } = req.body;
      // TODO: Persist to database
      res.json({ success: true, flagId, enabled, plans });
    } catch (error) {
      console.error("Error updating feature flag:", error);
      res.status(500).json({ error: "Failed to update flag" });
    }
  });

  // Get all users for owner
  app.get("/api/owner/users", requireOwner, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      // Enrich with connected email provider
      const enrichedUsers = await Promise.all(
        allUsers.map(async (user) => {
          const grant = await storage.getNylasGrant(user.id);
          return {
            id: user.id,
            email: user.email,
            plan: user.plan,
            onboardingCompleted: user.onboardingCompleted,
            createdAt: user.createdAt,
            connectedProvider: grant?.provider || null,
            connectedEmail: grant?.email || null
          };
        })
      );
      
      res.json(enrichedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all feedback for owner
  app.get("/api/owner/feedback", requireOwner, async (req, res) => {
    try {
      const feedback = await storage.getAllUserFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Update feedback status
  app.patch("/api/owner/feedback/:id/status", requireOwner, async (req, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["pending", "reviewed", "resolved"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const updated = await storage.updateFeedbackStatus(feedbackId, status);
      if (!updated) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ error: "Failed to update feedback" });
    }
  });

  // Get activity logs for owner
  app.get("/api/owner/activity-logs", requireOwner, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Send notification to users
  app.post("/api/owner/notifications/send", requireOwner, async (req, res) => {
    try {
      const { target, targetPlan, userIds, title, message, type } = req.body;
      
      if (!title || !message) {
        return res.status(400).json({ error: "Title and message are required" });
      }
      
      let targetUserIds: string[] = [];
      
      if (target === "all") {
        const allUsers = await storage.getAllUsers();
        targetUserIds = allUsers.map(u => u.id);
      } else if (target === "plan" && targetPlan) {
        const planUsers = await storage.getUsersByPlan(targetPlan);
        targetUserIds = planUsers.map(u => u.id);
      } else if (target === "specific" && userIds && Array.isArray(userIds)) {
        targetUserIds = userIds;
      } else {
        return res.status(400).json({ error: "Invalid target specification" });
      }
      
      await storage.sendNotificationToUsers(
        targetUserIds,
        type || "admin_notification",
        title,
        message
      );
      
      res.json({ success: true, sentTo: targetUserIds.length });
    } catch (error) {
      console.error("Error sending notifications:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  // Update user plan (owner only)
  app.patch("/api/owner/users/:userId/plan", requireOwner, async (req, res) => {
    try {
      const { userId } = req.params;
      const { plan } = req.body;
      
      if (!plan || !["free", "pro", "premium", "business"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan. Must be free, pro, premium, or business" });
      }
      
      // Map business to premium for internal storage
      const storedPlan = plan === "business" ? "premium" : plan;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const oldPlan = user.plan;
      const updatedUser = await storage.updateUser(userId, { plan: storedPlan });
      
      // Log the plan change
      await storage.createActivityLog(
        userId,
        user.email,
        storedPlan === "free" ? "plan_downgrade" : "plan_upgrade",
        `Plan changed from ${oldPlan} to ${storedPlan} by owner`
      );
      
      res.json({ 
        success: true, 
        user: {
          id: updatedUser?.id,
          email: updatedUser?.email,
          plan: updatedUser?.plan
        }
      });
    } catch (error) {
      console.error("Error updating user plan:", error);
      res.status(500).json({ error: "Failed to update user plan" });
    }
  });

  // Get users by plan for owner
  app.get("/api/owner/users/by-plan/:plan", requireOwner, async (req, res) => {
    try {
      const plan = req.params.plan;
      if (!["free", "pro", "premium"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      
      const users = await storage.getUsersByPlan(plan);
      res.json(users.map(u => ({
        id: u.id,
        email: u.email,
        plan: u.plan,
        createdAt: u.createdAt
      })));
    } catch (error) {
      console.error("Error fetching users by plan:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // ==================== FINANCIAL TRACKING ROUTES ====================

  // Get financial summary for owner panel
  app.get("/api/owner/finances/summary", requireOwner, async (req, res) => {
    try {
      const { period = "month" } = req.query;
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case "day":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case "all":
          startDate = new Date(2020, 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      const summary = await storage.getFinancialSummary(startDate, now);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ error: "Failed to fetch financial summary" });
    }
  });

  // Get all expenses
  app.get("/api/owner/finances/expenses", requireOwner, async (req, res) => {
    try {
      const { startDate, endDate, category } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const cat = category as any;
      
      const expensesList = await storage.getExpenses(start, end, cat);
      res.json(expensesList);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // Create expense
  app.post("/api/owner/finances/expenses", requireOwner, async (req, res) => {
    try {
      const { category, serviceName, amount, description, billingPeriod, isRecurring, metadata } = req.body;
      
      if (!category || !serviceName || amount === undefined) {
        return res.status(400).json({ error: "Category, service name, and amount are required" });
      }
      
      const expense = await storage.createExpense({
        category,
        serviceName,
        amount: Math.round(amount * 100), // Convert to cents
        description,
        billingPeriod,
        isRecurring: isRecurring || false,
        metadata,
      });
      
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  // Update expense
  app.patch("/api/owner/finances/expenses/:id", requireOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      if (updates.amount !== undefined) {
        updates.amount = Math.round(updates.amount * 100);
      }
      
      const expense = await storage.updateExpense(id, updates);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  // Delete expense
  app.delete("/api/owner/finances/expenses/:id", requireOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteExpense(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Get all revenue
  app.get("/api/owner/finances/revenue", requireOwner, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const revenueList = await storage.getRevenue(start, end);
      res.json(revenueList);
    } catch (error) {
      console.error("Error fetching revenue:", error);
      res.status(500).json({ error: "Failed to fetch revenue" });
    }
  });

  // Create revenue entry
  app.post("/api/owner/finances/revenue", requireOwner, async (req, res) => {
    try {
      const { userId, userEmail, plan, amount, type, description, revenueDate } = req.body;
      
      if (!plan || amount === undefined) {
        return res.status(400).json({ error: "Plan and amount are required" });
      }
      
      const rev = await storage.createRevenue({
        userId,
        userEmail,
        plan,
        amount: Math.round(amount * 100), // Convert to cents
        type: type || "subscription",
        description,
        revenueDate: revenueDate ? new Date(revenueDate) : new Date(),
      });
      
      res.json(rev);
    } catch (error) {
      console.error("Error creating revenue:", error);
      res.status(500).json({ error: "Failed to create revenue" });
    }
  });

  // Get daily financials for charts
  app.get("/api/owner/finances/daily", requireOwner, async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(days as string));
      
      const dailyData = await storage.getDailyFinancials(startDate, endDate);
      res.json(dailyData);
    } catch (error) {
      console.error("Error fetching daily financials:", error);
      res.status(500).json({ error: "Failed to fetch daily financials" });
    }
  });

  // ==================== STRIPE PAYMENT ROUTES ====================
  
  // Get Stripe publishable key for frontend
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe key:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  // Get available products with prices from Stripe
  app.get("/api/stripe/products", async (req, res) => {
    try {
      const result = await db.execute(
        sql`
          SELECT 
            p.id as product_id,
            p.name as product_name,
            p.description as product_description,
            p.active as product_active,
            p.metadata as product_metadata,
            pr.id as price_id,
            pr.unit_amount,
            pr.currency,
            pr.recurring,
            pr.active as price_active
          FROM stripe.products p
          LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
          WHERE p.active = true
          ORDER BY pr.unit_amount ASC
        `
      );
      
      // Group prices by product
      const productsMap = new Map();
      for (const row of result.rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
          });
        }
      }
      
      res.json({ products: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error fetching Stripe products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Create checkout session for subscription
  app.post("/api/stripe/checkout", requireAuth, async (req, res) => {
    try {
      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      
      // Create or get customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        await storage.updateUser(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }
      
      // Create checkout session with 14-day free trial
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        subscription_data: {
          trial_period_days: 14,
        },
        success_url: `${baseUrl}/pricing?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { userId: user.id },
      });
      
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Get user subscription status
  app.get("/api/stripe/subscription", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (!user.stripeSubscriptionId) {
        return res.json({ subscription: null, plan: user.plan });
      }
      
      const result = await db.execute(
        sql`SELECT * FROM stripe.subscriptions WHERE id = ${user.stripeSubscriptionId}`
      );
      
      const subscription = result.rows[0] || null;
      res.json({ subscription, plan: user.plan });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Create customer portal session for managing subscription
  app.post("/api/stripe/portal", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription to manage" });
      }
      
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/settings`,
      });
      
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  return httpServer;
}
