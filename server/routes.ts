import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql, desc, eq } from "drizzle-orm";
import { ownerNotes, pageViews, revenue, expenses, type EmailAccount } from "@shared/schema";
import OpenAI from "openai";
import { wrapOpenAIWithTracking } from "./ai-cost-tracker";

import { gmailProvider } from "./gmail";
import { microsoftProvider } from "./microsoft";
import { imapProvider, testImapConnection, testSmtpConnection, detectProvider, encryptImapConfig, validateHost } from "./imap";
import type { IEmailProvider, EmailListItem, EmailDetail, GetMessagesOptions } from "./email-provider";
import { getRecentHealthLogs, getUnresolvedIssues, resolveIssue, resolveAllIssues, getHealthSummary } from "./api-health";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { aiPreferencesSchema, insertCustomFolderSchema } from "@shared/schema";
import { z } from "zod";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { registerImageRoutes } from "./replit_integrations/image";
import { verifyAccessToken, signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, getRefreshTokenExpiresAt } from "./jwt";
import { sendVerificationEmail, sendPasswordResetEmail, sendTrialEndedEmail } from "./email";
import { jsonSchema } from "drizzle-zod";
import { scanFile, checkFileType, sanitizeSVGBuffer } from "./antivirus";
import { stripEmailNoise, stripHtml } from "./email-utils";
import {
  authLimiter,
  passwordResetLimiter,
  twoFactorLimiter,
  apiLimiter,
  aiGenerationLimiter,
  emailSendLimiter,
  fileLimiter,
} from "./rate-limiter";

// Pending registrations waiting for email verification
const pendingRegistrations: Map<
  string,
  {
    email: string;
    hashedPassword: string;
    expiresAt: number;
    referralCode?: string;
  }
> = new Map();

// Pending login sessions waiting for 2FA verification
const pending2FALogins: Map<string, { userId: string; expiresAt: number }> =
  new Map();

// Cleanup expired pending items
function cleanupPendingItems(): void {
  const now = Date.now();
  for (const [key, data] of pendingRegistrations.entries()) {
    if (data.expiresAt < now) {
      pendingRegistrations.delete(key);
    }
  }
  for (const [key, data] of pending2FALogins.entries()) {
    if (data.expiresAt < now) {
      pending2FALogins.delete(key);
    }
  }
}

// Helper to get client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.socket?.remoteAddress || req.ip || "unknown";
}

const assistantPermissionsUpdateSchema = z
  .object({
    canReadEmails: z.boolean().optional(),
    canSendEmails: z.boolean().optional(),
    canArchive: z.boolean().optional(),
    canTrash: z.boolean().optional(),
    canSearch: z.boolean().optional(),
    requireConfirmation: z.boolean().optional(),
    maxEmailsPerDay: z.number().int().min(0).max(100).optional(),
  })
  .strict();

const scryptAsync = promisify(scrypt);

const openai = wrapOpenAIWithTracking(new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
}));

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

async function verifyPassword(
  storedPassword: string,
  suppliedPassword: string,
): Promise<boolean> {
  const [salt, hashedPassword] = storedPassword.split(":");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(
    suppliedPassword,
    salt,
    64,
  )) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

declare module "express" {
  interface Request {
    jwtUserId?: string;
  }
}

function extractJwtIdentity(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    if (payload) {
      req.jwtUserId = payload.userId;
    }
  }
  next();
}

function getUserId(req: Request): string | undefined {
  return req.jwtUserId || req.session.userId;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.jwtUserId) {
    req.session.userId = req.jwtUserId;
  }
  const userId = getUserId(req);
  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Owner/Admin authentication middleware
async function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.jwtUserId) {
    req.session.userId = req.jwtUserId;
  }
  const userId = getUserId(req);
  if (!userId) {
    console.log("[requireOwner] No session userId");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await storage.getUser(userId);
  if (!user) {
    console.log("[requireOwner] User not found for id:", req.session.userId);
    return res.status(401).json({ error: "User not found" });
  }

  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
  const userEmail = user.email.toLowerCase().trim();
  console.log("[requireOwner] Checking:", {
    userEmail,
    ownerEmail,
    match: userEmail === ownerEmail,
  });

  if (!ownerEmail || userEmail !== ownerEmail) {
    return res
      .status(403)
      .json({ error: "Access denied. Owner privileges required." });
  }

  next();
}

// Plan-based gating middleware
function getEffectivePlan(user: any): string {
  if (user.trialEndsAt && new Date(user.trialEndsAt) <= new Date() && !user.stripeSubscriptionId) {
    return "free";
  }
  return user.plan || "free";
}

async function requirePlan(minPlan: "pro" | "premium") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const effectivePlan = getEffectivePlan(user);

    const planHierarchy: Record<string, number> = {
      free: 0,
      pro: 1,
      premium: 2,
    };
    const userPlanLevel = planHierarchy[effectivePlan] || 0;
    const requiredLevel = planHierarchy[minPlan];

    if (userPlanLevel < requiredLevel) {
      return res.status(403).json({
        error: "Plan upgrade required",
        requiredPlan: minPlan,
        currentPlan: effectivePlan,
      });
    }

    next();
  };
}

async function getUserPlan(userId: string): Promise<string> {
  const user = await storage.getUser(userId);
  if (!user) return "free";
  return getEffectivePlan(user);
}

// Check if user has at least the specified plan
function hasPlan(userPlan: string, minPlan: "pro" | "premium"): boolean {
  const planHierarchy: Record<string, number> = { free: 0, pro: 1, premium: 2 };
  return (planHierarchy[userPlan] || 0) >= planHierarchy[minPlan];
}

function getAiModel(userPlan: string): string {
  return userPlan === "premium" ? "gpt-4o" : "gpt-4o-mini";
}

function getEmailRedirectUri(req: any, provider: string): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
  return `${protocol}://${host}/api/auth/${provider}/callback`;
}

function isExternalEmailId(id: string, account: EmailAccount | undefined): boolean {
  if (!account) return false;
  if (account.provider === "imap") return true;
  return id.length > 10 && !/^\d+$/.test(id);
}

async function getProviderAndToken(userId: string): Promise<{ provider: IEmailProvider; accessToken: string; account: EmailAccount } | null> {
  const account = await storage.getEmailAccount(userId);
  if (!account) return null;

  if (account.provider === "imap") {
    return { provider: imapProvider, accessToken: account.accessToken, account };
  }

  const isExpired = account.tokenExpiresAt && new Date(account.tokenExpiresAt).getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired) {
    const emailProvider = account.provider === "google" ? gmailProvider : microsoftProvider;
    try {
      const refreshed = await emailProvider.refreshAccessToken(account.refreshToken);
      await storage.updateEmailAccount(userId, {
        accessToken: refreshed.accessToken,
        tokenExpiresAt: refreshed.expiresAt,
      });
      return { provider: emailProvider, accessToken: refreshed.accessToken, account: { ...account, accessToken: refreshed.accessToken } };
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    }
  }

  const emailProvider = account.provider === "google" ? gmailProvider : microsoftProvider;
  return { provider: emailProvider, accessToken: account.accessToken, account };
}

const pendingOAuthStates: Map<
  string,
  { userId: string; provider: string; expiresAt: number }
> = new Map();

const pendingOAuthLoginStates: Map<
  string,
  { provider: string; expiresAt: number; referralCode?: string; platform?: string; mobileRedirectUri?: string }
> = new Map();

function generateStateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function cleanupExpiredStates(): void {
  const now = Date.now();
  for (const [token, data] of pendingOAuthStates.entries()) {
    if (data.expiresAt < now) {
      pendingOAuthStates.delete(token);
    }
  }
  for (const [token, data] of pendingOAuthLoginStates.entries()) {
    if (data.expiresAt < now) {
      pendingOAuthLoginStates.delete(token);
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

const languageDetectionCache: Map<
  string,
  {
    languageCode: string;
    languageName: string;
    confidence: number;
    isEnglish: boolean;
    timestamp: number;
  }
> = new Map();
const LANG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LANG_CACHE_MAX_SIZE = 500;

const translationCache: Map<
  string,
  {
    detectedLanguage: string;
    translatedSubject: string;
    translatedBody: string;
    culturalNotes?: string;
    timestamp: number;
  }
> = new Map();
const summaryCache: Map<
  string,
  {
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    timestamp: number;
  }
> = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cleanupTranslationCache() {
  const now = Date.now();
  for (const [key, value] of Array.from(translationCache.entries())) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      translationCache.delete(key);
    }
  }
  if (translationCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(translationCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );
    const toRemove = entries.slice(0, translationCache.size - CACHE_MAX_SIZE);
    toRemove.forEach(([key]) => translationCache.delete(key));
  }
}

function generateUnreadSignature(unreadEmailIds: number[]): string {
  return unreadEmailIds.sort((a, b) => a - b).join(",");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.use(extractJwtIdentity);
  registerAudioRoutes(app);
  registerImageRoutes(app);

  app.post("/api/analytics/track", async (req, res) => {
    try {
      const { path, referrer, sessionId } = req.body;
      if (!path || !sessionId) return res.status(400).json({ error: "Missing fields" });

      const forwarded = req.headers["x-forwarded-for"];
      const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "";

      let country: string | null = null;
      let region: string | null = null;
      let city: string | null = null;

      const isPrivateIp = !ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.");
      if (!isPrivateIp) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, { signal: controller.signal });
          clearTimeout(timeout);
          if (geoRes.ok) {
            const geo = await geoRes.json() as { status?: string; country?: string; regionName?: string; city?: string };
            if (geo.status === "success") {
              country = geo.country || null;
              region = geo.regionName || null;
              city = geo.city || null;
            }
          }
        } catch {}
      }

      await db.insert(pageViews).values({
        sessionId,
        path,
        referrer: referrer || null,
        country,
        region,
        city,
        userAgent: req.headers["user-agent"] || null,
        userId: (req.session as any)?.userId || null,
      });

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track" });
    }
  });

  app.get("/api/owner/analytics", requireOwner, async (req, res) => {
    try {
      const { range = "7d" } = req.query;

      let daysBack = 7;
      if (range === "1d") daysBack = 0;
      else if (range === "7d") daysBack = 7;
      else if (range === "30d") daysBack = 30;
      else if (range === "90d") daysBack = 90;
      else if (range === "365d") daysBack = 365;

      const since = new Date();
      if (daysBack === 0) {
        since.setHours(0, 0, 0, 0);
      } else {
        since.setDate(since.getDate() - daysBack);
        since.setHours(0, 0, 0, 0);
      }

      const views = await db
        .select()
        .from(pageViews)
        .where(sql`${pageViews.viewedAt} >= ${since}`)
        .orderBy(pageViews.viewedAt);

      const totalViews = views.length;
      const uniqueSessions = new Set(views.map((v) => v.sessionId)).size;

      const byDay: Record<string, { views: number; sessions: Set<string> }> = {};
      for (const v of views) {
        const day = new Date(v.viewedAt).toISOString().slice(0, 10);
        if (!byDay[day]) byDay[day] = { views: 0, sessions: new Set() };
        byDay[day].views++;
        byDay[day].sessions.add(v.sessionId);
      }

      const allDays: string[] = [];
      const cursor = new Date(since);
      const today = new Date();
      while (cursor <= today) {
        allDays.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }

      const dailyData = allDays.map((date) => ({
        date,
        views: byDay[date]?.views || 0,
        visitors: byDay[date]?.sessions.size || 0,
      }));

      const byCountry: Record<string, number> = {};
      const byRegion: Record<string, number> = {};
      for (const v of views) {
        if (v.country && v.country !== "Unknown") {
          byCountry[v.country] = (byCountry[v.country] || 0) + 1;
        }
        if (v.region && v.region !== "Unknown") {
          byRegion[v.region] = (byRegion[v.region] || 0) + 1;
        }
      }

      const topCountries = Object.entries(byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }));

      const topRegions = Object.entries(byRegion)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }));

      const byPage: Record<string, number> = {};
      for (const v of views) {
        byPage[v.path] = (byPage[v.path] || 0) + 1;
      }
      const topPages = Object.entries(byPage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count }));

      const byReferrer: Record<string, number> = {};
      for (const v of views) {
        const ref = v.referrer || "Direct";
        byReferrer[ref] = (byReferrer[ref] || 0) + 1;
      }
      const topReferrers = Object.entries(byReferrer)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([source, count]) => ({ source, count }));

      let totalRevenue = 0;
      try {
        const allRevenue = await db
          .select()
          .from(revenue)
          .where(sql`${revenue.revenueDate} >= ${since}`);
        totalRevenue = allRevenue.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      } catch (e) {
        console.error("Revenue query error:", e);
      }

      let totalExpenses = 0;
      try {
        const allExpenses = await db
          .select()
          .from(expenses)
          .where(sql`${expenses.expenseDate} >= ${since}`);
        totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      } catch (e) {
        console.error("Expenses query error:", e);
      }

      const allUsers = await storage.getAllUsers();
      const usersInRange = allUsers.filter((u) => new Date(u.createdAt) >= since);
      const paidUsers = usersInRange.filter((u) => u.plan === "pro" || u.plan === "premium");
      const conversionRate = usersInRange.length > 0 ? (paidUsers.length / usersInRange.length) * 100 : 0;

      const totalPaidUsers = allUsers.filter((u) => u.plan === "pro" || u.plan === "premium").length;
      const overallConversion = allUsers.length > 0 ? (totalPaidUsers / allUsers.length) * 100 : 0;

      res.json({
        totalViews,
        uniqueVisitors: uniqueSessions,
        dailyData,
        topCountries,
        topRegions,
        topPages,
        topReferrers,
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
        newUsers: usersInRange.length,
        totalUsers: allUsers.length,
        conversionRate: Math.round(conversionRate * 10) / 10,
        overallConversion: Math.round(overallConversion * 10) / 10,
        range,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/.well-known/microsoft-identity-association.json", (_req, res) => {
    res.json({
      associatedApplications: [
        {
          applicationId: "ab059e01-544a-4b21-a44f-f886a18aed60"
        }
      ]
    });
  });

  // Step 1: Initiate registration - sends verification email
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { email, password, referralCode } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      // Normalize email to prevent duplicate accounts
      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password and store pending registration
      const hashedPassword = await hashPassword(password);

      // Create verification code
      const verificationCode = await storage.createVerificationCode(
        normalizedEmail,
        "signup",
      );

      // Store pending registration with optional referral code
      pendingRegistrations.set(normalizedEmail, {
        email: normalizedEmail,
        hashedPassword,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        referralCode: referralCode || undefined,
      });

      // Send verification email
      const emailSent = await sendVerificationEmail(
        normalizedEmail,
        verificationCode.code,
        "signup",
      );

      if (!emailSent) {
        pendingRegistrations.delete(normalizedEmail);
        return res
          .status(500)
          .json({
            error: "Failed to send verification email. Please try again.",
          });
      }

      res.json({
        requiresVerification: true,
        email: normalizedEmail,
        message: "Verification code sent to your email",
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Step 2: Verify email and complete registration
  app.post(
    "/api/auth/verify-registration",
    twoFactorLimiter,
    async (req, res) => {
      try {
        const { email, code } = req.body;

        if (!email || !code) {
          return res
            .status(400)
            .json({ error: "Email and verification code are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check pending registration exists
        const pending = pendingRegistrations.get(normalizedEmail);
        if (!pending || pending.expiresAt < Date.now()) {
          pendingRegistrations.delete(normalizedEmail);
          return res
            .status(400)
            .json({ error: "Registration expired. Please start again." });
        }

        // Verify code
        const verificationCode = await storage.getVerificationCode(
          normalizedEmail,
          code,
          "signup",
        );
        if (!verificationCode) {
          return res
            .status(400)
            .json({ error: "Invalid or expired verification code" });
        }

        // Mark code as used
        await storage.markVerificationCodeUsed(verificationCode.id);

        // Create the user
        const user = await storage.createUser({
          email: normalizedEmail,
          password: pending.hashedPassword,
        });

        // Mark email as verified
        await storage.updateUser(user.id, { emailVerified: true });

        // Process referral link if present
        if (pending.referralCode) {
          try {
            const referrer = await storage.getUserByReferralCode(
              pending.referralCode,
            );
            if (referrer && referrer.id !== user.id) {
              await storage.createReferral(referrer.id, user.id);
              await storage.updateUser(user.id, {
                referredByUserId: referrer.id,
              });
            }
          } catch (refErr) {
            console.error("Error processing referral:", refErr);
          }
        }

        // Clean up pending registration
        pendingRegistrations.delete(normalizedEmail);

        // Log signup activity
        await storage.createActivityLog(
          user.id,
          normalizedEmail,
          "signup",
          "New user registered with email verification",
        );

        // Create session
        req.session.regenerate((err) => {
          if (err) {
            console.error("Session regeneration error:", err);
            return res.status(500).json({ error: "Session error" });
          }
          req.session.userId = user.id;

          // Create login session record
          const clientIp = getClientIp(req);
          storage
            .createLoginSession({
              userId: user.id,
              sessionId: req.sessionID,
              ipAddress: clientIp,
              userAgent: req.headers["user-agent"] || null,
              city: null,
              region: null,
              country: null,
            })
            .catch((err) =>
              console.error("Failed to create login session:", err),
            );

          res.json({
            user: {
              id: user.id,
              email: user.email,
              plan: user.plan,
              onboardingCompleted: user.onboardingCompleted,
              emailVerified: true,
              twoFactorEnabled: false,
            },
          });
        });
      } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: "Verification failed" });
      }
    },
  );

  // Resend verification code (supports both endpoint names)
  const resendCodeHandler = async (req: any, res: any) => {
    try {
      const { email, type } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const codeType = type || "signup";

      // Create new verification code
      const verificationCode = await storage.createVerificationCode(
        normalizedEmail,
        codeType,
      );

      // Send verification email
      const emailSent = await sendVerificationEmail(
        normalizedEmail,
        verificationCode.code,
        codeType as any,
      );

      if (!emailSent) {
        return res
          .status(500)
          .json({ error: "Failed to send verification email" });
      }

      res.json({ success: true, message: "Verification code sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification code" });
    }
  };

  app.post("/api/auth/resend-code", authLimiter, resendCodeHandler);
  app.post("/api/auth/resend-verification", authLimiter, resendCodeHandler);

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      // Normalize email for consistent lookup
      const normalizedEmail = email.toLowerCase().trim();

      const user = await storage.getUserByEmail(normalizedEmail);
      const clientIp = getClientIp(req);
      const userAgent = req.headers["user-agent"] || null;

      if (!user) {
        // Log failed login attempt
        storage
          .createSecurityAuditLog({
            userId: null,
            eventType: "login_failed",
            ipAddress: clientIp,
            userAgent,
            outcome: "failure",
            details: `Failed login attempt for: ${normalizedEmail}`,
          })
          .catch((err) => console.warn("Failed to log security event:", err));
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValid = await verifyPassword(user.password, password);
      if (!isValid) {
        // Log failed login attempt
        storage
          .createSecurityAuditLog({
            userId: user.id,
            eventType: "login_failed",
            ipAddress: clientIp,
            userAgent,
            outcome: "failure",
            details: "Invalid password",
          })
          .catch((err) => console.warn("Failed to log security event:", err));
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Create verification code and send
        const verificationCode = await storage.createVerificationCode(
          normalizedEmail,
          "login",
        );

        // Store pending 2FA login
        pending2FALogins.set(normalizedEmail, {
          userId: user.id,
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        });

        // Send verification email
        await sendVerificationEmail(
          normalizedEmail,
          verificationCode.code,
          "login",
        );

        return res.json({
          requires2FA: true,
          email: normalizedEmail,
          message: "2FA code sent to your email",
        });
      }

      // No 2FA - proceed with login
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Session error" });
        }
        req.session.userId = user.id;

        // Create login session record
        storage
          .createLoginSession({
            userId: user.id,
            sessionId: req.sessionID,
            ipAddress: clientIp,
            userAgent,
            city: null,
            region: null,
            country: null,
          })
          .catch((err) =>
            console.error("Failed to create login session:", err),
          );

        // Log successful login (CASA Q52)
        storage
          .createSecurityAuditLog({
            userId: user.id,
            eventType: "login",
            ipAddress: clientIp,
            userAgent,
            outcome: "success",
            details: "Successful login without 2FA",
          })
          .catch((err) => console.warn("Failed to log security event:", err));

        res.json({
          user: {
            id: user.id,
            email: user.email,
            plan: user.plan,
            onboardingCompleted: user.onboardingCompleted,
            emailVerified: user.emailVerified,
            twoFactorEnabled: user.twoFactorEnabled,
          },
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Verify 2FA code and complete login
  app.post("/api/auth/verify-2fa", twoFactorLimiter, async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res
          .status(400)
          .json({ error: "Email and verification code are required" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check pending 2FA login exists
      const pending = pending2FALogins.get(normalizedEmail);
      if (!pending || pending.expiresAt < Date.now()) {
        pending2FALogins.delete(normalizedEmail);
        return res
          .status(400)
          .json({ error: "Login session expired. Please try again." });
      }

      // Verify code
      const verificationCode = await storage.getVerificationCode(
        normalizedEmail,
        code,
        "login",
      );
      if (!verificationCode) {
        return res
          .status(400)
          .json({ error: "Invalid or expired verification code" });
      }

      // Mark code as used
      await storage.markVerificationCodeUsed(verificationCode.id);

      // Get user
      const user = await storage.getUser(pending.userId);
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      // Clean up pending 2FA
      pending2FALogins.delete(normalizedEmail);

      // Create session
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Session error" });
        }
        req.session.userId = user.id;

        // Create login session record
        const clientIp = getClientIp(req);
        storage
          .createLoginSession({
            userId: user.id,
            sessionId: req.sessionID,
            ipAddress: clientIp,
            userAgent: req.headers["user-agent"] || null,
            city: null,
            region: null,
            country: null,
          })
          .catch((err) =>
            console.error("Failed to create login session:", err),
          );

        res.json({
          user: {
            id: user.id,
            email: user.email,
            plan: user.plan,
            onboardingCompleted: user.onboardingCompleted,
            emailVerified: user.emailVerified,
            twoFactorEnabled: user.twoFactorEnabled,
          },
        });
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const sessionId = req.sessionID;
    const userId = req.session.userId;

    // Delete login session record
    if (userId && sessionId) {
      await storage
        .deleteLoginSession(sessionId)
        .catch((err) => console.error("Failed to delete login session:", err));
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // ========== Mobile JWT Auth Endpoints ==========

  app.post("/api/auth/mobile/login", authLimiter, async (req, res) => {
    try {
      const { email, password, deviceInfo } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);
      const clientIp = getClientIp(req);
      const userAgent = req.headers["user-agent"] || null;

      if (!user) {
        storage.createSecurityAuditLog({
          userId: null, eventType: "login_failed", ipAddress: clientIp,
          userAgent, outcome: "failure", details: `Mobile login failed for: ${normalizedEmail}`,
        }).catch(() => {});
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValid = await verifyPassword(user.password, password);
      if (!isValid) {
        storage.createSecurityAuditLog({
          userId: user.id, eventType: "login_failed", ipAddress: clientIp,
          userAgent, outcome: "failure", details: "Mobile login: invalid password",
        }).catch(() => {});
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (user.twoFactorEnabled) {
        const verificationCode = await storage.createVerificationCode(normalizedEmail, "login");
        await sendVerificationEmail(normalizedEmail, verificationCode.code, "login");

        const tempTokenId = randomBytes(32).toString("hex");
        pending2FALogins.set(`mobile_${tempTokenId}`, {
          userId: user.id,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });

        return res.json({
          requires2FA: true,
          tempToken: tempTokenId,
          email: normalizedEmail,
          message: "2FA code sent to your email",
        });
      }

      const accessToken = signAccessToken(user.id);
      const refreshToken = signRefreshToken(user.id);
      const expiresAt = getRefreshTokenExpiresAt();

      await storage.createRefreshToken(user.id, hashToken(refreshToken), expiresAt, deviceInfo || userAgent || undefined);

      storage.createSecurityAuditLog({
        userId: user.id, eventType: "login", ipAddress: clientIp,
        userAgent, outcome: "success", details: "Mobile JWT login",
      }).catch(() => {});

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          plan: user.plan,
          onboardingCompleted: user.onboardingCompleted,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error) {
      console.error("Mobile login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/mobile/register", authLimiter, async (req, res) => {
    try {
      const { email, password, referralCode } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPw = await hashPassword(password);
      const verificationCode = await storage.createVerificationCode(normalizedEmail, "signup");

      pendingRegistrations.set(normalizedEmail, {
        email: normalizedEmail,
        hashedPassword: hashedPw,
        expiresAt: Date.now() + 10 * 60 * 1000,
        referralCode: referralCode || undefined,
      });

      const emailSent = await sendVerificationEmail(normalizedEmail, verificationCode.code, "signup");
      if (!emailSent) {
        pendingRegistrations.delete(normalizedEmail);
        return res.status(500).json({ error: "Failed to send verification email. Please try again." });
      }

      res.json({
        requiresVerification: true,
        email: normalizedEmail,
        message: "Verification code sent to your email",
      });
    } catch (error) {
      console.error("Mobile registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/mobile/verify-registration", twoFactorLimiter, async (req, res) => {
    try {
      const { email, code, deviceInfo } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: "Email and verification code are required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const pending = pendingRegistrations.get(normalizedEmail);
      if (!pending || pending.expiresAt < Date.now()) {
        pendingRegistrations.delete(normalizedEmail);
        return res.status(400).json({ error: "Registration expired. Please start again." });
      }

      const verificationCode = await storage.getVerificationCode(normalizedEmail, code, "signup");
      if (!verificationCode) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }

      await storage.markVerificationCodeUsed(verificationCode.id);

      const user = await storage.createUser({
        email: normalizedEmail,
        password: pending.hashedPassword,
      });
      await storage.updateUser(user.id, { emailVerified: true });

      if (pending.referralCode) {
        try {
          const referrer = await storage.getUserByReferralCode(pending.referralCode);
          if (referrer && referrer.id !== user.id) {
            await storage.createReferral(referrer.id, user.id);
            await storage.updateUser(user.id, { referredByUserId: referrer.id });
          }
        } catch (refErr) {
          console.error("Error processing referral:", refErr);
        }
      }

      pendingRegistrations.delete(normalizedEmail);

      await storage.createActivityLog(user.id, normalizedEmail, "signup", "New user registered via mobile app");

      const accessToken = signAccessToken(user.id);
      const refreshToken = signRefreshToken(user.id);
      const expiresAt = getRefreshTokenExpiresAt();

      await storage.createRefreshToken(user.id, hashToken(refreshToken), expiresAt, deviceInfo || req.headers["user-agent"] || undefined);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          plan: user.plan,
          onboardingCompleted: user.onboardingCompleted,
          emailVerified: true,
          twoFactorEnabled: false,
        },
      });
    } catch (error) {
      console.error("Mobile verify-registration error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/mobile/verify-2fa", twoFactorLimiter, async (req, res) => {
    try {
      const { tempToken, code, deviceInfo } = req.body;

      if (!tempToken || !code) {
        return res.status(400).json({ error: "Temp token and verification code are required" });
      }

      const pending = pending2FALogins.get(`mobile_${tempToken}`);
      if (!pending || pending.expiresAt < Date.now()) {
        pending2FALogins.delete(`mobile_${tempToken}`);
        return res.status(400).json({ error: "Login session expired. Please try again." });
      }

      const user = await storage.getUser(pending.userId);
      if (!user) {
        pending2FALogins.delete(`mobile_${tempToken}`);
        return res.status(400).json({ error: "User not found" });
      }

      const boundEmail = user.email.toLowerCase().trim();

      const verificationCode = await storage.getVerificationCode(boundEmail, code, "login");
      if (!verificationCode) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }

      await storage.markVerificationCodeUsed(verificationCode.id);

      pending2FALogins.delete(`mobile_${tempToken}`);

      const accessToken = signAccessToken(user.id);
      const refreshToken = signRefreshToken(user.id);
      const expiresAt = getRefreshTokenExpiresAt();

      await storage.createRefreshToken(user.id, hashToken(refreshToken), expiresAt, deviceInfo || req.headers["user-agent"] || undefined);

      const clientIp = getClientIp(req);
      storage.createSecurityAuditLog({
        userId: user.id, eventType: "login", ipAddress: clientIp,
        userAgent: req.headers["user-agent"] || null, outcome: "success",
        details: "Mobile JWT login with 2FA",
      }).catch(() => {});

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          plan: user.plan,
          onboardingCompleted: user.onboardingCompleted,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error) {
      console.error("Mobile 2FA verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/mobile/refresh", async (req, res) => {
    try {
      const { refreshToken: oldRefreshToken } = req.body;

      if (!oldRefreshToken) {
        return res.status(400).json({ error: "Refresh token is required" });
      }

      const payload = verifyRefreshToken(oldRefreshToken);
      if (!payload) {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }

      const oldTokenHash = hashToken(oldRefreshToken);
      const storedToken = await storage.getRefreshTokenByHash(oldTokenHash);

      if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
        if (storedToken && !storedToken.revoked) {
          await storage.revokeAllUserRefreshTokens(payload.userId);
        }
        return res.status(401).json({ error: "Refresh token revoked or expired" });
      }

      await storage.revokeRefreshToken(oldTokenHash);

      const newAccessToken = signAccessToken(payload.userId);
      const newRefreshToken = signRefreshToken(payload.userId);
      const expiresAt = getRefreshTokenExpiresAt();

      await storage.createRefreshToken(payload.userId, hashToken(newRefreshToken), expiresAt, storedToken.deviceInfo || undefined);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ error: "Token refresh failed" });
    }
  });

  app.post("/api/auth/mobile/logout", async (req, res) => {
    try {
      const { refreshToken: tokenToRevoke } = req.body;

      if (tokenToRevoke) {
        const tokenHash = hashToken(tokenToRevoke);
        await storage.revokeRefreshToken(tokenHash);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Mobile logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.get("/api/mobile/info", (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
    const baseUrl = `${protocol}://${host}`;

    res.json({
      apiVersion: "1.0.0",
      appName: "MyDraft",
      baseUrl,
      authMethods: ["jwt"],
      endpoints: {
        login: "/api/auth/mobile/login",
        register: "/api/auth/mobile/register",
        verifyRegistration: "/api/auth/mobile/verify-registration",
        verify2FA: "/api/auth/mobile/verify-2fa",
        refresh: "/api/auth/mobile/refresh",
        logout: "/api/auth/mobile/logout",
        resendCode: "/api/auth/resend-code",
      },
    });
  });

  // ========== End Mobile JWT Auth Endpoints ==========

  app.post("/api/auth/forgot-password", passwordResetLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);

      if (!user) {
        return res.json({ message: "If an account with that email exists, we've sent a password reset link." });
      }

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await storage.createPasswordResetToken(user.id, token, expiresAt);

      const baseUrl = process.env.APP_BASE_URL
        || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : `https://${req.headers.host || "localhost:5000"}`);
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await sendPasswordResetEmail(normalizedEmail, resetUrl);

      return res.json({ message: "If an account with that email exists, we've sent a password reset link." });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.json({ message: "If an account with that email exists, we've sent a password reset link." });
    }
  });

  app.post("/api/auth/reset-password", passwordResetLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Invalid reset link" });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUser(resetToken.userId, { password: hashedPassword });
      await storage.markPasswordResetTokenUsed(token);
      await storage.invalidatePasswordResetTokens(resetToken.userId);
      await storage.deleteAllUserSessions(resetToken.userId).catch(() => {});
      await storage.revokeAllUserRefreshTokens(resetToken.userId).catch(() => {});

      return res.json({ message: "Password has been reset successfully. You can now sign in." });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/auth/validate-reset-token", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ valid: false });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
        return res.json({ valid: false });
      }

      return res.json({ valid: true });
    } catch (error) {
      return res.json({ valid: false });
    }
  });

  // Linked accounts API (account switching)
  app.get("/api/auth/linked-accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const linkedAccounts = await storage.getLinkedAccounts(userId);

      // Also get current user info
      const currentUser = await storage.getUser(userId);

      res.json({
        linkedAccounts,
        currentUser: currentUser
          ? {
              id: currentUser.id,
              email: currentUser.email,
              displayName: currentUser.displayName,
              plan: currentUser.plan,
            }
          : null,
      });
    } catch (error) {
      console.error("Failed to get linked accounts:", error);
      res.status(500).json({ error: "Failed to get linked accounts" });
    }
  });

  app.post("/api/auth/link-account", requireAuth, async (req, res) => {
    try {
      const primaryUserId = req.session.userId!;
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Find the account to link
      const linkedUser = await storage.getUserByEmail(normalizedEmail);
      if (!linkedUser) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Verify password
      const isValid = await verifyPassword(linkedUser.password, password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid password" });
      }

      // Check if already linked
      const alreadyLinked = await storage.isAccountLinked(
        primaryUserId,
        linkedUser.id,
      );
      if (alreadyLinked) {
        return res.status(400).json({ error: "Account already linked" });
      }

      // Can't link to self
      if (linkedUser.id === primaryUserId) {
        return res
          .status(400)
          .json({ error: "Cannot link to your own account" });
      }

      // Add linked account
      const linkedAccount = await storage.addLinkedAccount(
        primaryUserId,
        linkedUser.id,
        linkedUser.email,
        linkedUser.displayName || undefined,
        linkedUser.plan || undefined,
      );

      res.json({ success: true, linkedAccount });
    } catch (error) {
      console.error("Failed to link account:", error);
      res.status(500).json({ error: "Failed to link account" });
    }
  });

  app.post("/api/auth/switch-account", requireAuth, async (req, res) => {
    try {
      const currentUserId = req.session.userId!;
      const { targetUserId } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ error: "Target user ID required" });
      }

      // Check if this account is linked (from either direction)
      const isLinkedFromCurrent = await storage.isAccountLinked(
        currentUserId,
        targetUserId,
      );
      const isLinkedFromTarget = await storage.isAccountLinked(
        targetUserId,
        currentUserId,
      );

      if (!isLinkedFromCurrent && !isLinkedFromTarget) {
        return res.status(403).json({ error: "Account not linked" });
      }

      // Get target user
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: "Target account not found" });
      }

      // Switch session to target user (skip 2FA for linked accounts)
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Session error" });
        }

        req.session.userId = targetUser.id;

        // Create login session record
        const clientIp = getClientIp(req);
        const userAgent = req.headers["user-agent"] || null;

        storage
          .createLoginSession({
            userId: targetUser.id,
            sessionId: req.sessionID,
            ipAddress: clientIp,
            userAgent,
            city: null,
            region: null,
            country: null,
          })
          .catch((err) =>
            console.error("Failed to create login session:", err),
          );

        // Log account switch
        storage
          .createSecurityAuditLog({
            userId: targetUser.id,
            eventType: "account_switch",
            ipAddress: clientIp,
            userAgent,
            outcome: "success",
            details: `Switched from account ${currentUserId}`,
          })
          .catch((err) => console.warn("Failed to log security event:", err));

        res.json({
          success: true,
          user: {
            id: targetUser.id,
            email: targetUser.email,
            displayName: targetUser.displayName,
            plan: targetUser.plan,
            onboardingCompleted: targetUser.onboardingCompleted,
          },
        });
      });
    } catch (error) {
      console.error("Failed to switch account:", error);
      res.status(500).json({ error: "Failed to switch account" });
    }
  });

  app.delete(
    "/api/auth/linked-accounts/:linkedUserId",
    requireAuth,
    async (req, res) => {
      try {
        const primaryUserId = req.session.userId!;
        const { linkedUserId } = req.params;

        await storage.removeLinkedAccount(primaryUserId, linkedUserId);
        res.json({ success: true });
      } catch (error) {
        console.error("Failed to remove linked account:", error);
        res.status(500).json({ error: "Failed to remove linked account" });
      }
    },
  );

  app.post("/api/support/contact", authLimiter, async (req, res) => {
    try {
      const { name, email, message, subject } = req.body;

      if (!name || !email || !message) {
        return res
          .status(400)
          .json({ error: "Name, email, and message are required" });
      }

      if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof message !== "string"
      ) {
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

      const supportAddr = "support@mydraft.io";
      if (process.env.RESEND_API_KEY) {
        try {
          const { sendSecurityContactEmail } = await import("./email");
          await sendSecurityContactEmail(supportAddr, {
            name,
            email,
            message,
            subject: typeof subject === "string" ? subject : "General Inquiry",
          });
        } catch (emailErr) {
          console.error("Failed to send contact notification email:", emailErr);
        }
      }

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
        return res
          .status(400)
          .json({ error: "Feedback type and message are required" });
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
    const userId = getUserId(req);
    if (!userId) {
      return res.json({ user: null });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.json({ user: null });
    }

    const emailAccount = await storage.getEmailAccount(user.id);

    const now = new Date();
    const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const trialActive = trialEndsAt !== null && trialEndsAt > now && !user.stripeSubscriptionId;
    const trialExpired = trialEndsAt !== null && trialEndsAt <= now && !user.stripeSubscriptionId;
    const trialDaysRemaining = trialActive
      ? Math.max(0, Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    let effectivePlan = user.plan;
    if (trialExpired && !user.stripeSubscriptionId) {
      effectivePlan = "free";
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        plan: effectivePlan,
        onboardingCompleted: user.onboardingCompleted,
        aiPreferences: user.aiPreferences,
        emailConnected: !!emailAccount,
        connectedEmail: emailAccount?.email || null,
        connectedProvider: emailAccount?.provider || null,
        createdAt: user.createdAt,
        emailSignature: user.emailSignature,
        signatureEnabled: user.signatureEnabled,
        trialActive,
        trialExpired,
        trialDaysRemaining,
        trialEndsAt: user.trialEndsAt,
        hasUsedTrial: user.hasUsedTrial,
      },
    });
  });

  // Update user profile (display name and avatar)
  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { displayName, avatarUrl } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (displayName !== undefined) {
        if (typeof displayName !== "string") {
          return res.status(400).json({ error: "Display name must be a string" });
        }
        if (displayName.length > 30) {
          return res.status(400).json({ error: "Display name must be 30 characters or less" });
        }
      }

      const updatedUser = await storage.updateUser(userId, {
        displayName: displayName !== undefined ? String(displayName || "").slice(0, 30) : user.displayName,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
      });

      res.json({
        success: true,
        user: {
          displayName: updatedUser?.displayName,
          avatarUrl: updatedUser?.avatarUrl,
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Plan selection endpoint - ONLY allows selecting free plan or requesting upgrade
  // Actual paid plan activation happens through Stripe webhooks after payment
  app.post("/api/user/plan", requireAuth, async (req, res) => {
    try {
      const { plan, startTrial } = req.body;
      if (!plan || !["free", "pro", "premium"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const oldPlan = currentUser.plan || "free";

      if (startTrial && (plan === "pro" || plan === "premium")) {
        if (currentUser.hasUsedTrial) {
          return res.status(403).json({
            error: "You've already used your free trial. Please subscribe to continue with a paid plan.",
            alreadyUsedTrial: true,
          });
        }

        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const user = await storage.updateUser(req.session.userId!, {
          plan: plan as any,
          trialEndsAt,
          hasUsedTrial: true,
        });

        await storage.createActivityLog(
          user!.id,
          user!.email,
          "trial_started",
          `Started 14-day free trial of ${plan === "premium" ? "Business" : "Pro"} plan`,
        );

        return res.json({
          user: { id: user!.id, email: user!.email, plan: user!.plan },
          trialEndsAt: trialEndsAt.toISOString(),
        });
      }

      if (plan !== "free" && plan !== oldPlan && !startTrial) {
        return res.status(403).json({
          error: "Plan upgrades require payment. Please use the checkout process.",
          requiresPayment: true,
          requestedPlan: plan,
        });
      }

      if (plan === "free" && oldPlan !== "free") {
        if (currentUser?.stripeSubscriptionId) {
          try {
            const { getUncachableStripeClient } = await import("./stripeClient");
            const stripe = await getUncachableStripeClient();
            await stripe.subscriptions.cancel(currentUser.stripeSubscriptionId);
          } catch (stripeErr: any) {
            console.error("Error canceling Stripe subscription during plan downgrade:", stripeErr);
            return res.status(500).json({
              error: "Failed to cancel your subscription. Please try again or contact support.",
            });
          }
        }

        const user = await storage.updateUser(req.session.userId!, {
          plan: "free",
          stripeSubscriptionId: null,
          trialEndsAt: null,
        });

        await storage.createActivityLog(
          user!.id,
          user!.email,
          "plan_downgrade",
          `Plan cancelled: changed from ${oldPlan} to free, Stripe subscription canceled`,
        );

        return res.json({
          user: { id: user!.id, email: user!.email, plan: user!.plan },
        });
      }

      if (plan === "free") {
        const user = await storage.updateUser(req.session.userId!, {
          plan: "free",
          trialEndsAt: null,
        });
        return res.json({
          user: { id: user!.id, email: user!.email, plan: user!.plan },
        });
      }

      res.json({
        user: {
          id: currentUser.id,
          email: currentUser.email,
          plan: currentUser.plan,
        },
      });
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
        onboardingCompleted: true,
      });
      res.json({
        user: {
          id: user!.id,
          email: user!.email,
          onboardingCompleted: user!.onboardingCompleted,
        },
      });
    } catch (error) {
      console.error("Onboarding error:", error);
      res.status(500).json({ error: "Failed to save onboarding" });
    }
  });

  const checkTrialExpiries = async () => {
    try {
      const result = await db.execute(sql`
        SELECT id, email, trial_ends_at, plan FROM users 
        WHERE trial_ends_at IS NOT NULL 
        AND trial_ends_at <= NOW() 
        AND stripe_subscription_id IS NULL
        AND id NOT IN (
          SELECT user_id FROM activity_logs WHERE action_type = 'trial_expired_email_sent'
        )
      `);
      const expiredUsers = result.rows || [];
      for (const user of expiredUsers) {
        try {
          const baseUrl = process.env.APP_BASE_URL || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;
          const sent = await sendTrialEndedEmail(user.email as string, `${baseUrl}/trial-expired`);
          if (sent) {
            await storage.createActivityLog(
              user.id as string,
              user.email as string,
              "trial_expired_email_sent",
              "Trial ended email sent automatically",
            );
            console.log(`Trial expired email sent to ${user.email}`);
          } else {
            console.error(`Failed to send trial expired email to ${user.email} — will retry next cycle`);
          }
        } catch (emailErr) {
          console.error(`Failed to send trial expired email to ${user.email}:`, emailErr);
        }
      }
    } catch (err) {
      console.error("Error checking trial expiries:", err);
    }
  };
  setInterval(checkTrialExpiries, 60 * 60 * 1000);
  setTimeout(checkTrialExpiries, 10000);

  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const emailAccount = await storage.getEmailAccount(user.id);
      res.json({
        email: user.email,
        plan: user.plan,
        aiPreferences: user.aiPreferences,
        emailSignature: user.emailSignature,
        signatureEnabled: user.signatureEnabled,
        connectedEmail: emailAccount
          ? { email: emailAccount.email, provider: emailAccount.provider }
          : null,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      });
    } catch (error) {
      console.error("Settings fetch error:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Get security settings (2FA status + sessions)
  app.get("/api/settings/security", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const sessions = await storage.getLoginSessions(req.session.userId!);
      const currentSessionId = req.sessionID;

      res.json({
        twoFactorEnabled: user.twoFactorEnabled,
        sessions: sessions.map((s) => ({
          id: s.id,
          ipAddress: s.ipAddress,
          city: s.city,
          region: s.region,
          country: s.country,
          userAgent: s.userAgent,
          lastActiveAt: s.lastActiveAt,
          createdAt: s.createdAt,
          isCurrent: s.sessionId === currentSessionId,
        })),
      });
    } catch (error) {
      console.error("Security settings fetch error:", error);
      res.status(500).json({ error: "Failed to fetch security settings" });
    }
  });

  // Toggle 2FA on/off
  app.post("/api/settings/2fa/toggle", requireAuth, async (req, res) => {
    try {
      const { enable, code } = req.body;
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If disabling 2FA, require verification code
      if (!enable && user.twoFactorEnabled) {
        if (!code) {
          // Send verification code
          const verificationCode = await storage.createVerificationCode(
            user.email,
            "action",
          );
          await sendVerificationEmail(
            user.email,
            verificationCode.code,
            "action",
          );
          return res.json({
            requiresVerification: true,
            message: "Verification code sent",
          });
        }

        // Verify code
        const verificationCode = await storage.getVerificationCode(
          user.email,
          code,
          "action",
        );
        if (!verificationCode) {
          return res
            .status(400)
            .json({ error: "Invalid or expired verification code" });
        }
        await storage.markVerificationCodeUsed(verificationCode.id);
      }

      // Update 2FA setting
      await storage.updateUser(user.id, { twoFactorEnabled: enable });

      res.json({
        success: true,
        twoFactorEnabled: enable,
        message: enable
          ? "Two-factor authentication enabled"
          : "Two-factor authentication disabled",
      });
    } catch (error) {
      console.error("2FA toggle error:", error);
      res.status(500).json({ error: "Failed to update 2FA settings" });
    }
  });

  // Get active login sessions
  app.get("/api/settings/sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getLoginSessions(req.session.userId!);
      const currentSessionId = req.sessionID;

      res.json({
        sessions: sessions.map((s) => ({
          id: s.id,
          ipAddress: s.ipAddress,
          city: s.city,
          region: s.region,
          country: s.country,
          userAgent: s.userAgent,
          lastActiveAt: s.lastActiveAt,
          createdAt: s.createdAt,
          isCurrent: s.sessionId === currentSessionId,
        })),
      });
    } catch (error) {
      console.error("Sessions fetch error:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Logout all other devices (requires 2FA if enabled)
  app.post(
    "/api/settings/sessions/logout-all",
    requireAuth,
    async (req, res) => {
      try {
        const { code } = req.body;
        const user = await storage.getUser(req.session.userId!);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // If 2FA is enabled, require verification
        if (user.twoFactorEnabled) {
          if (!code) {
            // Send verification code
            const verificationCode = await storage.createVerificationCode(
              user.email,
              "action",
            );
            await sendVerificationEmail(
              user.email,
              verificationCode.code,
              "action",
            );
            return res.json({
              requiresVerification: true,
              message: "Verification code sent",
            });
          }

          // Verify code
          const verificationCode = await storage.getVerificationCode(
            user.email,
            code,
            "action",
          );
          if (!verificationCode) {
            return res
              .status(400)
              .json({ error: "Invalid or expired verification code" });
          }
          await storage.markVerificationCodeUsed(verificationCode.id);
        }

        // Delete all sessions except current
        await storage.deleteAllUserSessions(user.id, req.sessionID);

        res.json({ success: true, message: "Logged out of all other devices" });
      } catch (error) {
        console.error("Logout all error:", error);
        res.status(500).json({ error: "Failed to logout other devices" });
      }
    },
  );

  // Send 2FA code for sensitive actions
  app.post("/api/auth/send-action-code", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.twoFactorEnabled) {
        return res.json({ required: false });
      }

      const verificationCode = await storage.createVerificationCode(
        user.email,
        "action",
      );
      await sendVerificationEmail(user.email, verificationCode.code, "action");

      res.json({ success: true, message: "Verification code sent" });
    } catch (error) {
      console.error("Send action code error:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  app.put(
    "/api/settings/password",
    requireAuth,
    passwordResetLimiter,
    async (req, res) => {
      try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
          return res
            .status(400)
            .json({ error: "Current and new password are required" });
        }
        if (newPassword.length < 8) {
          return res
            .status(400)
            .json({ error: "Password must be at least 8 characters" });
        }
        const user = await storage.getUser(req.session.userId!);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        const isValid = await verifyPassword(user.password, currentPassword);
        if (!isValid) {
          return res
            .status(400)
            .json({ error: "Current password is incorrect" });
        }
        const hashedPassword = await hashPassword(newPassword);
        await storage.updateUser(req.session.userId!, {
          password: hashedPassword,
        });

        // Security: Terminate all other sessions after password change (CASA Q27)
        const currentSessionId = req.sessionID;
        await storage.deleteAllUserSessions(
          req.session.userId!,
          currentSessionId,
        );

        // Clear any pending 2FA logins for this user (CASA Q27 extended)
        for (const [key, data] of pending2FALogins.entries()) {
          if (data.userId === req.session.userId!) {
            pending2FALogins.delete(key);
          }
        }

        // Also invalidate express-sessions in database (except current)
        try {
          await db.execute(sql`
          DELETE FROM user_sessions 
          WHERE sess->>'userId' = ${req.session.userId!} 
          AND sid != ${currentSessionId}
        `);
        } catch (err) {
          console.warn("Could not clear express sessions:", err);
        }

        // Log password change event (CASA Q52)
        storage
          .createSecurityAuditLog({
            userId: req.session.userId!,
            eventType: "password_change",
            ipAddress: getClientIp(req),
            userAgent: req.headers["user-agent"] || null,
            outcome: "success",
            details: "Password changed, all other sessions terminated",
          })
          .catch((err) => console.warn("Failed to log security event:", err));

        res.json({ success: true, sessionsTerminated: true });
      } catch (error) {
        console.error("Password change error:", error);
        res.status(500).json({ error: "Failed to change password" });
      }
    },
  );

  app.put("/api/settings/signature", requireAuth, async (req, res) => {
    try {
      const { emailSignature, signatureEnabled } = req.body;
      await storage.updateUser(req.session.userId!, {
        emailSignature: emailSignature ?? null,
        signatureEnabled: signatureEnabled ?? false,
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
      await storage.updateUser(req.session.userId!, {
        aiPreferences: parsed.data,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("AI preferences update error:", error);
      res.status(500).json({ error: "Failed to update AI preferences" });
    }
  });

  app.get("/api/writing-style", requireAuth, async (req, res) => {
    try {
      const userPlan = await getUserPlan(req.session.userId!);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({
          error: "Plan upgrade required",
          requiredPlan: "pro",
          currentPlan: userPlan,
        });
      }

      const style = await storage.getLearnedWritingStyle(req.session.userId!);
      const sampleCount = await storage.getWritingSampleCount(
        req.session.userId!,
      );
      res.json({
        style: style || null,
        sampleCount,
        hasLearnedStyle: !!(style && style.samplesAnalyzed > 0),
      });
    } catch (error) {
      console.error("Error fetching writing style:", error);
      res.status(500).json({ error: "Failed to fetch writing style" });
    }
  });

  app.post("/api/writing-style/analyze", requireAuth, async (req, res) => {
    try {
      const userPlan = await getUserPlan(req.session.userId!);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({
          error: "Plan upgrade required",
          requiredPlan: "pro",
          currentPlan: userPlan,
        });
      }

      const samples = await storage.getWritingSamples(req.session.userId!, 20);

      if (samples.length < 3) {
        return res.status(400).json({
          error: "Not enough writing samples",
          message: "Send at least 3 emails to enable personalized AI drafts",
          sampleCount: samples.length,
          required: 3,
        });
      }

      const sampleTexts = samples
        .map((s) => s.originalContent)
        .join("\n\n---\n\n");

      const prompt = `Analyze these email samples and extract the user's unique writing style. Return a JSON object with:
1. "styleAnalysis": A 2-3 sentence description of their overall writing style
2. "commonPhrases": Array of 5-10 phrases or expressions they commonly use
3. "greetingPatterns": Array of greetings they typically use (e.g., "Hi", "Hey", "Hello")
4. "signOffPatterns": Array of sign-offs they typically use (e.g., "Best", "Thanks", "Cheers")
5. "toneDescription": One word describing their typical tone (professional, casual, friendly, formal, etc.)
6. "avgSentenceLength": Estimated average sentence length (short/medium/long)

Email samples:
${sampleTexts}

Return ONLY valid JSON, no other text.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at analyzing writing styles. Extract patterns from email samples to help personalize future AI-generated drafts.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const responseText = response.choices[0]?.message?.content || "{}";

      let parsed;
      try {
        parsed = JSON.parse(
          responseText.replace(/```json\n?|\n?```/g, "").trim(),
        );
      } catch (parseError) {
        console.error("Failed to parse style analysis JSON:", parseError);
        return res.status(422).json({
          error: "Failed to analyze writing style",
          message: "AI returned invalid format. Please try again.",
        });
      }

      const learnedStyle = await storage.upsertLearnedWritingStyle(
        req.session.userId!,
        {
          styleAnalysis: parsed.styleAnalysis || "",
          commonPhrases: parsed.commonPhrases || [],
          greetingPatterns: parsed.greetingPatterns || [],
          signOffPatterns: parsed.signOffPatterns || [],
          toneDescription: parsed.toneDescription,
          avgSentenceLength: parsed.avgSentenceLength,
          samplesAnalyzed: samples.length,
        },
      );

      res.json({
        success: true,
        style: learnedStyle,
        message: `Analyzed ${samples.length} emails to learn your writing style`,
      });
    } catch (error) {
      console.error("Error analyzing writing style:", error);
      res.status(500).json({ error: "Failed to analyze writing style" });
    }
  });

  app.delete("/api/user", requireAuth, async (req, res) => {
    try {
      await storage.deleteEmailAccount(req.session.userId!);
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

  app.get("/api/email/auth-url", requireAuth, async (req, res) => {
    try {
      const provider = req.query.provider as string;
      if (!provider || !["google", "microsoft"].includes(provider)) {
        return res
          .status(400)
          .json({ error: "Invalid provider. Use 'google' or 'microsoft'" });
      }

      cleanupExpiredStates();

      const stateToken = generateStateToken();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      pendingOAuthStates.set(stateToken, {
        userId: req.session.userId!,
        provider,
        expiresAt,
      });

      const redirectUri = getEmailRedirectUri(req, provider);
      const emailProvider = provider === "google" ? gmailProvider : microsoftProvider;
      const authUrl = emailProvider.getAuthUrl(redirectUri, stateToken);

      res.json({ url: authUrl });
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/email/detect-provider", requireAuth, async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      const detected = detectProvider(email);
      if (detected) {
        res.json({ detected: true, ...detected });
      } else {
        res.json({ detected: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to detect provider" });
    }
  });

  app.post("/api/email/connect-imap", requireAuth, async (req, res) => {
    try {
      const { email, password, imapHost, imapPort, smtpHost, smtpPort } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      let finalImapHost = imapHost;
      let finalImapPort = imapPort || 993;
      let finalSmtpHost = smtpHost;
      let finalSmtpPort = smtpPort || 465;

      if (!finalImapHost || !finalSmtpHost) {
        const detected = detectProvider(email);
        if (detected) {
          finalImapHost = finalImapHost || detected.imapHost;
          finalImapPort = imapPort || detected.imapPort;
          finalSmtpHost = finalSmtpHost || detected.smtpHost;
          finalSmtpPort = smtpPort || detected.smtpPort;
        } else {
          return res.status(400).json({ error: "Could not auto-detect server settings. Please provide IMAP and SMTP server details manually." });
        }
      }

      const imapHostValid = await validateHost(finalImapHost);
      if (!imapHostValid.valid) {
        return res.status(400).json({ error: `Invalid IMAP host: ${imapHostValid.error}` });
      }
      const smtpHostValid = await validateHost(finalSmtpHost);
      if (!smtpHostValid.valid) {
        return res.status(400).json({ error: `Invalid SMTP host: ${smtpHostValid.error}` });
      }

      const config = {
        imapHost: finalImapHost,
        imapPort: finalImapPort,
        smtpHost: finalSmtpHost,
        smtpPort: finalSmtpPort,
        email,
        password,
      };

      const imapTest = await testImapConnection(config);
      if (!imapTest.success) {
        return res.status(400).json({ error: `IMAP connection failed: ${imapTest.error}` });
      }

      const smtpTest = await testSmtpConnection(config);
      if (!smtpTest.success) {
        return res.status(400).json({ error: `SMTP connection failed: ${smtpTest.error}` });
      }

      const userId = req.session.userId!;
      const existingAccount = await storage.getEmailAccount(userId);

      const encryptedConfig = encryptImapConfig(config);

      const accountData = {
        provider: "imap" as const,
        email,
        accessToken: encryptedConfig,
        refreshToken: "imap",
        tokenExpiresAt: null,
        imapHost: finalImapHost,
        imapPort: finalImapPort,
        smtpHost: finalSmtpHost,
        smtpPort: finalSmtpPort,
      };

      if (existingAccount) {
        await storage.updateEmailAccount(userId, accountData);
      } else {
        await storage.createEmailAccount({ userId, ...accountData });
      }

      res.json({ connected: true, email, provider: "imap" });
    } catch (error: unknown) {
      console.error("IMAP connect error:", error);
      const errMsg = error instanceof Error ? error.message : "Failed to connect IMAP account";
      res.status(500).json({ error: errMsg });
    }
  });

  app.get("/api/auth/oauth/login", async (req, res) => {
    try {
      const provider = req.query.provider as string;
      if (!provider || !["google", "microsoft"].includes(provider)) {
        return res.status(400).json({ error: "Invalid provider" });
      }

      cleanupExpiredStates();

      const stateToken = generateStateToken();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const referralCode = req.query.ref as string | undefined;
      const platform = req.query.platform as string | undefined;
      const mobileRedirectUri = req.query.redirect_uri as string | undefined;

      if (platform === "mobile" && mobileRedirectUri) {
        const allowedSchemes = process.env.MOBILE_DEEP_LINK_SCHEMES?.split(",").map(s => s.trim()).filter(Boolean) || ["mydraft://"];
        const isAllowedScheme = allowedSchemes.some(scheme => mobileRedirectUri.startsWith(scheme));
        if (!isAllowedScheme) {
          return res.status(400).json({ error: "Invalid redirect URI scheme" });
        }
      }

      pendingOAuthLoginStates.set(stateToken, {
        provider,
        expiresAt,
        referralCode,
        platform,
        mobileRedirectUri,
      });

      const redirectUri = getEmailRedirectUri(req, provider);
      const emailProvider = provider === "google" ? gmailProvider : microsoftProvider;
      const authUrl = emailProvider.getAuthUrl(redirectUri, `login_${stateToken}`);

      res.json({ url: authUrl });
    } catch (error) {
      console.error("Error generating OAuth login URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      console.log("Google OAuth callback received:", JSON.stringify(req.query));

      const { code, state, error, error_description } = req.query;

      if (error) {
        console.error("OAuth error from provider:", error, error_description);
        return res.redirect(
          `/connect-email?error=${encodeURIComponent(String(error_description || error))}`,
        );
      }

      if (!code || typeof code !== "string") {
        console.error("Missing authorization code. Query params:", req.query);
        return res.status(400).send("Missing authorization code");
      }

      if (!state || typeof state !== "string") {
        console.error("Missing state token in OAuth callback");
        return res.redirect("/?error=invalid_state");
      }

      const isLoginFlow = String(state).startsWith("login_");

      if (isLoginFlow) {
        const actualState = String(state).replace("login_", "");
        const loginState = pendingOAuthLoginStates.get(actualState);
        if (!loginState || loginState.expiresAt < Date.now()) {
          pendingOAuthLoginStates.delete(actualState);
          return res.redirect("/login?error=session_expired");
        }
        pendingOAuthLoginStates.delete(actualState);

        const redirectUri = getEmailRedirectUri(req, "google");
        const tokenData = await gmailProvider.exchangeCode(code, redirectUri);
        const normalizedEmail = tokenData.email.toLowerCase().trim();

        let user = await storage.getUserByEmail(normalizedEmail);

        if (!user) {
          const randomPassword = randomBytes(32).toString("hex");
          const hashedPassword = await hashPassword(randomPassword);

          user = await storage.createUser({
            email: normalizedEmail,
            password: hashedPassword,
            emailVerified: true,
          });

          if (loginState.referralCode) {
            try {
              const referrer = await storage.getUserByReferralCode(loginState.referralCode);
              if (referrer && referrer.id !== user.id) {
                await storage.updateUser(user.id, { referredByUserId: referrer.id });
                await storage.createReferral(referrer.id, user.id);
              }
            } catch (e) {
              console.error("Referral linking failed:", e);
            }
          }
        }

        if (loginState.platform === "mobile" && loginState.mobileRedirectUri) {
          const accessToken = signAccessToken(user.id);
          const refreshToken = signRefreshToken(user.id);
          const expiresAt = getRefreshTokenExpiresAt();
          await storage.createRefreshToken(user.id, hashToken(refreshToken), expiresAt, "OAuth mobile login");

          const mobileUrl = new URL(loginState.mobileRedirectUri);
          mobileUrl.searchParams.set("access_token", accessToken);
          mobileUrl.searchParams.set("refresh_token", refreshToken);
          mobileUrl.searchParams.set("user_id", user.id);
          return res.redirect(mobileUrl.toString());
        }

        req.session.userId = user.id;

        if (!user.plan) {
          return res.redirect("/select-plan");
        } else if (!user.onboardingCompleted) {
          return res.redirect("/onboarding");
        }
        return res.redirect("/inbox");
      }

      const storedState = pendingOAuthStates.get(state as string);
      if (!storedState) {
        console.error("Unknown or expired state token");
        return res.redirect("/?error=invalid_state");
      }

      if (storedState.expiresAt < Date.now()) {
        pendingOAuthStates.delete(state as string);
        console.error("State token expired");
        return res.redirect("/?error=session_expired");
      }

      pendingOAuthStates.delete(state as string);

      const { userId } = storedState;
      const provider = "google";

      const redirectUri = getEmailRedirectUri(req, provider);
      const tokenData = await gmailProvider.exchangeCode(code, redirectUri);

      const normalizedEmail = tokenData.email.toLowerCase().trim();

      const existingAccount = await storage.getEmailAccount(userId);
      const currentUser = await storage.getUser(userId);

      if (existingAccount) {
        await storage.updateEmailAccount(userId, {
          provider,
          email: normalizedEmail,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt: tokenData.expiresAt,
        });
      } else {
        await storage.createEmailAccount({
          userId,
          provider,
          email: normalizedEmail,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt: tokenData.expiresAt,
        });

        await storage.createActivityLog(
          userId,
          currentUser?.email || normalizedEmail,
          "email_connected",
          `Connected ${provider} email: ${normalizedEmail}`,
        );

        try {
          const { sendWelcomeEmail } = await import("./email");
          await sendWelcomeEmail(normalizedEmail, currentUser?.email?.split("@")[0] || "");
        } catch (emailErr) { console.error("Failed to send welcome email:", emailErr); }
      }

      res.redirect("/inbox?connected=true");
    } catch (error) {
      console.error("Error in Google OAuth callback:", error);
      res.redirect("/connect-email?error=auth_failed");
    }
  });

  app.get("/api/auth/microsoft/callback", async (req, res) => {
    try {
      console.log("Microsoft OAuth callback received:", JSON.stringify(req.query));

      const { code, state, error, error_description } = req.query;

      if (error) {
        console.error("OAuth error from provider:", error, error_description);
        return res.redirect(
          `/connect-email?error=${encodeURIComponent(String(error_description || error))}`,
        );
      }

      if (!code || typeof code !== "string") {
        console.error("Missing authorization code. Query params:", req.query);
        return res.status(400).send("Missing authorization code");
      }

      if (!state || typeof state !== "string") {
        console.error("Missing state token in OAuth callback");
        return res.redirect("/?error=invalid_state");
      }

      const isLoginFlow = String(state).startsWith("login_");

      if (isLoginFlow) {
        const actualState = String(state).replace("login_", "");
        const loginState = pendingOAuthLoginStates.get(actualState);
        if (!loginState || loginState.expiresAt < Date.now()) {
          pendingOAuthLoginStates.delete(actualState);
          return res.redirect("/login?error=session_expired");
        }
        pendingOAuthLoginStates.delete(actualState);

        const redirectUri = getEmailRedirectUri(req, "microsoft");
        const tokenData = await microsoftProvider.exchangeCode(code, redirectUri);
        const normalizedEmail = tokenData.email.toLowerCase().trim();

        let user = await storage.getUserByEmail(normalizedEmail);

        if (!user) {
          const randomPassword = randomBytes(32).toString("hex");
          const hashedPassword = await hashPassword(randomPassword);

          user = await storage.createUser({
            email: normalizedEmail,
            password: hashedPassword,
            emailVerified: true,
          });

          if (loginState.referralCode) {
            try {
              const referrer = await storage.getUserByReferralCode(loginState.referralCode);
              if (referrer && referrer.id !== user.id) {
                await storage.updateUser(user.id, { referredByUserId: referrer.id });
                await storage.createReferral(referrer.id, user.id);
              }
            } catch (e) {
              console.error("Referral linking failed:", e);
            }
          }
        }

        if (loginState.platform === "mobile" && loginState.mobileRedirectUri) {
          const accessToken = signAccessToken(user.id);
          const refreshToken = signRefreshToken(user.id);
          const expiresAt = getRefreshTokenExpiresAt();
          await storage.createRefreshToken(user.id, hashToken(refreshToken), expiresAt, "OAuth mobile login");

          const mobileUrl = new URL(loginState.mobileRedirectUri);
          mobileUrl.searchParams.set("access_token", accessToken);
          mobileUrl.searchParams.set("refresh_token", refreshToken);
          mobileUrl.searchParams.set("user_id", user.id);
          return res.redirect(mobileUrl.toString());
        }

        req.session.userId = user.id;

        if (!user.plan) {
          return res.redirect("/select-plan");
        } else if (!user.onboardingCompleted) {
          return res.redirect("/onboarding");
        }
        return res.redirect("/inbox");
      }

      const storedState = pendingOAuthStates.get(state as string);
      if (!storedState) {
        console.error("Unknown or expired state token");
        return res.redirect("/?error=invalid_state");
      }

      if (storedState.expiresAt < Date.now()) {
        pendingOAuthStates.delete(state as string);
        console.error("State token expired");
        return res.redirect("/?error=session_expired");
      }

      pendingOAuthStates.delete(state as string);

      const { userId } = storedState;
      const provider = "microsoft";

      const redirectUri = getEmailRedirectUri(req, provider);
      const tokenData = await microsoftProvider.exchangeCode(code, redirectUri);

      const normalizedEmail = tokenData.email.toLowerCase().trim();

      const existingAccount = await storage.getEmailAccount(userId);
      const currentUser = await storage.getUser(userId);

      if (existingAccount) {
        await storage.updateEmailAccount(userId, {
          provider,
          email: normalizedEmail,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt: tokenData.expiresAt,
        });
      } else {
        await storage.createEmailAccount({
          userId,
          provider,
          email: normalizedEmail,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt: tokenData.expiresAt,
        });

        await storage.createActivityLog(
          userId,
          currentUser?.email || normalizedEmail,
          "email_connected",
          `Connected ${provider} email: ${normalizedEmail}`,
        );

        try {
          const { sendWelcomeEmail } = await import("./email");
          await sendWelcomeEmail(normalizedEmail, currentUser?.email?.split("@")[0] || "");
        } catch (emailErr) { console.error("Failed to send welcome email:", emailErr); }
      }

      res.redirect("/inbox?connected=true");
    } catch (error) {
      console.error("Error in Microsoft OAuth callback:", error);
      res.redirect("/connect-email?error=auth_failed");
    }
  });

  app.get("/api/email/status", requireAuth, async (req, res) => {
    try {
      const account = await storage.getEmailAccount(req.session.userId!);
      if (account) {
        res.json({ connected: true, email: account.email, provider: account.provider });
      } else {
        res.json({ connected: false });
      }
    } catch (error) {
      console.error("Error checking email status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  app.post("/api/email/disconnect", requireAuth, async (req, res) => {
    try {
      await storage.deleteEmailAccount(req.session.userId!);
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
      const useCached = req.query.cached === "true";
      const userId = req.session.userId!;
      const userIdNum = parseInt(userId, 10);

      const providerResult = await getProviderAndToken(userId);
      if (!providerResult) {
        return res.json([]);
      }

      if (useCached) {
        const cachedData = await storage.getCachedEmails(userIdNum);
        if (cachedData.length > 0) {
          const starredIds = await storage.getStarredEmailIds(userId);
          const starredSet = new Set(starredIds);
          const localStates = await storage.getAllLocalEmailStates(userId);

          const emails = cachedData.map((email) => {
            const localState = localStates.get(email.nylasId);
            return {
              ...email,
              isStarred: starredSet.has(email.nylasId),
              folder: localState?.folder || email.folder,
              isRead: localState?.isRead !== null && localState?.isRead !== undefined ? localState.isRead : email.isRead,
            };
          });
          return res.json(emails);
        }
      }

      let allMessages: any[] = [];

      const localStates = await storage.getAllLocalEmailStates(userId);

      if (allFolders) {
        const folders = ["inbox", "sent", "trash", "junk", "archived"] as const;
        const folderResults = await Promise.allSettled(
          folders.map(async (f) => {
            try {
              const messages = await providerResult.provider.getMessages(
                providerResult.accessToken,
                { folder: f },
              );
              return messages.map((m) => ({ ...m, folder: f }));
            } catch {
              return [];
            }
          }),
        );

        for (const result of folderResults) {
          if (result.status === "fulfilled") {
            allMessages.push(...result.value);
          }
        }

        const seen = new Set<string>();
        allMessages = allMessages.filter((msg) => {
          if (seen.has(msg.id)) return false;
          seen.add(msg.id);
          return true;
        });
      } else {
        const messages = await providerResult.provider.getMessages(
          providerResult.accessToken,
          { folder: folder || "inbox" },
        );
        allMessages = messages.map((m) => ({
          ...m,
          folder: folder || "inbox",
        }));
      }

      // Apply local state overrides (folder and read status)
      allMessages = allMessages.map((msg) => {
        const localState = localStates.get(msg.id);
        if (localState) {
          return { 
            ...msg, 
            folder: localState.folder !== "inbox" ? localState.folder : msg.folder,
            isRead: localState.isRead !== null && localState.isRead !== undefined ? localState.isRead : msg.isRead,
          };
        }
        return msg;
      });

      // Filter by requested folder (applies local overrides)
      if (!allFolders && folder) {
        allMessages = allMessages.filter((msg) => msg.folder === folder);
      } else if (!allFolders) {
        // Default to inbox - exclude trashed and archived
        allMessages = allMessages.filter(
          (msg) => msg.folder !== "trash" && msg.folder !== "archived",
        );
      }

      // Get starred emails from database (UI-only)
      const starredIds = await storage.getStarredEmailIds(userId);
      const starredSet = new Set(starredIds);

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
        isStarred: starredSet.has(msg.id),
        folder: msg.folder || folder || "inbox",
        threadId: msg.threadId,
        avatarColor: msg.avatarColor,
      }));

      // Save to cache for instant loading next time (async, don't wait)
      storage.saveCachedEmails(userIdNum, emails).catch((err) => {
        console.error("Failed to cache emails:", err);
      });

      // Auto-save contacts from senders (async, don't block response)
      const sendersSeen = new Set<string>();
      for (const msg of allMessages) {
        const email = (msg.fromEmail || "").trim().toLowerCase();
        if (!email || sendersSeen.has(email)) continue;
        sendersSeen.add(email);
        const name = msg.from || undefined;
        storage.saveContact(userId, email, name).catch(() => {});
      }

      return res.json(emails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  // Get unread counts per folder
  app.get("/api/emails/unread-counts", requireAuth, async (req, res) => {
    try {
      const providerResult = await getProviderAndToken(req.session.userId!);

      const counts: Record<string, number> = {
        inbox: 0,
        sent: 0,
        archived: 0,
        trash: 0,
        drafts: 0,
        junk: 0,
      };

      if (providerResult) {
        const userId = req.session.userId!;
        const localStates = await storage.getAllLocalEmailStates(userId);
        const folders = ["inbox", "junk", "trash"] as const;

        await Promise.all(
          folders.map(async (folder) => {
            try {
              const messages = await providerResult.provider.getMessages(
                providerResult.accessToken,
                { folder },
              );
              counts[folder] = messages.filter((m: any) => {
                const localState = localStates.get(m.id);
                if (localState) {
                  if (localState.folder !== "inbox" && localState.folder !== folder) return false;
                  if (localState.isRead !== null && localState.isRead !== undefined) return !localState.isRead;
                }
                return !m.isRead;
              }).length;
            } catch (err) {
              console.log(`Could not fetch ${folder} for unread count`);
            }
          }),
        );
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

      const providerResult = await getProviderAndToken(req.session.userId!);
      if (providerResult && isExternalEmailId(id, providerResult.account)) {
        const userId = req.session.userId!;
        const message = await providerResult.provider.getMessage(providerResult.accessToken, id);
        const localState = await storage.getLocalEmailState(userId, id);
        const starredIds = await storage.getStarredEmailIds(userId);
        const isStarredLocally = new Set(starredIds).has(id);

        return res.json({
          id: id,
          nylasId: id,
          sender: message.from,
          senderEmail: message.fromEmail,
          subject: message.subject,
          preview: "",
          body: message.body,
          receivedAt: message.date,
          isRead: localState?.isRead !== null && localState?.isRead !== undefined ? localState.isRead : message.isRead,
          isStarred: isStarredLocally || message.isStarred,
          folder: localState?.localFolder || "inbox",
          threadId: message.threadId,
          avatarColor: "#3B82F6",
          to: message.to,
          cc: message.cc,
          attachments: message.attachments,
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
      const account = await storage.getEmailAccount(req.session.userId!);
      const isExternal = isExternalEmailId(id, account);

      if (isExternal) {
        await storage.setLocalEmailReadStatus(req.session.userId!, id, true);
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

  app.patch("/api/emails/:id/unread", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const account = await storage.getEmailAccount(req.session.userId!);
      const isExternal = isExternalEmailId(id, account);

      if (isExternal) {
        await storage.setLocalEmailReadStatus(req.session.userId!, id, false);
        return res.json({ success: true });
      }

      const numericId = parseInt(id);
      const email = await storage.updateEmail(numericId, { isRead: false });
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      res.json(email);
    } catch (error) {
      console.error("Error marking email as unread:", error);
      res.status(500).json({ error: "Failed to mark email as unread" });
    }
  });

  app.patch("/api/emails/:id/folder", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const { folder } = req.body;
      const userId = req.session.userId!;

      if (
        !folder ||
        !["inbox", "archived", "trash", "sent", "drafts", "junk"].includes(
          folder,
        )
      ) {
        return res.status(400).json({ error: "Invalid folder" });
      }

      const account = await storage.getEmailAccount(userId);
      const isExternal = isExternalEmailId(id, account);

      if (isExternal) {
        await storage.setLocalEmailFolder(userId, id, folder);

        res.json({ success: true, folder });

        // Record action for AI learning in background (only for trash/archive)
        if (folder === "trash" || folder === "archived") {
          (async () => {
            try {
              const providerResult2 = await getProviderAndToken(userId);
              if (providerResult2) {
                const message = await providerResult2.provider.getMessage(providerResult2.accessToken, id);
                const senderEmail = message?.fromEmail;
                const subject = message?.subject || "";
                // Extract keywords from subject
                const keywords = subject
                  .toLowerCase()
                  .split(/\s+/)
                  .filter((w: string) => w.length > 3)
                  .slice(0, 5);
                // Detect newsletter patterns
                const isNewsletter =
                  /unsubscribe|newsletter|digest|weekly|monthly/i.test(
                    subject,
                  ) ||
                  /@.*mail\.|noreply|no-reply|notifications?@/i.test(
                    senderEmail || "",
                  );
                const isPromotion =
                  /sale|discount|offer|promo|deal|off|save|free/i.test(subject);

                await storage.recordEmailAction(userId, {
                  messageId: id,
                  actionType: folder === "trash" ? "delete" : "archive",
                  senderEmail,
                  subjectKeywords: keywords,
                  isNewsletter,
                  isPromotion,
                });
              }
            } catch (e) {
              console.log("[Action Recording] Failed to record action:", e);
            }
          })();
        }

        return;
      } else {
        // Local email storage for demo/test emails
        const numericId = parseInt(id);
        const email = await storage.updateEmail(numericId, { folder });
        if (!email) {
          return res.status(404).json({ error: "Email not found" });
        }
        res.json(email);
      }
    } catch (error) {
      console.error("Error moving email:", error);
      res.status(500).json({ error: "Failed to move email" });
    }
  });

  app.patch("/api/emails/:id/star", requireAuth, async (req, res) => {
    try {
      const messageId = req.params.id;
      // Toggle star in database only (UI-only)
      const isStarred = await storage.toggleStarEmail(
        req.session.userId!,
        messageId,
      );
      res.json({ success: true, isStarred });
    } catch (error) {
      console.error("Error toggling star:", error);
      res.status(500).json({ error: "Failed to toggle star" });
    }
  });

  app.delete("/api/emails/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const account = await storage.getEmailAccount(req.session.userId!);
      const isExternal = isExternalEmailId(id, account);

      if (isExternal) {
        await storage.setLocalEmailFolder(req.session.userId!, id, "trash");
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

  // Email notes (sticky notes for individual emails)
  app.get("/api/emails/:id/note", requireAuth, async (req, res) => {
    try {
      const note = await storage.getEmailNote(
        req.session.userId!,
        req.params.id,
      );
      res.json({ note: note || null });
    } catch (error) {
      console.error("Error getting email note:", error);
      res.status(500).json({ error: "Failed to get note" });
    }
  });

  app.post("/api/emails/:id/note", requireAuth, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required" });
      }

      const existing = await storage.getEmailNote(
        req.session.userId!,
        req.params.id,
      );
      if (existing) {
        const updated = await storage.updateEmailNote(
          req.session.userId!,
          req.params.id,
          content,
        );
        return res.json({ note: updated });
      }

      const note = await storage.createEmailNote({
        userId: req.session.userId!,
        messageId: req.params.id,
        content,
      });
      res.json({ note });
    } catch (error) {
      console.error("Error saving email note:", error);
      res.status(500).json({ error: "Failed to save note" });
    }
  });

  app.delete("/api/emails/:id/note", requireAuth, async (req, res) => {
    try {
      await storage.deleteEmailNote(req.session.userId!, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting email note:", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // Download email attachment (with antivirus scanning)
  app.get(
    "/api/emails/:messageId/attachments/:attachmentId",
    requireAuth,
    fileLimiter,
    async (req, res) => {
      try {
        const messageId = decodeURIComponent(req.params.messageId);
        const attachmentId = decodeURIComponent(req.params.attachmentId);
        const providerResult = await getProviderAndToken(req.session.userId!);

        if (!providerResult) {
          return res.status(400).json({ error: "No email account connected" });
        }

        const attachment = await providerResult.provider.downloadAttachment(
          providerResult.accessToken,
          messageId,
          attachmentId,
        );

        if (!attachment.data || (Buffer.isBuffer(attachment.data) && attachment.data.length === 0)) {
          return res.status(404).json({ error: "Attachment content is empty" });
        }

        // Scan attachment for malware before serving
        const scanResult = await scanFile(
          attachment.data,
          attachment.filename,
          attachment.contentType,
        );

        if (!scanResult.isClean) {
          console.warn(
            `Blocked malicious attachment: ${attachment.filename} - ${scanResult.malwareName}`,
          );
          return res.status(403).json({
            error: "File blocked for security reasons",
            reason: scanResult.malwareName,
          });
        }

        // Sanitize SVG files to prevent XSS attacks (CASA Q40)
        let fileData = attachment.data;
        if (Buffer.isBuffer(fileData)) {
          const { buffer: sanitizedBuffer } = sanitizeSVGBuffer(
            fileData,
            attachment.filename,
            attachment.contentType,
          );
          fileData = sanitizedBuffer;
        }

        // Log attachment download (CASA Q52)
        storage
          .createSecurityAuditLog({
            userId: req.session.userId!,
            eventType: "attachment_download",
            ipAddress: getClientIp(req),
            userAgent: req.headers["user-agent"] || null,
            resourceType: "attachment",
            resourceId: attachmentId,
            outcome: "success",
            details: `Downloaded: ${attachment.filename} (${attachment.contentType})`,
          })
          .catch((err) => console.warn("Failed to log security event:", err));

        const safeFilename = attachment.filename.replace(/[^\w\s.\-()]/g, "_");
        res.setHeader("Content-Type", attachment.contentType);
        res.setHeader("Content-Length", String(Buffer.isBuffer(fileData) ? fileData.length : Buffer.byteLength(fileData)));
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
        );
        res.setHeader("Cache-Control", "no-store");
        res.send(fileData);
      } catch (error) {
        console.error("Error downloading attachment:", error);
        res.status(500).json({ error: "Failed to download attachment" });
      }
    },
  );

  // Custom folders CRUD
  app.get("/api/folders", requireAuth, async (req, res) => {
    try {
      const folders = await storage.getCustomFolders(req.session.userId!);
      res.json({ folders });
    } catch (error) {
      console.error("Error getting custom folders:", error);
      res.status(500).json({ error: "Failed to get folders" });
    }
  });

  const createFolderSchema = insertCustomFolderSchema
    .pick({ name: true, aiDescription: true })
    .extend({
      name: z
        .string()
        .min(1, "Folder name is required")
        .max(50, "Folder name too long"),
      aiDescription: z.string().max(200, "AI description too long").optional(),
    });

  const updateFolderSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    aiDescription: z.string().max(200).optional().nullable(),
    icon: z.string().max(50).optional(),
  });

  app.post("/api/folders", requireAuth, async (req, res) => {
    try {
      const result = createFolderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }
      const { name, aiDescription } = result.data;
      const folder = await storage.createCustomFolder(
        req.session.userId!,
        name.trim(),
        aiDescription?.trim() || undefined,
      );
      res.json({ folder });
    } catch (error) {
      console.error("Error creating custom folder:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  app.patch("/api/folders/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid folder ID" });
      }
      const result = updateFolderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }
      const { name, aiDescription, icon } = result.data;
      const updates: { name?: string; aiDescription?: string; icon?: string } =
        {};
      if (name) updates.name = name.trim();
      if (aiDescription !== undefined)
        updates.aiDescription = aiDescription?.trim() || undefined;
      if (icon) updates.icon = icon.trim();

      const folder = await storage.updateCustomFolder(
        id,
        req.session.userId!,
        updates,
      );
      if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
      }
      res.json({ folder });
    } catch (error) {
      console.error("Error updating custom folder:", error);
      res.status(500).json({ error: "Failed to update folder" });
    }
  });

  app.delete("/api/folders/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      console.log("[DELETE /api/folders/:id]", {
        id,
        userId,
        rawId: req.params.id,
      });
      if (isNaN(id)) {
        console.log("[DELETE /api/folders/:id] Invalid folder ID (NaN)");
        return res.status(400).json({ error: "Invalid folder ID" });
      }
      const deleted = await storage.deleteCustomFolder(id, userId);
      console.log("[DELETE /api/folders/:id] Delete result:", {
        deleted,
        id,
        userId,
      });
      if (!deleted) {
        return res.status(404).json({ error: "Folder not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting custom folder:", error);
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  // Get emails in a custom folder
  app.get("/api/folders/:id/emails", requireAuth, async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      if (isNaN(folderId)) {
        return res.status(400).json({ error: "Invalid folder ID" });
      }

      const userId = req.session.userId!;
      const providerResult = await getProviderAndToken(userId);

      const messageIds = await storage.getEmailsInFolder(userId, folderId);

      if (!messageIds.length) {
        return res.json({ emails: [] });
      }

      if (!providerResult) {
        return res.json({ emails: [] });
      }

      const folderEmails: any[] = [];
      for (const messageId of messageIds) {
        try {
          const email = await providerResult.provider.getMessage(providerResult.accessToken, messageId);
          if (email) {
            folderEmails.push(email);
          }
        } catch (err) {
          // Email may have been deleted, skip it
          console.log(
            `Could not fetch message ${messageId}, may have been deleted`,
          );
        }
      }

      // Sort by date (newest first)
      folderEmails.sort((a, b) => (b.date || 0) - (a.date || 0));

      res.json({ emails: folderEmails });
    } catch (error) {
      console.error("Error getting folder emails:", error);
      res.status(500).json({ error: "Failed to get folder emails" });
    }
  });

  // AI Folder Auto-Sort - analyze emails and automatically assign matches to the folder
  app.post("/api/folders/:id/ai-auto-sort", requireAuth, async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      if (isNaN(folderId)) {
        return res.status(400).json({ error: "Invalid folder ID" });
      }

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (user?.plan === "free") {
        return res
          .status(403)
          .json({ error: "AI folder sorting requires a Pro or Business plan" });
      }

      const folders = await storage.getCustomFolders(userId);
      const folder = folders.find((f) => f.id === folderId);

      if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
      }

      if (!folder.aiDescription) {
        return res
          .status(400)
          .json({ error: "Folder does not have an AI description" });
      }

      const providerResult = await getProviderAndToken(userId);
      if (!providerResult) {
        return res.status(400).json({ error: "No email account connected" });
      }

      const emails = await providerResult.provider.getMessages(providerResult.accessToken, { folder: "inbox", limit: 200 });

      if (!emails.length) {
        return res.json({ sorted: 0, folderName: folder.name });
      }

      const emailSummaries = emails.slice(0, 100).map((e: any) => ({
        id: e.id,
        sender: e.from || "Unknown",
        senderEmail: e.fromEmail || "",
        subject: e.subject || "(No subject)",
        preview: e.preview || "",
      }));

      let matchingIds: string[] = [];
      const batchSize = 50;
      const sortBatches: any[][] = [];
      for (let i = 0; i < emailSummaries.length; i += batchSize) {
        sortBatches.push(emailSummaries.slice(i, i + batchSize));
      }

      const sortResults = await Promise.allSettled(
        sortBatches.map(async (batch, idx) => {
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are an expert email sorting assistant. Your job is to find ALL emails that could reasonably belong in a user's custom folder based on its name and description.

Be INCLUSIVE and BROAD in your matching - it's better to include a borderline email than miss one.

Matching criteria (use ALL of these):
- Subject line keywords related to the folder topic
- Sender names/domains associated with the topic
- Preview/snippet text mentioning relevant terms
- Industry or category associations (e.g., a folder called "Food" should match: restaurant receipts, food delivery confirmations, recipe newsletters, grocery orders, cooking tips, etc.)
- Related and adjacent topics (e.g., "Food" also matches: UberEats, DoorDash, Grubhub, HelloFresh, grocery store emails, etc.)

Think broadly about what the user INTENDED when they created this folder.`,
              },
              {
                role: "user",
                content: `Folder Name: "${folder.name}"
Folder Description: "${folder.aiDescription}"

Analyze ALL of these emails and find every one that could belong in this folder:
${JSON.stringify(batch, null, 2)}

Return ONLY a JSON array of matching email IDs. Be generous - include anything that could reasonably fit.
Example: ["id1", "id2", "id3"]
If truly nothing matches, return: []`,
              },
            ],
            temperature: 0.4,
            max_tokens: 2000,
          });

          const responseText = aiResponse.choices[0]?.message?.content || "[]";
          const cleanResponse = responseText.replace(/```json\n?|\n?```/g, "").trim();
          const parsed = JSON.parse(cleanResponse);
          return Array.isArray(parsed) ? parsed.map(String) : [];
        })
      );

      for (const result of sortResults) {
        if (result.status === "fulfilled") {
          matchingIds.push(...result.value);
        } else {
          console.error("Folder sort batch failed:", result.reason);
        }
      }

      const validInboxIds = new Set(emails.map((e: any) => String(e.id)));
      const validIds = [...new Set(matchingIds)].filter(id => validInboxIds.has(id));

      let assignedCount = 0;
      for (const messageId of validIds) {
        try {
          await storage.assignEmailToFolder(userId, messageId, folderId);
          assignedCount++;
        } catch (err) {
          console.error(`Failed to assign email ${messageId} to folder ${folderId}:`, err);
        }
      }

      res.json({ sorted: assignedCount, folderName: folder.name });
    } catch (error) {
      console.error("Error in AI auto-sort:", error);
      res.status(500).json({ error: "Failed to auto-sort emails" });
    }
  });

  // Bulk assign emails to folder
  app.post("/api/folders/:id/bulk-assign", requireAuth, async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      if (isNaN(folderId)) {
        return res.status(400).json({ error: "Invalid folder ID" });
      }

      const { messageIds } = req.body;
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ error: "No message IDs provided" });
      }

      const userId = req.session.userId!;

      // Verify folder exists and belongs to user
      const folders = await storage.getCustomFolders(userId);
      const folder = folders.find((f) => f.id === folderId);

      if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
      }

      // Assign each email to the folder
      for (const messageId of messageIds) {
        await storage.assignEmailToFolder(userId, messageId, folderId);
      }

      res.json({ success: true, assignedCount: messageIds.length });
    } catch (error) {
      console.error("Error bulk assigning emails:", error);
      res.status(500).json({ error: "Failed to assign emails to folder" });
    }
  });

  // AI Inbox Refresh - analyze emails and suggest actions
  app.post("/api/ai/inbox-refresh", requireAuth, async (req, res) => {
    console.log("[AI Inbox Refresh] Starting analysis...");
    try {
      const userId = req.session.userId!;
      const customInstructions = typeof req.body?.customInstructions === "string" ? req.body.customInstructions.trim().slice(0, 500) : "";
      if (customInstructions) console.log("[AI Inbox Refresh] Custom instructions:", customInstructions);
      const providerResult = await getProviderAndToken(userId);

      if (!providerResult) {
        return res.status(400).json({ error: "No email account connected" });
      }

      console.log("[AI Inbox Refresh] Fetching messages...");
      const messages = await providerResult.provider.getMessages(providerResult.accessToken, { folder: "inbox", limit: 200 });
      console.log(
        "[AI Inbox Refresh] Messages fetched:",
        messages?.length || 0,
      );

      if (!messages || messages.length === 0) {
        console.log("[AI Inbox Refresh] No messages found");
        return res.json({
          suggestions: [],
          batchId: null,
          message: "No emails to analyze",
        });
      }

      // Get user's learned writing style and preferences for context (Pro+ only)
      const user = await storage.getUser(userId);
      const refreshUserPlan = user?.plan || "free";
      const learnedStyle = hasPlan(refreshUserPlan, "pro")
        ? await storage.getLearnedWritingStyle(userId)
        : null;

      // Get user's deletion/archive history patterns for smarter recommendations
      const actionPatterns = await storage.getEmailActionPatterns(userId);
      console.log(
        "[AI Inbox Refresh] Action patterns found:",
        JSON.stringify(actionPatterns),
      );

      // Get user's custom folders with AI descriptions for auto-sorting (Pro+ feature only)
      const customFolders = await storage.getCustomFolders(userId);
      const userPlan = user?.plan || "free";
      const hasPro = userPlan === "pro" || userPlan === "premium";
      // Only include folder descriptions for Pro+ users
      const foldersWithAiDesc = hasPro
        ? customFolders.filter((f) => f.aiDescription)
        : [];

      // Clear old non-pending suggestions
      await storage.clearOldAiInboxSuggestions(userId);

      // Generate unique batch ID
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const enriched = messages.map((msg: any) => {
        const fromEmail = (msg.fromEmail || "").toLowerCase();
        const fromName = msg.from || "";
        const domain = fromEmail.split("@")[1] || "";
        const subjectLower = (msg.subject || "").toLowerCase();
        const snippetLower = (msg.preview || "").toLowerCase();
        const hasUnsubscribe = snippetLower.includes("unsubscribe") || subjectLower.includes("unsubscribe");
        const localPart = fromEmail.split("@")[0] || "";
        const isAutomated = /^(noreply|no-reply|donotreply|notifications?|mailer|bounce|info|marketing|promo|news|newsletter|updates?|alerts?|support|billing|receipts?)$/.test(localPart);
        const isMarketing = hasUnsubscribe || /(%\s*off|limited.?time|deal\s*of|exclusive\s*offer|flash\s*sale|act\s*now|don't\s*miss|last\s*chance|free\s*shipping|clearance|coupon|discount)/i.test(subjectLower + " " + snippetLower);
        const isTransactional = /(your\s*order|order\s*confirm|shipping\s*confirm|receipt\s*for|payment\s*received|invoice\s*#|tracking\s*number)/i.test(subjectLower);
        return {
          id: msg.id,
          subject: msg.subject || "(No subject)",
          from: fromEmail || fromName || "unknown",
          fromName,
          domain,
          snippet: msg.preview || "",
          date: msg.date,
          starred: !!msg.isStarred,
          unread: !msg.isRead,
          recipientCount: 1,
          hasUnsubscribe,
          isAutomated,
          isMarketing,
          isTransactional,
        };
      });

      const deletedDomains = new Set(actionPatterns.deletedDomains.map((d: string) => d.toLowerCase()));
      const deletedSenders = new Set(actionPatterns.deletedSenders.map((s: string) => s.toLowerCase()));
      const archivedDomains = new Set(actionPatterns.archivedDomains.map((d: string) => d.toLowerCase()));

      const ruleSuggestions: any[] = [];
      const needsAi: any[] = [];

      for (const email of enriched) {
        if (email.starred) continue;

        if (deletedSenders.has(email.from) || deletedDomains.has(email.domain)) {
          ruleSuggestions.push({ messageId: email.id, action: "delete", confidence: 85, reason: "You've deleted emails from this sender before", _email: email });
          continue;
        }
        if (archivedDomains.has(email.domain) && !email.unread) {
          ruleSuggestions.push({ messageId: email.id, action: "archive", confidence: 80, reason: "You've archived emails from this domain before", _email: email });
          continue;
        }
        if (email.isMarketing && !email.unread) {
          ruleSuggestions.push({ messageId: email.id, action: "junk", confidence: 75, reason: "Read marketing/promotional email", _email: email });
          continue;
        }
        if (email.isTransactional && !email.unread) {
          const emailDate = email.date ? new Date(email.date) : null;
          const daysSince = emailDate ? (Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24) : 0;
          if (daysSince > 7) {
            ruleSuggestions.push({ messageId: email.id, action: "archive", confidence: 72, reason: "Old transactional email (order confirmation, receipt)", _email: email });
            continue;
          }
        }

        if (!customInstructions && email.unread && !email.isAutomated && !email.isMarketing) continue;

        needsAi.push(email);
      }

      console.log(`[AI Inbox Refresh] Pre-filter: ${ruleSuggestions.length} rule-based, ${needsAi.length} need AI (of ${enriched.length} total)`);

      const emailSummaries = needsAi;

      // Build folder sorting section if user has custom folders with AI descriptions
      const folderSortingSection =
        foldersWithAiDesc.length > 0
          ? `
CUSTOM FOLDER AUTO-SORTING (Pro Feature):
The user has created custom folders with AI sorting rules. If an email matches a folder's description, suggest moving it there.

Available folders:
${foldersWithAiDesc.map((f) => `- Folder ID ${f.id}: "${f.name}" - ${f.aiDescription}`).join("\n")}

To suggest moving to a folder, use action "move_to_folder" with folderId and folderName in the suggestion.
`
          : "";

      // Build user deletion history section for smarter AI recommendations
      const hasHistory =
        actionPatterns.deletedDomains.length > 0 ||
        actionPatterns.deletedSenders.length > 0 ||
        actionPatterns.archivedDomains.length > 0;
      const userHistorySection = hasHistory
        ? `
USER'S DELETION & ARCHIVE HISTORY (IMPORTANT - prioritize these patterns):
Based on user's past behavior, they frequently delete or archive emails from:
${actionPatterns.deletedSenders.length > 0 ? `- Deleted senders: ${actionPatterns.deletedSenders.slice(0, 10).join(", ")}` : ""}
${actionPatterns.deletedDomains.length > 0 ? `- Deleted domains: ${actionPatterns.deletedDomains.slice(0, 10).join(", ")}` : ""}
${actionPatterns.archivedDomains.length > 0 ? `- Archived domains: ${actionPatterns.archivedDomains.slice(0, 10).join(", ")}` : ""}
${actionPatterns.newsletterPatterns.length > 0 ? `- Newsletter sources: ${actionPatterns.newsletterPatterns.slice(0, 10).join(", ")}` : ""}

PRIORITY: Suggest deleting/archiving emails from senders/domains the user has historically deleted/archived.
`
        : "";

      let aiSuggestions: any[] = [];

      if (emailSummaries.length > 0) {
        const customSection = customInstructions ? `
USER'S CUSTOM CLEANUP INSTRUCTIONS (HIGH PRIORITY):
The user specifically wants the following filtered from their inbox. Apply these rules aggressively:
"${customInstructions}"

Interpret these instructions liberally — if the user says "remove newsletters", target ALL newsletter-like emails. If they mention specific senders or topics, filter those first.
` : "";

        const systemPrompt = `You are a precise email inbox cleanup assistant. Only the ambiguous emails are sent to you — obvious cases are already handled.

${hasHistory ? "The user has action history — weight patterns heavily." : "No history yet — be conservative."}
${learnedStyle?.styleAnalysis ? `User style: ${learnedStyle.styleAnalysis}` : ""}
${customSection}
${userHistorySection}
${folderSortingSection}

ACTIONS:
- "spam": Truly deceptive/phishing only. NOT newsletters or known companies.
- "junk": Low-value bulk mail: expired promotions, mass emails from unfamiliar companies.
- "archive": Read emails no longer needed: old confirmations, processed receipts, addressed notifications.
- "delete": Expired/irrelevant: old bounce-backs, week-old system errors, clearly outdated promotions.
- "star": Clearly urgent/important: meeting requests, deadlines, critical alerts.
- "mark_read": Informational-only needing no response: read receipts, automated status updates.
${foldersWithAiDesc.length > 0 ? '- "move_to_folder": Email matches a custom folder\'s description.' : ""}

RULES:
1. NEVER act on starred emails
2. NEVER mark real person-to-person emails as spam or junk
3. NEVER spam known companies — use "junk" if unwanted
4. Prefer "junk" over "spam"
5. Unread emails from real people = skip
6. When in doubt = skip. Return empty array if nothing actionable
7. Minimum confidence 60%. Return ALL actionable emails, no cap.
${foldersWithAiDesc.length > 0 ? "8. For move_to_folder, include folderId and folderName" : ""}

JSON response only:
{"suggestions":[{"messageId":"id","action":"spam|junk|archive|delete|star|mark_read${foldersWithAiDesc.length > 0 ? "|move_to_folder" : ""}","confidence":60-100,"reason":"brief reason"${foldersWithAiDesc.length > 0 ? ',"folderId":0,"folderName":""' : ""}}]}`;

        const batchSize = 50;
        const batches: any[][] = [];
        for (let i = 0; i < emailSummaries.length; i += batchSize) {
          batches.push(emailSummaries.slice(i, i + batchSize));
        }

        const batchResults = await Promise.allSettled(
          batches.map(async (batch, idx) => {
            const stripped = batch.map(({ isAutomated, isMarketing, isTransactional, ...rest }: any) => rest);
            const userPrompt = `Analyze these ${stripped.length} emails:\n${JSON.stringify(stripped)}`;
            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.1,
              max_tokens: 3000,
            });
            const responseText = completion.choices[0]?.message?.content || "{}";
            console.log(`[AI Inbox Refresh] Batch ${idx + 1} response length:`, responseText.length);
            const parsed = JSON.parse(responseText.replace(/```json\n?|\n?```/g, "").trim());
            return parsed.suggestions || [];
          })
        );

        for (const result of batchResults) {
          if (result.status === "fulfilled") {
            aiSuggestions.push(...result.value);
          } else {
            console.error("[AI Inbox Refresh] Batch failed:", result.reason);
          }
        }
        console.log("[AI Inbox Refresh] AI suggestions total:", aiSuggestions.length);
      }

      const allSuggestions = [
        ...ruleSuggestions.map(s => ({ messageId: s.messageId, action: s.action, confidence: s.confidence, reason: s.reason, _email: s._email })),
        ...aiSuggestions,
      ];
      console.log(`[AI Inbox Refresh] Combined: ${ruleSuggestions.length} rules + ${aiSuggestions.length} AI = ${allSuggestions.length} total`);

      const createdSuggestions = [];
      const seenIds = new Set<string>();
      for (const suggestion of allSuggestions) {
        if (!suggestion.messageId || !suggestion.action) continue;
        if (seenIds.has(suggestion.messageId)) continue;
        seenIds.add(suggestion.messageId);

        const emailInfo = suggestion._email || enriched.find(
          (e: any) => e.id === suggestion.messageId,
        );
        if (!emailInfo) continue;

        // Build action data with reason and folder info if applicable
        const actionData: Record<string, any> = { reason: suggestion.reason };
        if (
          suggestion.action === "move_to_folder" &&
          suggestion.folderId &&
          suggestion.folderName
        ) {
          actionData.folderId = suggestion.folderId;
          actionData.folderName = suggestion.folderName;
        }

        const created = await storage.createAiInboxSuggestion({
          userId,
          batchId,
          messageId: suggestion.messageId,
          messageSubject: emailInfo.subject,
          messageSender:
            emailInfo.fromName && emailInfo.fromName.trim()
              ? emailInfo.from && emailInfo.from !== "unknown"
                ? `${emailInfo.fromName} <${emailInfo.from}>`
                : emailInfo.fromName
              : emailInfo.from || "Unknown",
          actionType: suggestion.action,
          actionData,
          confidence: Math.min(100, Math.max(0, suggestion.confidence || 50)),
          status: "pending",
        });
        createdSuggestions.push(created);
      }

      res.json({
        batchId,
        suggestions: createdSuggestions,
        totalAnalyzed: emailSummaries.length,
      });
    } catch (error) {
      console.error("AI inbox refresh error:", error);
      res.status(500).json({ error: "Failed to analyze inbox" });
    }
  });

  // Get all active AI suggestions (pending + approved)
  app.get("/api/ai/inbox-suggestions", requireAuth, async (req, res) => {
    try {
      const suggestions = await storage.getAllActiveAiInboxSuggestions(
        req.session.userId!,
      );
      res.json({ suggestions });
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  // Approve/reject a single suggestion
  app.patch("/api/ai/inbox-suggestions/:id", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updated = await storage.updateAiInboxSuggestionStatus(
        parseInt(req.params.id),
        status,
      );

      if (!updated) {
        return res.status(404).json({ error: "Suggestion not found" });
      }

      res.json({ suggestion: updated });
    } catch (error) {
      console.error("Error updating suggestion:", error);
      res.status(500).json({ error: "Failed to update suggestion" });
    }
  });

  // Execute approved suggestions only
  app.post(
    "/api/ai/inbox-suggestions/execute",
    requireAuth,
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const providerResult = await getProviderAndToken(userId);

        if (!providerResult) {
          return res.status(400).json({ error: "No email account connected" });
        }

        const approvedSuggestions =
          await storage.getApprovedAiInboxSuggestions(userId);

        if (approvedSuggestions.length === 0) {
          return res.json({
            executed: 0,
            failed: 0,
            errors: [],
            message: "No approved suggestions to execute",
          });
        }

        const results = { executed: 0, failed: 0, errors: [] as string[] };

        for (const suggestion of approvedSuggestions) {
          try {
            switch (suggestion.actionType) {
              case "spam":
              case "junk":
                // Use local storage for folder changes - faster and more reliable
                await storage.setLocalEmailFolder(
                  userId,
                  suggestion.messageId,
                  "junk",
                );
                break;
              case "archive":
                // Use local storage for folder changes - faster and more reliable
                await storage.setLocalEmailFolder(
                  userId,
                  suggestion.messageId,
                  "archived",
                );
                break;
              case "delete":
                // Use local storage for folder changes - faster and more reliable
                await storage.setLocalEmailFolder(
                  userId,
                  suggestion.messageId,
                  "trash",
                );
                break;
              case "star":
                try {
                  await storage.toggleStarEmail(userId, suggestion.messageId);
                } catch (starErr) {
                  console.log("Star failed, continuing:", starErr);
                }
                break;
              case "mark_read":
                try {
                  await storage.setLocalEmailReadStatus(userId, suggestion.messageId, true);
                } catch (readErr) {
                  console.log(
                    "Mark read failed, continuing:",
                    readErr,
                  );
                }
                break;
              case "move_to_folder":
                // Move email to custom folder by assigning it in our database
                const actionData = suggestion.actionData as {
                  folderId?: number;
                  folderName?: string;
                } | null;
                if (actionData?.folderId) {
                  await storage.assignEmailToFolder(
                    userId,
                    suggestion.messageId,
                    actionData.folderId,
                  );
                }
                break;
            }

            await storage.updateAiInboxSuggestionStatus(
              suggestion.id,
              "executed",
              new Date(),
            );
            results.executed++;
          } catch (err: any) {
            results.failed++;
            results.errors.push(
              `Failed to ${suggestion.actionType} email: ${err.message}`,
            );
            await storage.updateAiInboxSuggestionStatus(
              suggestion.id,
              "rejected",
            );
          }
        }

        res.json(results);
      } catch (error) {
        console.error("Error executing suggestions:", error);
        res.status(500).json({ error: "Failed to execute suggestions" });
      }
    },
  );

  // Dismiss all pending suggestions
  app.delete("/api/ai/inbox-suggestions", requireAuth, async (req, res) => {
    try {
      const suggestions = await storage.getPendingAiInboxSuggestions(
        req.session.userId!,
      );
      for (const suggestion of suggestions) {
        await storage.updateAiInboxSuggestionStatus(suggestion.id, "rejected");
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error dismissing suggestions:", error);
      res.status(500).json({ error: "Failed to dismiss suggestions" });
    }
  });

  // AI email summary - summarize email content with key points and action items
  function cleanupSummaryCache() {
    const now = Date.now();
    const entries = Array.from(summaryCache.entries());
    for (const [key, value] of entries) {
      if (now - value.timestamp > CACHE_TTL_MS) {
        summaryCache.delete(key);
      }
    }
    if (summaryCache.size > CACHE_MAX_SIZE) {
      const sortedEntries = entries.sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      );
      const toDelete = sortedEntries.slice(
        0,
        summaryCache.size - CACHE_MAX_SIZE,
      );
      for (const [key] of toDelete) {
        summaryCache.delete(key);
      }
    }
  }

  app.post("/api/emails/:id/summary", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const { subject, body } = req.body;

      if (!body) {
        return res.status(400).json({ error: "Email body is required" });
      }

      const userPlan = await getUserPlan(req.session.userId!);

      const cacheKey = `${req.session.userId}-${id}`;
      cleanupSummaryCache();
      const cached = summaryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json({
          summary: cached.summary,
          keyPoints: cached.keyPoints,
          actionItems: cached.actionItems,
        });
      }

      const dbCached = await storage.getMessageSummary(req.session.userId!, id);
      if (dbCached) {
        let dbParsed = { summary: dbCached.summary, keyPoints: [] as string[], actionItems: [] as string[] };
        try {
          const extra = JSON.parse(dbCached.summary);
          if (extra.summary) dbParsed = extra;
        } catch {}
        summaryCache.set(cacheKey, { ...dbParsed, timestamp: Date.now() });
        return res.json(dbParsed);
      }

      const cleanBody = stripEmailNoise(body).substring(0, 8000);

      const completion = await openai.chat.completions.create({
        model: getAiModel(userPlan),
        messages: [
          {
            role: "system",
            content: `You are an email summarization assistant. Read the ENTIRE email thoroughly from beginning to end, then provide a comprehensive analysis.

Respond with valid JSON only:
{
  "summary": "A clear 2-4 sentence summary covering the full scope of the email — not just the opening, but the main points throughout",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "actionItems": ["Action item if any"]
}

Rules:
- Read and consider ALL content in the email, not just the first paragraph
- The summary MUST reflect the complete email — cover the main topic, supporting details, and conclusion/request
- Include up to 5 key points that capture the most important information from different parts of the email
- Action items should include anything that needs a response, decision, or follow-up
- If there are no action items, return an empty array
- If there are no notable key points, return fewer or none
- Be concise but thorough — do not skip over content in the middle or end of the email`,
          },
          {
            role: "user",
            content: `Subject: ${subject || "(No subject)"}\n\nEmail body:\n${cleanBody}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      let parsed = { summary: "", keyPoints: [] as string[], actionItems: [] as string[] };

      try {
        let jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];
        const raw = JSON.parse(jsonStr);
        parsed = {
          summary: raw.summary || "",
          keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints.filter((p: unknown) => typeof p === "string" && p.trim()) : [],
          actionItems: Array.isArray(raw.actionItems) ? raw.actionItems.filter((a: unknown) => typeof a === "string" && a.trim()) : [],
        };
        if (!parsed.summary) {
          parsed.summary = "Unable to summarize this email.";
        }
      } catch {
        parsed = {
          summary: responseText.length > 20 ? responseText.slice(0, 300) : "Unable to summarize this email.",
          keyPoints: [],
          actionItems: [],
        };
      }

      summaryCache.set(cacheKey, { ...parsed, timestamp: Date.now() });

      try {
        await storage.cacheMessageSummary(req.session.userId!, id, JSON.stringify(parsed));
      } catch (dbErr) {
        console.error("Failed to persist summary to DB:", dbErr);
      }

      res.json(parsed);
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  app.post("/api/emails/:id/detect-language", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const { subject, body } = req.body;

      if (!body) {
        return res.status(400).json({ error: "Email body is required" });
      }

      const cacheKey = `${req.session.userId}-${id}`;
      const now = Date.now();
      const cached = languageDetectionCache.get(cacheKey);
      if (cached && now - cached.timestamp < LANG_CACHE_TTL_MS) {
        return res.json({
          languageCode: cached.languageCode,
          languageName: cached.languageName,
          confidence: cached.confidence,
          isEnglish: cached.isEnglish,
        });
      }

      const { franc } = await import("franc");

      const sampleText = stripEmailNoise(
        (subject ? subject + "\n\n" : "") + body.slice(0, 1000),
      );

      const iso3Map: Record<string, [string, string]> = {
        eng: ["en", "English"], spa: ["es", "Spanish"], fra: ["fr", "French"],
        deu: ["de", "German"], por: ["pt", "Portuguese"], ita: ["it", "Italian"],
        nld: ["nl", "Dutch"], rus: ["ru", "Russian"], zho: ["zh", "Chinese"],
        jpn: ["ja", "Japanese"], kor: ["ko", "Korean"], ara: ["ar", "Arabic"],
        hin: ["hi", "Hindi"], ben: ["bn", "Bengali"], tur: ["tr", "Turkish"],
        pol: ["pl", "Polish"], ukr: ["uk", "Ukrainian"], vie: ["vi", "Vietnamese"],
        tha: ["th", "Thai"], swe: ["sv", "Swedish"], nor: ["no", "Norwegian"],
        dan: ["da", "Danish"], fin: ["fi", "Finnish"], ell: ["el", "Greek"],
        heb: ["he", "Hebrew"], ind: ["id", "Indonesian"], msa: ["ms", "Malay"],
        ron: ["ro", "Romanian"], ces: ["cs", "Czech"], hun: ["hu", "Hungarian"],
        bul: ["bg", "Bulgarian"], hrv: ["hr", "Croatian"], slk: ["sk", "Slovak"],
        cat: ["ca", "Catalan"], lit: ["lt", "Lithuanian"], lav: ["lv", "Latvian"],
        est: ["et", "Estonian"], fas: ["fa", "Persian"], urd: ["ur", "Urdu"],
        fil: ["tl", "Filipino"], tam: ["ta", "Tamil"], tel: ["te", "Telugu"],
        mar: ["mr", "Marathi"], guj: ["gu", "Gujarati"], kan: ["kn", "Kannada"],
        mal: ["ml", "Malayalam"], pan: ["pa", "Punjabi"], afr: ["af", "Afrikaans"],
        swh: ["sw", "Swahili"], amh: ["am", "Amharic"],
      };

      const detected = franc(sampleText, { minLength: 10 });
      const mapped = iso3Map[detected];

      const languageCode = mapped ? mapped[0] : "en";
      const languageName = mapped ? mapped[1] : "English";
      const confidence = detected === "und" ? 0.3 : 0.85;
      const isEnglish = languageCode === "en";

      const result = { languageCode, languageName, confidence, isEnglish, timestamp: now };
      languageDetectionCache.set(cacheKey, result);

      if (languageDetectionCache.size > LANG_CACHE_MAX_SIZE) {
        const entries = Array.from(languageDetectionCache.entries()).sort(
          (a, b) => a[1].timestamp - b[1].timestamp,
        );
        entries.slice(0, languageDetectionCache.size - LANG_CACHE_MAX_SIZE)
          .forEach(([key]) => languageDetectionCache.delete(key));
      }

      res.json({ languageCode, languageName, confidence, isEnglish });
    } catch (error) {
      console.error("Error detecting language:", error);
      res.json({
        languageCode: "en",
        languageName: "English",
        confidence: 0.5,
        isEnglish: true,
      });
    }
  });

  const REGION_CULTURAL_CONTEXT: Record<
    string,
    { culture: string; formality: string; tips: string }
  > = {
    us: {
      culture: "American English",
      formality: "Direct and efficient. Use first names quickly.",
      tips: "Americans prefer concise, action-oriented emails. 'Best regards' or 'Thanks' are standard closings.",
    },
    gb: {
      culture: "British English",
      formality: "Polite and understated. Indirect phrasing common.",
      tips: "British emails often use hedging language ('I was wondering if...', 'Perhaps we could...'). Avoid being too direct.",
    },
    ca: {
      culture: "Canadian English",
      formality: "Friendly and polite. Similar to US but more formal.",
      tips: "Canadians appreciate politeness. 'Thank you' and 'Please' are important. Use both English and French greetings if appropriate.",
    },
    au: {
      culture: "Australian English",
      formality: "Casual and direct. Informal tone acceptable.",
      tips: "Australians prefer a relaxed tone. Overly formal language can seem stiff. 'Cheers' is a common closing.",
    },
    de: {
      culture: "German",
      formality: "Highly formal. Use titles (Herr/Frau) and last names.",
      tips: "German business emails start with 'Sehr geehrte/r'. Always use formal 'Sie' form. Get straight to the point.",
    },
    fr: {
      culture: "French",
      formality: "Very formal. Elaborate greetings and closings expected.",
      tips: "French emails require formal openings ('Madame/Monsieur') and lengthy closings ('Je vous prie d\\'agréer...'). Never use first names initially.",
    },
    es: {
      culture: "Spanish",
      formality: "Warm and personal. Relationship-building matters.",
      tips: "Spanish emails often include personal inquiries before business. Use 'Estimado/a' for formal, 'Hola' for casual.",
    },
    it: {
      culture: "Italian",
      formality: "Formal in business, warm in tone.",
      tips: "Italian emails use 'Gentile' or 'Egregio' for formal address. Personal warmth is valued even in business.",
    },
    pt: {
      culture: "Portuguese",
      formality: "Formal but friendly. Respect hierarchy.",
      tips: "Use 'Prezado/a' for formal address. Portuguese communication values courtesy and relationship.",
    },
    br: {
      culture: "Brazilian Portuguese",
      formality: "Warm and informal compared to Portugal.",
      tips: "Brazilians are generally more casual. 'Olá' and 'Abraços' are common. Personal connection matters.",
    },
    jp: {
      culture: "Japanese",
      formality:
        "Extremely formal. Honorifics and hierarchical language essential.",
      tips: "Japanese emails follow strict patterns: seasonal greeting, self-introduction, purpose, closing. Use keigo (polite form). Never be too direct.",
    },
    kr: {
      culture: "Korean",
      formality: "Formal and hierarchical. Age and position matter.",
      tips: "Korean emails use formal endings (-습니다). Address seniors with proper titles. Indirect refusals are preferred.",
    },
    cn: {
      culture: "Chinese",
      formality: "Formal in business. Respect for hierarchy.",
      tips: "Chinese emails value modesty and indirect communication. Use proper titles. Avoid saying 'no' directly.",
    },
    in: {
      culture: "Indian English",
      formality: "Formal and respectful. Titles important.",
      tips: "Indian business emails use 'Dear Sir/Madam' and 'Respected'. Be respectful of hierarchy and seniority.",
    },
    ae: {
      culture: "Arabic",
      formality: "Very formal. Religious and cultural phrases common.",
      tips: "Arabic emails often begin with 'Bismillah' or 'As-salamu alaykum'. Show respect and patience. Relationship-building is crucial.",
    },
    sa: {
      culture: "Arabic (Saudi)",
      formality: "Highly formal. Protocol and titles essential.",
      tips: "Saudi business communication is very formal. Use proper titles and show deep respect for tradition.",
    },
    il: {
      culture: "Hebrew/Israeli",
      formality: "Direct and informal. Get to the point.",
      tips: "Israeli communication is very direct. First names are used quickly. Formality is minimal.",
    },
    tr: {
      culture: "Turkish",
      formality: "Formal in business. Respect and warmth valued.",
      tips: "Turkish emails use 'Sayın' for formal address. Show respect for hierarchy while maintaining warmth.",
    },
    nl: {
      culture: "Dutch",
      formality: "Direct and efficient. Minimal small talk.",
      tips: "Dutch communication is very direct - this is cultural, not rude. Be concise and clear.",
    },
    se: {
      culture: "Swedish",
      formality: "Informal and egalitarian. First names common.",
      tips: "Swedish business culture is flat. Use first names. 'Lagom' (moderation) guides communication style.",
    },
    ru: {
      culture: "Russian",
      formality: "Formal in business. Patronymics used.",
      tips: "Russian business emails are formal. Use name + patronymic. Directness is valued but maintain respect.",
    },
    mx: {
      culture: "Mexican Spanish",
      formality: "Warm and personal. Relationship-focused.",
      tips: "Mexican communication values personal connection. Greetings and small talk before business. Use 'usted' for formal.",
    },
    other: {
      culture: "International",
      formality: "Professional and neutral.",
      tips: "Use clear, simple language. Avoid idioms and culturally specific references.",
    },
  };

  app.post("/api/emails/:id/translate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const userPlan = user?.plan || "free";
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({
          error: "Pro plan required for email translation",
          requiredPlan: "pro",
          currentPlan: userPlan,
        });
      }

      const id = req.params.id;
      const { subject, body, sourceLanguage, targetLanguage, formality } =
        req.body;

      if (!body) {
        return res.status(400).json({ error: "Email body is required" });
      }

      const userRegion = user?.aiPreferences?.region || "us";
      const userLang =
        targetLanguage || user?.aiPreferences?.preferredLanguage || "en";
      const userFormality =
        formality || user?.aiPreferences?.formalityLevel || "auto";

      const targetLangName =
        userLang === "auto" || userLang === "en" ? "English" : userLang;
      const culturalContext =
        REGION_CULTURAL_CONTEXT[userRegion] || REGION_CULTURAL_CONTEXT["other"];

      const cacheKey = `${req.session.userId}-${id}-${userLang}-${userFormality}`;
      cleanupTranslationCache();
      const cached = translationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json({
          translatedSubject: cached.translatedSubject,
          translatedBody: cached.translatedBody,
          detectedLanguage: cached.detectedLanguage,
          culturalNotes: cached.culturalNotes,
          cached: true,
        });
      }

      const cleanBody = stripEmailNoise(body);
      const MAX_BODY_LENGTH = 6000;
      const truncatedBody = cleanBody.length > MAX_BODY_LENGTH
        ? cleanBody.slice(0, MAX_BODY_LENGTH) + "\n[...]"
        : cleanBody;

      const formalityNote =
        userFormality === "formal" ? "Use formal, professional language."
        : userFormality === "casual" ? "Use a casual, conversational tone."
        : userFormality === "neutral" ? "Use a balanced, professional tone."
        : `Match ${culturalContext.culture} business norms (${culturalContext.formality}).`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Translate the email to ${targetLangName}. ${formalityNote} Keep proper nouns, names, emails, URLs unchanged. Adapt idioms naturally. Return JSON only: {"subject":"...","body":"...","culturalNotes":"..."}`,
          },
          {
            role: "user",
            content: JSON.stringify({ subject: subject || "", body: truncatedBody }),
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content || "{}";

      try {
        const parsed = JSON.parse(
          responseText.replace(/```json\n?|\n?```/g, "").trim(),
        );
        const result = {
          translatedSubject: parsed.subject || subject || "",
          translatedBody: parsed.body || body,
          detectedLanguage: sourceLanguage || "unknown",
          culturalNotes: parsed.culturalNotes || "",
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

  app.post("/api/cultural-etiquette", requireAuth, async (req, res) => {
    try {
      const { senderEmail, senderName, recipientRegion } = req.body;

      const user = await storage.getUser(req.session.userId!);
      const userRegion = recipientRegion || user?.aiPreferences?.region || "us";

      const senderDomain = senderEmail?.split("@")[1]?.toLowerCase() || "";

      const domainToRegion: Record<string, string> = {
        jp: "jp",
        "co.jp": "jp",
        "ne.jp": "jp",
        de: "de",
        "co.uk": "gb",
        uk: "gb",
        fr: "fr",
        "co.kr": "kr",
        kr: "kr",
        cn: "cn",
        "com.cn": "cn",
        "com.br": "br",
        br: "br",
        in: "in",
        "co.in": "in",
        ru: "ru",
        "com.au": "au",
        au: "au",
        mx: "mx",
        "com.mx": "mx",
        es: "es",
        it: "it",
        nl: "nl",
        se: "se",
        ae: "ae",
        sa: "sa",
        il: "il",
        tr: "tr",
      };

      let detectedSenderRegion = "other";
      for (const [tld, region] of Object.entries(domainToRegion)) {
        if (senderDomain.endsWith(`.${tld}`)) {
          detectedSenderRegion = region;
          break;
        }
      }

      const senderCulture =
        REGION_CULTURAL_CONTEXT[detectedSenderRegion] ||
        REGION_CULTURAL_CONTEXT["other"];
      const recipientCulture =
        REGION_CULTURAL_CONTEXT[userRegion] || REGION_CULTURAL_CONTEXT["other"];

      if (
        detectedSenderRegion === userRegion ||
        detectedSenderRegion === "other"
      ) {
        return res.json({ tips: [], senderRegion: detectedSenderRegion });
      }

      const tips = [
        {
          type: "greeting" as const,
          text: `${senderCulture.culture} emails: ${senderCulture.tips}`,
        },
        {
          type: "formality" as const,
          text: `Formality: ${senderCulture.formality}`,
        },
      ];

      res.json({
        tips,
        senderRegion: detectedSenderRegion,
        senderCulture: senderCulture.culture,
      });
    } catch (error) {
      console.error("Error getting cultural etiquette:", error);
      res.status(500).json({ error: "Failed to get cultural etiquette tips" });
    }
  });

  app.post("/api/send", requireAuth, emailSendLimiter, async (req, res) => {
    try {
      const {
        to,
        cc,
        bcc,
        subject,
        body,
        replyToMessageId,
        delaySeconds = 5,
        immediate = false,
        scheduledFor,
        attachments,
      } = req.body;

      if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ error: "Recipients required" });
      }
      if (!subject || !body) {
        return res.status(400).json({ error: "Subject and body required" });
      }

      const providerResult = await getProviderAndToken(req.session.userId!);
      if (!providerResult) {
        return res
          .status(401)
          .json({ error: "Not connected to email provider" });
      }

      // Check daily send limit for Free plan users
      const sendLimit = await storage.checkDailySendLimit(req.session.userId!);
      if (!sendLimit.canSend) {
        return res.status(403).json({
          error: "Free plan limit reached. Upgrade to send unlimited emails.",
          limitReached: true,
          resetAt: sendLimit.resetAt,
        });
      }

      // Check if user has Pro/Business plan for scheduled sends
      if (scheduledFor) {
        // Validate scheduledFor is a valid date
        const parsedDate = new Date(scheduledFor);
        if (isNaN(parsedDate.getTime())) {
          return res
            .status(400)
            .json({ error: "Invalid scheduled time format" });
        }

        const user = await storage.getUser(req.session.userId!);
        if (
          !user ||
          (user.plan !== "pro" &&
            user.plan !== "premium" &&
            user.plan !== "business")
        ) {
          return res
            .status(403)
            .json({ error: "Schedule send is a Pro/Business feature" });
        }
      }

      // Scan and sanitize attachments before sending
      if (attachments && Array.isArray(attachments)) {
        for (let i = 0; i < attachments.length; i++) {
          const attachment = attachments[i];
          if (attachment.content && attachment.filename) {
            const scanResult = await scanFile(
              attachment.content,
              attachment.filename,
              attachment.contentType,
              true, // isBase64
            );

            if (!scanResult.isClean) {
              console.warn(
                `Blocked malicious attachment upload: ${attachment.filename} - ${scanResult.malwareName}`,
              );
              return res.status(403).json({
                error: `Attachment "${attachment.filename}" blocked for security reasons`,
                reason: scanResult.malwareName,
              });
            }

            // Sanitize SVG files on upload/send (CASA Q40 - defense in depth)
            const isSVG =
              attachment.filename?.toLowerCase().endsWith(".svg") ||
              attachment.contentType?.includes("svg");
            if (isSVG) {
              try {
                const originalBuffer = Buffer.from(
                  attachment.content,
                  "base64",
                );
                const { buffer: sanitizedBuffer, wasSanitized } =
                  sanitizeSVGBuffer(
                    originalBuffer,
                    attachment.filename,
                    attachment.contentType,
                  );
                if (wasSanitized) {
                  attachments[i].content = sanitizedBuffer.toString("base64");
                }
              } catch (err) {
                console.warn(
                  `Failed to sanitize SVG attachment: ${attachment.filename}`,
                  err,
                );
              }
            }
          }
        }
      }

      if (immediate) {
        await providerResult.provider.sendMessage(providerResult.accessToken, {
          to,
          subject,
          body,
          cc,
          bcc,
          replyToMessageId,
          attachments,
        });
        // Increment daily send count for Free plan users
        await storage.incrementDailySendCount(req.session.userId!);

        // Save contacts for autocomplete
        const allRecipients = [
          ...(Array.isArray(to) ? to : [to]),
          ...(Array.isArray(cc) ? cc : cc ? [cc] : []),
          ...(Array.isArray(bcc) ? bcc : bcc ? [bcc] : []),
        ];
        for (const email of allRecipients) {
          if (email) {
            storage
              .saveContact(req.session.userId!, email)
              .catch((err) => console.warn("Failed to save contact:", err));
          }
        }

        // Log email send for security audit (CASA Q52)
        storage
          .createSecurityAuditLog({
            userId: req.session.userId!,
            eventType: "email_send",
            ipAddress: getClientIp(req),
            userAgent: req.headers["user-agent"] || null,
            resourceType: "email",
            outcome: "success",
            details: `Sent to: ${Array.isArray(to) ? to.join(", ") : to}, Subject: ${subject?.substring(0, 50) || "No subject"}`,
          })
          .catch((err) => console.warn("Failed to log security event:", err));

        return res.json({ success: true, sent: true });
      }

      // Determine scheduled send time
      let scheduledSendAt: Date;
      let isScheduledSend = false;

      if (scheduledFor) {
        // Future scheduled send (Pro/Business feature)
        scheduledSendAt = new Date(scheduledFor);
        if (scheduledSendAt <= new Date()) {
          return res
            .status(400)
            .json({ error: "Scheduled time must be in the future" });
        }
        isScheduledSend = true;
      } else {
        // Regular delayed send with undo window
        const delay = Math.min(Math.max(delaySeconds, 1), 30); // Clamp between 1-30 seconds
        scheduledSendAt = new Date(Date.now() + delay * 1000);
      }

      const pendingSend = await storage.createPendingSend({
        userId: req.session.userId!,
        grantId: providerResult.account.id?.toString() || userId,
        payload: { to, cc, bcc, subject, body, replyToMessageId, attachments },
        scheduledSendAt,
        delaySeconds: isScheduledSend
          ? 0
          : Math.min(Math.max(delaySeconds, 1), 30),
        status: "pending",
      });

      // Increment daily send count for Free plan users when queuing
      await storage.incrementDailySendCount(req.session.userId!);

      // Log email queue for security audit (CASA Q52)
      storage
        .createSecurityAuditLog({
          userId: req.session.userId!,
          eventType: isScheduledSend ? "email_schedule" : "email_queue",
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] || null,
          resourceType: "email",
          outcome: "success",
          details: `Queued for: ${Array.isArray(to) ? to.join(", ") : to}, Subject: ${subject?.substring(0, 50) || "No subject"}`,
        })
        .catch((err) => console.warn("Failed to log security event:", err));

      res.json({
        success: true,
        pendingSendId: pendingSend.id,
        scheduledSendAt: pendingSend.scheduledSendAt,
        delaySeconds: isScheduledSend
          ? 0
          : Math.min(Math.max(delaySeconds, 1), 30),
        isScheduledSend,
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
      const cancelled = await storage.cancelPendingSend(
        req.session.userId!,
        id,
      );
      if (!cancelled) {
        return res
          .status(404)
          .json({ error: "Pending send not found or already sent" });
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
  app.post(
    "/api/drafts/generate",
    requireAuth,
    aiGenerationLimiter,
    async (req, res) => {
      try {
        const user = await storage.getUser(req.session.userId!);
        const userPlan = user?.plan || "free";

        // Feature flag check: is AI draft enabled for this user?
        const aiDraftEnabled = await storage.isFeatureEnabled(
          "ai_draft",
          user?.email || "",
        );
        if (!aiDraftEnabled) {
          return res.status(403).json({
            error: "AI Draft feature is currently disabled",
            featureDisabled: true,
          });
        }

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
              currentPlan: userPlan,
            });
          }
        }

        const { emailId, tone = "professional", emailContent } = req.body;

        // Can provide either emailId to look up, or emailContent directly
        let emailData: {
          sender: string;
          senderEmail: string;
          subject: string;
          body: string;
          preview?: string;
        } | null = null;

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

          if (!emailData && emailId.length > 10) {
            const providerResult = await getProviderAndToken(req.session.userId!);
            if (providerResult) {
              try {
                const message = await providerResult.provider.getMessage(providerResult.accessToken, emailId);
                if (message) {
                  emailData = {
                    sender: message.from,
                    senderEmail: message.fromEmail,
                    subject: message.subject,
                    body: message.body,
                    preview: "",
                  };
                }
              } catch (fetchError) {
                console.error("Error fetching email from provider:", fetchError);
              }
            }
          }
        }

        if (!emailData) {
          return res
            .status(400)
            .json({ error: "Email ID or content is required" });
        }

        const rawEmailBody = emailData.body || emailData.preview || "";
        const emailBody = stripEmailNoise(rawEmailBody);

        const toneDescriptions: Record<string, string> = {
          professional: "professional, courteous, and business-appropriate",
          friendly:
            "warm, friendly, and approachable while remaining respectful",
          casual: "relaxed, conversational, and informal",
          formal:
            "highly formal, respectful, and traditional business communication",
          concise: "brief, direct, and to-the-point with minimal pleasantries",
        };

        const toneDesc =
          toneDescriptions[tone] || toneDescriptions.professional;

        // Fetch user's learned writing style for personalization (Pro+ only)
        let learnedStyle: any = null;
        let styleContext = "";

        if (hasPlan(userPlan, "pro")) {
          learnedStyle = await storage.getLearnedWritingStyle(
            req.session.userId!,
          );

          if (learnedStyle && learnedStyle.samplesAnalyzed > 0) {
            styleContext = `
IMPORTANT - Match the user's personal writing style:
- Style: ${learnedStyle.styleAnalysis || "Direct and clear"}
- Tone: ${learnedStyle.toneDescription || tone}
- Common phrases they use: ${learnedStyle.commonPhrases?.slice(0, 5).join(", ") || "None learned"}
- Sentence length: ${learnedStyle.avgSentenceLength || "medium"}
Try to naturally incorporate their writing patterns while maintaining the requested ${tone} tone.
`;
          }
        }

        const prompt = `You are an email assistant. Generate a reply to the following email. The reply should be ${toneDesc}.
${styleContext}
From: ${emailData.sender} <${emailData.senderEmail}>
Subject: ${emailData.subject}

${emailBody}

Please write a reply that:
1. Acknowledges the sender's message appropriately
2. Addresses any questions or action items mentioned
3. Uses a ${tone} tone throughout
4. Is concise (2-4 paragraphs)
5. Do NOT include greeting like "Dear" or sign-off - just the body content
6. IMPORTANT: Do NOT include the subject line, "Re:", or any subject prefix in your reply - write only the body content

Reply:`;

        const systemPrompt =
          learnedStyle && learnedStyle.samplesAnalyzed > 0
            ? `You are an email assistant that writes replies matching the user's personal writing style. The user tends to write in a ${learnedStyle.toneDescription || tone} manner with ${learnedStyle.avgSentenceLength || "medium"} sentences. Mimic their natural voice while maintaining the requested ${tone} tone. Write only the email body without greetings, sign-offs, or subject lines.`
            : `You are an email assistant that writes clear, concise email replies with a ${tone} tone. Write only the email body without greetings, sign-offs, or subject lines.`;

        const response = await openai.chat.completions.create({
          model: getAiModel(userPlan),
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1024,
        });

        let generatedContent = response.choices[0]?.message?.content;

        if (!generatedContent || generatedContent.trim().length === 0) {
          return res.status(422).json({
            error: "Unable to generate AI response",
            reason:
              "The email format or content could not be processed. This may be due to unusual formatting, empty content, or unsupported characters.",
            canRetry: true,
          });
        }

        // Clean body - remove any subject-like prefixes the AI may have incorrectly included
        const subjectPrefixes = [/^Re:\s*/i, /^Fwd:\s*/i, /^Subject:\s*/i];
        for (const regex of subjectPrefixes) {
          generatedContent = generatedContent.replace(regex, "");
        }

        // If the content starts with the subject text, remove it
        const originalSubject = emailData.subject || "";
        if (
          originalSubject &&
          generatedContent
            .toLowerCase()
            .startsWith(originalSubject.toLowerCase())
        ) {
          generatedContent = generatedContent
            .substring(originalSubject.length)
            .replace(/^[\s\n:,-]+/, "");
        }
        if (
          originalSubject &&
          generatedContent
            .toLowerCase()
            .startsWith(`re: ${originalSubject.toLowerCase()}`)
        ) {
          generatedContent = generatedContent
            .substring(originalSubject.length + 4)
            .replace(/^[\s\n:,-]+/, "");
        }

        // Append email signature if enabled
        if (user?.signatureEnabled && user?.emailSignature) {
          generatedContent = `${generatedContent}\n\n${user.emailSignature}`;
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
            subject: emailData.subject.startsWith("Re:")
              ? emailData.subject
              : `Re: ${emailData.subject}`,
            recipientEmail: emailData.senderEmail || emailData.sender || "",
            recipientName: emailData.sender || null,
            userId: req.session.userId!,
            isAiGenerated: true,
            status: "draft",
          });
        } else {
          // For external provider IDs, just return the content without saving
          draft = {
            id: 0,
            emailId: 0,
            content: generatedContent,
            subject: emailData.subject.startsWith("Re:")
              ? emailData.subject
              : `Re: ${emailData.subject}`,
            recipientEmail: emailData.senderEmail || emailData.sender || "",
            recipientName: emailData.sender || null,
            userId: req.session.userId!,
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
        let reason =
          "An unexpected error occurred while processing your request.";

        if (error?.code === "content_filter") {
          reason =
            "The email content was flagged by content filters and cannot be processed.";
        } else if (error?.code === "context_length_exceeded") {
          reason =
            "The email is too long to process. Try with a shorter email.";
        } else if (error?.message?.includes("rate limit")) {
          reason = "Too many requests. Please wait a moment and try again.";
        } else if (error?.message?.includes("timeout")) {
          reason = "The request timed out. Please try again.";
        }

        res.status(500).json({ error: errorMessage, reason, canRetry: true });
      }
    },
  );

  // AI Polish - improves existing text
  app.post(
    "/api/ai/polish",
    requireAuth,
    aiGenerationLimiter,
    async (req, res) => {
      try {
        const user = await storage.getUser(req.session.userId!);
        const userPlan = user?.plan || "free";

        // Feature flag check: is AI polish enabled for this user?
        const aiPolishEnabled = await storage.isFeatureEnabled(
          "ai_polish",
          user?.email || "",
        );
        if (!aiPolishEnabled) {
          return res.status(403).json({
            error: "AI Polish feature is currently disabled",
            featureDisabled: true,
          });
        }

        const { text, mode = "basic" } = req.body;

        if (!text || text.trim().length === 0) {
          return res.status(400).json({ error: "Text is required" });
        }

        // Advanced polish modes are only for Pro+ users (basic and casual free for all)
        const advancedModes = [
          "formal",
          "concise",
          "persuasive",
          "empathetic",
          "executive",
        ];
        if (advancedModes.includes(mode) && userPlan === "free") {
          return res.status(403).json({
            error: "Advanced polish modes require Pro or Business plan",
            currentPlan: userPlan,
            requiredPlan: "pro",
          });
        }

        const modeInstructions: Record<string, string> = {
          basic:
            "Fix grammar, spelling, and punctuation. Improve clarity while keeping the original tone and meaning.",
          formal:
            "Make the text more formal and professional. Use proper business language.",
          casual:
            "Make the text more casual and friendly while remaining professional.",
          concise:
            "Shorten the text while preserving key information. Remove redundancy.",
          persuasive: "Make the text more compelling and persuasive.",
          empathetic: "Add more empathetic and understanding language.",
          executive:
            "Rewrite for an executive audience - brief, impactful, and action-oriented.",
        };

        const instruction = modeInstructions[mode] || modeInstructions.basic;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an email writing assistant. Your task: ${instruction}. Return ONLY the improved text without any explanations or quotes around it.`,
            },
            {
              role: "user",
              content: text,
            },
          ],
          max_tokens: 1024,
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
    },
  );

  // AI Refine - modify existing response based on instructions
  app.post("/api/ai/refine", requireAuth, async (req, res) => {
    try {
      const userPlan = await getUserPlan(req.session.userId!);
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
        model: getAiModel(userPlan),
        messages: [
          {
            role: "system",
            content: `You are an email writing assistant. Modify the given email response based on the user's instruction. Return ONLY the modified text without explanations.${contextPrompt}`,
          },
          {
            role: "user",
            content: `Current response:
${text}

Instruction: ${instruction}

Please modify the response according to the instruction.`,
          },
        ],
        max_tokens: 1024,
      });

      const refinedText = response.choices[0]?.message?.content;

      if (!refinedText || refinedText.trim().length === 0) {
        return res.status(422).json({ error: "Unable to refine text" });
      }

      // Capture draft edit as writing sample for personalization
      const wordCount = refinedText
        .split(/\s+/)
        .filter((w: string) => w.length > 0).length;
      if (wordCount >= 10) {
        storage
          .createWritingSample({
            userId: req.session.userId!,
            sampleType: "draft_edit",
            originalContent: text,
            finalContent: refinedText.trim(),
            context: instruction,
            wordCount,
          })
          .catch((err) => console.error("Failed to capture draft edit:", err));
      }

      res.json({ refined: refinedText.trim() });
    } catch (error) {
      console.error("Error refining text:", error);
      res.status(500).json({ error: "Failed to refine text" });
    }
  });

  app.post("/api/ai/grammar-check", requireAuth, async (req, res) => {
    try {
      const userPlan = await getUserPlan(req.session.userId!);
      const { text } = req.body;

      if (!text || typeof text !== "string" || text.trim().length < 5) {
        return res.status(400).json({ error: "Text must be at least 5 characters" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional email writing assistant. Analyze the given email draft for grammar errors, spelling mistakes, awkward phrasing, tone issues, and style improvements.

Return a JSON object with this exact structure:
{
  "suggestions": [
    {
      "type": "grammar" | "spelling" | "style" | "tone" | "clarity",
      "original": "the exact problematic text",
      "replacement": "the corrected text",
      "explanation": "brief reason for the change"
    }
  ],
  "overallScore": number between 1-10,
  "correctedText": "the full text with all corrections applied"
}

Rules:
- Only flag genuine issues, not stylistic preferences
- Keep explanations concise (under 15 words)
- If the text is already well-written, return an empty suggestions array and the original text as correctedText
- Score 10 means perfect, 1 means many issues
- Focus on professional email writing standards
- Do not change the meaning or intent of the text`,
          },
          {
            role: "user",
            content: text.slice(0, 3000),
          },
        ],
        max_tokens: 1024,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(422).json({ error: "Unable to check grammar" });
      }

      let result;
      try {
        result = JSON.parse(content);
      } catch {
        return res.status(422).json({ error: "Invalid response from AI" });
      }

      if (!result.suggestions || !Array.isArray(result.suggestions)) {
        result.suggestions = [];
      }
      if (typeof result.overallScore !== "number") {
        result.overallScore = 8;
      }
      if (typeof result.correctedText !== "string") {
        result.correctedText = text;
      }

      res.json(result);
    } catch (error) {
      console.error("Grammar check error:", error);
      res.status(500).json({ error: "Failed to check grammar" });
    }
  });

  // Quick AI draft generation for compose dialog (returns subject + body)
  // All plans can use AI drafts - free plan has 5/day limit
  app.post(
    "/api/drafts/quick-generate",
    requireAuth,
    aiGenerationLimiter,
    async (req, res) => {
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
              currentPlan: userPlan,
            });
          }
        }

        const {
          mode,
          originalEmail,
          instructions,
          tone: requestedTone,
          existingBody,
        } = req.body;

        // Use requested tone or fall back to user's AI preferences
        const aiPrefs = user?.aiPreferences as
          | { replyTone?: string }
          | undefined;
        const tone = requestedTone || aiPrefs?.replyTone || "professional";

        const toneDescriptions: Record<string, string> = {
          professional: "professional, courteous, and business-appropriate",
          friendly:
            "warm, friendly, and approachable while remaining respectful",
          concise: "brief, direct, and to-the-point with minimal pleasantries",
          casual: "casual, relaxed, and conversational",
          formal: "formal, respectful, and traditional business style",
          custom: "professional and thoughtful",
        };
        const toneDesc =
          toneDescriptions[tone] || toneDescriptions.professional;

        let learnedStyle: any = null;
        let styleHint = "";
        if (hasPlan(userPlan, "pro")) {
          learnedStyle = await storage.getLearnedWritingStyle(req.session.userId!);
          if (learnedStyle && learnedStyle.samplesAnalyzed > 0) {
            styleHint = ` Match the user's writing style: ${learnedStyle.toneDescription || tone} tone, ${learnedStyle.avgSentenceLength || "medium"} sentences.`;
          }
        }

        let prompt: string;
        let systemMessage: string;

        if (mode === "reply" || mode === "replyAll") {
          systemMessage = `You are an email assistant that writes clear, concise email replies.${styleHint} Always respond in JSON format with "subject" and "body" fields. IMPORTANT: The "body" field should contain ONLY the email body text - never include the subject line, "Re:", or any subject prefix in the body.`;

          // If there's existing body content, user wants to refine/tweak it
          const existingContent = existingBody?.trim() || "";

          if (existingContent) {
            prompt = `Improve and refine this draft reply with a ${toneDesc} tone.

Original email being replied to:
From: ${originalEmail?.from || "Unknown"} <${originalEmail?.fromEmail || ""}>
Subject: ${originalEmail?.subject || "No subject"}

${originalEmail?.body?.replace(/<[^>]*>/g, "").substring(0, 1500) || ""}

Current draft reply:
${existingContent}

${instructions ? `User instructions for changes: ${instructions}` : "Improve the clarity, tone, and professionalism of this draft."}

Provide an improved version that:
1. Maintains the user's intended message
2. Uses a ${tone} tone throughout
3. Is clear and well-structured
4. IMPORTANT: The body should contain ONLY the email content - do NOT include "Re:", subject line text, or any subject prefix in the body

Respond with JSON only: {"subject": "Re: ${originalEmail?.subject || ""}", "body": "Your improved reply text here (no subject line in body)..."}`;
          } else {
            prompt = `Generate a reply to this email with a ${toneDesc} tone.

Original email:
From: ${originalEmail?.from || "Unknown"} <${originalEmail?.fromEmail || ""}>
Subject: ${originalEmail?.subject || "No subject"}

${originalEmail?.body?.replace(/<[^>]*>/g, "").substring(0, 2000) || ""}

${instructions ? `Additional instructions: ${instructions}` : ""}

Write a reply that:
1. Acknowledges the sender's message
2. Addresses any questions or action items
3. Uses a ${tone} tone throughout
4. Is concise (2-3 paragraphs max)
5. IMPORTANT: The body should contain ONLY the email content - do NOT include "Re:", subject line text, or any subject prefix in the body

Respond with JSON only: {"subject": "Re: ${originalEmail?.subject || ""}", "body": "Your reply text here (no subject line in body)..."}`;
          }
        } else if (mode === "forward") {
          systemMessage = `You are an email assistant.${styleHint} Always respond in JSON format with "subject" and "body" fields. IMPORTANT: The "body" field should contain ONLY the email body text - never include the subject line, "Fwd:", or any subject prefix in the body.`;

          const existingContent = existingBody?.trim() || "";

          if (existingContent) {
            prompt = `Improve this forwarding message with a ${toneDesc} tone.

Original email being forwarded:
From: ${originalEmail?.from || "Unknown"}
Subject: ${originalEmail?.subject || "No subject"}

Current forwarding message:
${existingContent}

${instructions ? `User instructions for changes: ${instructions}` : "Improve the clarity and tone of this forwarding message."}

Respond with JSON only: {"subject": "Fwd: ${originalEmail?.subject || ""}", "body": "Your improved forwarding message here..."}`;
          } else {
            prompt = `Generate a brief forwarding message for this email with a ${toneDesc} tone.

Original email being forwarded:
From: ${originalEmail?.from || "Unknown"}
Subject: ${originalEmail?.subject || "No subject"}

${instructions ? `Additional instructions: ${instructions}` : "Write a brief message to introduce why you're forwarding this email. Keep it to 1-2 sentences."}

Respond with JSON only: {"subject": "Fwd: ${originalEmail?.subject || ""}", "body": "Your forwarding message here..."}`;
          }
        } else {
          // New email
          systemMessage = `You are an email assistant that helps compose professional emails.${styleHint} Always respond in JSON format with "subject" and "body" fields. IMPORTANT: The "body" field should contain ONLY the email body text - never include the subject line or any subject prefix in the body.`;

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
          model: getAiModel(userPlan),
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
          max_tokens: 512,
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;

        if (!content || content.trim().length === 0) {
          return res.status(422).json({
            error: "Unable to generate AI response",
            reason:
              "The email format or content could not be processed. This may be due to unusual formatting or unsupported content.",
            canRetry: true,
          });
        }

        // Increment usage for free plan users
        if (userPlan === "free") {
          await storage.incrementAiUsage(req.session.userId!);
        }

        try {
          const parsed = JSON.parse(content);

          // Clean body - remove any subject-like prefixes the AI may have incorrectly included
          let body = parsed.body || "";
          const originalSubject = originalEmail?.subject || "";

          // Remove common subject-like prefixes from body start
          const subjectPrefixes = [/^Re:\s*/i, /^Fwd:\s*/i, /^Subject:\s*/i];
          for (const regex of subjectPrefixes) {
            body = body.replace(regex, "");
          }

          // If the body starts with the subject text, remove it
          if (
            originalSubject &&
            body.toLowerCase().startsWith(originalSubject.toLowerCase())
          ) {
            body = body
              .substring(originalSubject.length)
              .replace(/^[\s\n:,-]+/, "");
          }
          if (
            originalSubject &&
            body
              .toLowerCase()
              .startsWith(`re: ${originalSubject.toLowerCase()}`)
          ) {
            body = body
              .substring(originalSubject.length + 4)
              .replace(/^[\s\n:,-]+/, "");
          }

          // Append email signature if enabled
          if (user?.signatureEnabled && user?.emailSignature) {
            body = `${body}\n\n${user.emailSignature}`;
          }

          // Get remaining count for free users
          const todayUsage =
            userPlan === "free"
              ? await storage.getAiUsageToday(req.session.userId!)
              : 0;
          const remaining =
            userPlan === "free" ? Math.max(0, 5 - todayUsage) : null;

          res.json({
            subject: parsed.subject || "",
            body,
            usage:
              userPlan === "free"
                ? { used: todayUsage, limit: 5, remaining }
                : null,
          });
        } catch {
          // Append signature even in fallback case
          let fallbackBody = content;
          if (user?.signatureEnabled && user?.emailSignature) {
            fallbackBody = `${fallbackBody}\n\n${user.emailSignature}`;
          }
          res.json({ subject: "", body: fallbackBody });
        }
      } catch (error: any) {
        console.error("Error generating quick draft:", error);

        let errorMessage = "Unable to generate AI response";
        let reason =
          "An unexpected error occurred while processing your request.";

        if (error?.code === "content_filter") {
          reason =
            "The email content was flagged by content filters and cannot be processed.";
        } else if (error?.code === "context_length_exceeded") {
          reason =
            "The email is too long to process. Try with a shorter email.";
        } else if (error?.message?.includes("rate limit")) {
          reason = "Too many requests. Please wait a moment and try again.";
        } else if (error?.message?.includes("timeout")) {
          reason = "The request timed out. Please try again.";
        }

        res.status(500).json({ error: errorMessage, reason, canRetry: true });
      }
    },
  );

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
      const isPro =
        userPlan === "pro" || userPlan === "premium" || userPlan === "business";

      const { content, polishType = "polish", subject } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      // Check if user has access to advanced polish options
      if (
        (polishType === "longer" ||
          polishType === "shorter" ||
          polishType === "concise") &&
        !isPro
      ) {
        return res.status(403).json({
          error: "Pro plan required for advanced polish options",
          requiredPlan: "pro",
          currentPlan: userPlan,
        });
      }

      let prompt: string;
      let systemMessage: string;

      switch (polishType) {
        case "longer":
          systemMessage =
            "You are an expert editor. Expand the given text while maintaining its core message and tone.";
          prompt = `Expand this email text to be longer and more detailed. Add more context, examples, or explanations while keeping the same professional tone. Do not add unnecessary fluff - make the additions meaningful.

Original text:
${content}

${subject ? `Context - Email subject: ${subject}` : ""}

Return only the expanded text, nothing else.`;
          break;

        case "shorter":
          systemMessage =
            "You are an expert editor. Shorten the given text while preserving key information.";
          prompt = `Make this email text shorter while keeping the essential message. Remove redundancy and unnecessary words.

Original text:
${content}

${subject ? `Context - Email subject: ${subject}` : ""}

Return only the shortened text, nothing else.`;
          break;

        case "concise":
          systemMessage =
            "You are an expert editor. Make the text more concise and direct.";
          prompt = `Rewrite this email text to be more concise and direct. Get straight to the point while maintaining professionalism.

Original text:
${content}

${subject ? `Context - Email subject: ${subject}` : ""}

Return only the concise version, nothing else.`;
          break;

        default: // "polish" - basic improvement
          systemMessage =
            "You are an expert editor. Improve the given text for clarity, grammar, and professionalism.";
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
          { role: "user", content: prompt },
        ],
        max_tokens: 1024,
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
        isAiGenerated: false,
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

      const updated = await storage.updateDraft(id, {
        status: "sent",
        scheduledAt: null,
      });

      res.json({
        success: true,
        message: "Reply sent successfully",
        draft: updated,
      });
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
        return res
          .status(400)
          .json({ error: "Scheduled time must be in the future" });
      }

      const updated = await storage.updateDraft(id, {
        status: "scheduled",
        scheduledAt: scheduledDate,
      });

      res.json({
        success: true,
        message: "Reply scheduled successfully",
        draft: updated,
      });
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
        scheduledAt: null,
      });

      res.json({
        success: true,
        message: "Schedule cancelled",
        draft: updated,
      });
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
      const {
        recipientEmail,
        recipientName,
        subject,
        content,
        emailId,
        isAiGenerated,
      } = req.body;

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

      const providerResult = await getProviderAndToken(req.session.userId!);
      let unreadCount = 0;

      if (providerResult) {
        try {
          const messages = await providerResult.provider.getMessages(
            providerResult.accessToken,
            { folder: targetFolder },
          );
          unreadCount = messages.filter(
            (m: any) => !m.isRead,
          ).length;
        } catch (err) {
          console.log(`Could not fetch ${targetFolder} for response time`);
        }
      } else {
        const emails = await storage.getEmails(targetFolder);
        unreadCount = emails.filter((e) => !e.isRead).length;
      }

      if (unreadCount === 0) {
        return res.json({
          estimatedMinutes: 0,
          unreadCount: 0,
          message: "All caught up!",
        });
      }

      // Fast calculation: ~3 minutes per email (reading + thinking + replying)
      const estimatedMinutes = Math.max(1, Math.round(unreadCount * 3));

      res.json({
        estimatedMinutes,
        unreadCount,
      });
    } catch (error) {
      console.error("Error estimating response time:", error);
      const emails = await storage.getEmails("inbox");
      const unreadEmails = emails.filter((e) => !e.isRead);
      const totalWords = unreadEmails.reduce((sum, email) => {
        return sum + email.body.split(/\s+/).filter((w) => w.length > 0).length;
      }, 0);
      const fallbackMinutes = Math.max(
        1,
        Math.round(unreadEmails.length * 3 + totalWords / 200),
      );
      res.json({
        estimatedMinutes: fallbackMinutes,
        unreadCount: unreadEmails.length,
        totalWords,
      });
    }
  });

  // ============ CONTACTS ENDPOINTS (Email Autocomplete) ============

  // Get all contacts for autocomplete
  app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
      const contacts = await storage.getContacts(req.session.userId!);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  // Search contacts
  app.get("/api/contacts/search", requireAuth, async (req, res) => {
    try {
      const query = String(req.query.q || "");
      if (!query) {
        const contacts = await storage.getContacts(req.session.userId!);
        res.json(contacts.slice(0, 10));
        return;
      }
      const contacts = await storage.searchContacts(req.session.userId!, query);
      res.json(contacts);
    } catch (error) {
      console.error("Error searching contacts:", error);
      res.status(500).json({ error: "Failed to search contacts" });
    }
  });

  // Save a contact
  app.post("/api/contacts", requireAuth, async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const contact = await storage.saveContact(
        req.session.userId!,
        email,
        name,
      );
      res.json(contact);
    } catch (error) {
      console.error("Error saving contact:", error);
      res.status(500).json({ error: "Failed to save contact" });
    }
  });

  // ============ ASSISTANT ENDPOINTS ============

  // Get assistant settings
  app.get("/api/assistant/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getAssistantSettings(req.session.userId!);
      if (!settings) {
        return res.json({
          selectedVoice: "vince",
          voiceOutputEnabled: false,
          canReadEmails: false,
          canDraftEmails: false,
          canSendEmails: false,
        });
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
      const {
        selectedVoice,
        voiceOutputEnabled,
        canReadEmails,
        canDraftEmails,
        canSendEmails,
      } = req.body;
      const settings = await storage.upsertAssistantSettings(
        req.session.userId!,
        {
          selectedVoice,
          voiceOutputEnabled,
          canReadEmails,
          canDraftEmails,
          canSendEmails,
        },
      );
      res.json(settings);
    } catch (error) {
      console.error("Error updating assistant settings:", error);
      res.status(500).json({ error: "Failed to update assistant settings" });
    }
  });

  // Get assistant conversation history
  app.get("/api/assistant/messages", requireAuth, async (req, res) => {
    try {
      const sessionId = req.query.sessionId
        ? parseInt(req.query.sessionId as string)
        : undefined;
      const messages = await storage.getAssistantMessages(
        req.session.userId!,
        sessionId,
      );
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
      const session = await storage.createChatSession(
        req.session.userId!,
        title,
      );
      res.json(session);
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Switch to a different chat session
  app.post(
    "/api/assistant/sessions/:sessionId/activate",
    requireAuth,
    async (req, res) => {
      try {
        const sessionId = parseInt(req.params.sessionId);
        await storage.setActiveSession(req.session.userId!, sessionId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error switching chat session:", error);
        res.status(500).json({ error: "Failed to switch chat session" });
      }
    },
  );

  // Delete a chat session
  app.delete(
    "/api/assistant/sessions/:sessionId",
    requireAuth,
    async (req, res) => {
      try {
        const sessionId = parseInt(req.params.sessionId);
        const deleted = await storage.deleteSession(
          req.session.userId!,
          sessionId,
        );
        if (!deleted) {
          return res.status(404).json({ error: "Chat session not found" });
        }
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting chat session:", error);
        res.status(500).json({ error: "Failed to delete chat session" });
      }
    },
  );

  // Rename a chat session
  app.patch(
    "/api/assistant/sessions/:sessionId",
    requireAuth,
    async (req, res) => {
      try {
        const sessionId = parseInt(req.params.sessionId);
        const { title } = req.body;
        if (!title || typeof title !== "string") {
          return res.status(400).json({ error: "Title is required" });
        }
        const updated = await storage.updateSessionTitle(
          req.session.userId!,
          sessionId,
          title,
        );
        if (!updated) {
          return res.status(404).json({ error: "Chat session not found" });
        }
        res.json(updated);
      } catch (error) {
        console.error("Error renaming chat session:", error);
        res.status(500).json({ error: "Failed to rename chat session" });
      }
    },
  );

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
          currentPlan: userPlan,
        });
      }

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Save user message
      await storage.addAssistantMessage(userId, "user", message);

      // Gather context for the assistant
      const user = await storage.getUser(userId);
      const providerResult = await getProviderAndToken(userId);
      const settings = await storage.getAssistantSettings(userId);

      const perms = {
        canReadEmails: settings?.canReadEmails ?? false,
        canDraftEmails: settings?.canDraftEmails ?? false,
        canSendEmails: settings?.canSendEmails ?? false,
        canArchive: true,
        canTrash: true,
        canSearch: true,
        requireConfirmation: true,
      };

      let providerMessages: any[] = [];
      let emailContext = "";

      if (providerResult && perms.canReadEmails) {
        try {
          providerMessages = await providerResult.provider.getMessages(providerResult.accessToken);
          // Log the read action
          await storage.createAuditLog(
            userId,
            "read",
            "executed",
            undefined,
            `Fetched ${providerMessages.length} emails for context`,
          );

          // Build detailed email context
          const recentEmails = providerMessages.slice(0, 15);
          emailContext = recentEmails
            .map((m: any, i: number) => {
              const fromEmail = m.fromEmail || "unknown";
              const fromName = m.from || fromEmail;
              const subject = m.subject || "(no subject)";
              const date = m.date instanceof Date
                ? m.date.toLocaleString()
                : m.date ? new Date(m.date).toLocaleString() : "unknown date";
              const unread = !m.isRead ? "[UNREAD]" : "";
              const starred = m.isStarred ? "[STARRED]" : "";
              const preview = (m.preview || "").substring(0, 150);
              return `${i + 1}. ${unread}${starred} FROM: ${fromName} <${fromEmail}>\n   SUBJECT: ${subject}\n   DATE: ${date}\n   PREVIEW: ${preview}...`;
            })
            .join("\n\n");
        } catch (e) {
          console.error("Error fetching email messages:", e);
          emailContext = "Unable to fetch emails at this time.";
        }
      }

      const assistantName = "Vince";

      const unreadCount = providerMessages.filter((m: any) => !m.isRead).length;
      const starredCount = providerMessages.filter((m: any) => m.isStarred).length;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEmails = providerMessages.filter(
        (m: any) => m.date && new Date(m.date) >= todayStart,
      );

      // Get recent conversation history for context
      const recentMessages = await storage.getAssistantMessages(userId);
      const conversationHistory = recentMessages.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const systemPrompt = `You are ${assistantName}, a helpful AI email assistant for MyDraft. You can only perform actions the user has granted you permission for.

PERSONALITY:
- Warm, capable, and proactive - like having a trusted executive assistant
- Confident in your abilities to help manage their inbox
- Natural and conversational, not robotic
- Encouraging and supportive about email management

YOUR CAPABILITIES (what you CAN do):
${perms.canReadEmails ? "- READ emails: You can see and read all their emails in detail" : "- READ: Disabled - user must enable 'Read emails' in permissions"}
${perms.canDraftEmails ? "- DRAFT emails: You can compose reply drafts and help write emails" : "- DRAFT: Disabled - user must enable 'Draft emails' in permissions"}
${perms.canSendEmails ? "- SEND emails: You can compose and send new emails (with confirmation)" : "- SEND: Disabled - user must enable 'Send emails' in permissions"}
${perms.canArchive ? "- ARCHIVE emails: You can archive emails (with confirmation)" : ""}  
${perms.canTrash ? "- TRASH emails: You can delete emails (with confirmation)" : ""}
${perms.canSearch ? "- SEARCH emails: You can search and find specific emails" : ""}

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
- Connected email: ${providerResult?.account?.email || "Not connected"}
- Email provider: ${providerResult?.account?.provider || "None"}
- Plan: ${user?.plan || "free"}

INBOX STATUS:
- Total emails visible: ${providerMessages.length}
- Unread emails: ${unreadCount}
- Starred emails: ${starredCount}
- Emails today: ${todayEmails.length}

${
  emailContext
    ? `CURRENT INBOX (most recent 15 emails):
${emailContext}`
    : "No emails loaded - user may need to connect their email account."
}

RESPONSE STYLE:
- Be specific when discussing emails - reference senders, subjects, and content
- When asked about an email, quote relevant parts
- Proactively offer to help with actions: "Would you like me to reply to this?" or "I can archive that for you"
- For action requests, explain what you'll do and ask for confirmation
- Keep responses conversational but informative`;

      // Add a brief thinking delay for more natural conversation feel (800-1500ms)
      const thinkingDelay = 800 + Math.random() * 700;
      await new Promise((resolve) => setTimeout(resolve, thinkingDelay));

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message },
        ],
        max_tokens: 800,
        temperature: 0.8,
      });

      let responseContent =
        completion.choices[0]?.message?.content ||
        "I apologize, I couldn't process that request.";

      // Check for action commands in the response and create pending actions
      const actionMatch = responseContent.match(
        /\[ACTION:(SEND|ARCHIVE|TRASH)(?::([^\]]+))?\]/,
      );
      if (actionMatch) {
        const actionType = actionMatch[1].toLowerCase();
        const messageId = actionMatch[2];

        // Create pending action for user confirmation
        if (actionType === "send" && perms.canSendEmails) {
          // Extract draft content from response
          const draftMatch = responseContent.match(
            /(?:draft|email):\s*([\s\S]*?)(?:\[ACTION|$)/i,
          );
          const draftBody = draftMatch?.[1]?.trim() || "";

          await storage.createAssistantAction({
            userId,
            actionType: "send",
            status: "pending",
            metadata: { body: draftBody },
          });
          await storage.createAuditLog(
            userId,
            "send",
            "initiated",
            undefined,
            "Draft created for user confirmation",
          );
        } else if (actionType === "archive" && messageId && perms.canArchive) {
          await storage.createAssistantAction({
            userId,
            actionType: "archive",
            status: "pending",
            metadata: { messageId },
          });
          await storage.createAuditLog(
            userId,
            "archive",
            "initiated",
            messageId,
            "Archive action pending confirmation",
          );
        } else if (actionType === "trash" && messageId && perms.canTrash) {
          await storage.createAssistantAction({
            userId,
            actionType: "trash",
            status: "pending",
            metadata: { messageId },
          });
          await storage.createAuditLog(
            userId,
            "trash",
            "initiated",
            messageId,
            "Trash action pending confirmation",
          );
        }

        // Remove action tags from displayed response
        responseContent = responseContent
          .replace(/\[ACTION:[^\]]+\]/g, "")
          .trim();
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
          currentPlan: userPlan,
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
      const allowedMimeTypes = [
        "audio/webm",
        "audio/mp3",
        "audio/wav",
        "audio/m4a",
        "audio/ogg",
      ];
      const safeMimeType = allowedMimeTypes.includes(mimeType)
        ? mimeType
        : "audio/webm";

      // Convert base64 to buffer and create a File object for Whisper
      const audioBuffer = Buffer.from(audio, "base64");
      const audioFile = new File([audioBuffer], "audio.webm", {
        type: safeMimeType,
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
          currentPlan: userPlan,
        });
      }

      const user = await storage.getUser(userId);
      const emailAccount = await storage.getEmailAccount(userId);
      const styleProfile = await storage.getUserStyleProfile(userId);
      const pendingActions = await storage.getPendingAssistantActions(userId);
      const settings = await storage.getAssistantSettings(userId);

      const defaultProfile = {
        tone: "professional",
        length: "medium",
        greetingStyle: "hi",
        signOff: "Best regards",
        formattingPreference: "paragraphs",
        allowedActions: "draft-only",
        customInstructions: undefined,
      };

      res.json({
        user: {
          id: user?.id,
          email: user?.email,
          plan: user?.plan,
          connectedEmail: emailAccount?.email,
          provider: emailAccount?.provider,
        },
        styleProfile: styleProfile?.profile || defaultProfile,
        pendingActions: pendingActions.map((a) => ({
          id: a.id,
          actionType: a.actionType,
          status: a.status,
          metadata: a.metadata,
          createdAt: a.createdAt,
        })),
        capabilities: {
          canRead: settings?.canReadEmails ?? false,
          canDraft: settings?.canDraftEmails ?? false,
          canSend: (settings?.canSendEmails ?? false) && !!emailAccount,
          canArchive: !!emailAccount,
          canTrash: !!emailAccount,
          canSearch: !!emailAccount,
        },
        permissions: {
          canReadEmails: settings?.canReadEmails ?? false,
          canDraftEmails: settings?.canDraftEmails ?? false,
          canSendEmails: settings?.canSendEmails ?? false,
        },
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
          currentPlan: userPlan,
        });
      }

      const {
        tone,
        length,
        greetingStyle,
        signOff,
        formattingPreference,
        allowedActions,
        customInstructions,
      } = req.body;

      const profile = await storage.upsertUserStyleProfile(userId, {
        tone,
        length,
        greetingStyle,
        signOff,
        formattingPreference,
        allowedActions,
        customInstructions,
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
        maxEmailsPerDay: 10,
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
          details: parseResult.error.errors.map((e) => e.message),
        });
      }

      const validatedData = parseResult.data;

      // Reject empty updates
      if (Object.keys(validatedData).length === 0) {
        return res
          .status(400)
          .json({ error: "No permission updates provided" });
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
        maxEmailsPerDay: 10,
      };

      const currentPermissions = currentPerms?.permissions || defaultPerms;

      // SECURITY: Enforce that requireConfirmation cannot be disabled if destructive permissions are enabled
      const sensitivePerms = ["canSendEmails", "canArchive", "canTrash"];
      const hasDestructiveEnabled = sensitivePerms.some(
        (p) =>
          (validatedData as any)[p] === true ||
          ((currentPermissions as any)[p] === true &&
            (validatedData as any)[p] !== false),
      );

      if (
        validatedData.requireConfirmation === false &&
        hasDestructiveEnabled
      ) {
        return res.status(403).json({
          error:
            "Security policy requires confirmation for accounts with send, archive, or trash permissions enabled",
          code: "CONFIRMATION_REQUIRED",
        });
      }

      // SECURITY: When enabling destructive permissions, ensure confirmation stays on
      const enablingDestructive = sensitivePerms.some(
        (p) => (validatedData as any)[p] === true,
      );
      const newPermissions = { ...currentPermissions, ...validatedData };

      if (enablingDestructive && !newPermissions.requireConfirmation) {
        newPermissions.requireConfirmation = true;
      }

      const result = await storage.upsertAssistantPermissions(
        userId,
        newPermissions,
      );

      // Log permission changes with before/after values for security audit
      const changes = Object.entries(validatedData)
        .map(
          ([key, value]) =>
            `${key}: ${(currentPermissions as any)[key]} → ${value}`,
        )
        .join(", ");
      await storage.createAuditLog(
        userId,
        "permissions_update",
        "executed",
        undefined,
        `Permission changes: ${changes}`,
      );

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

  // Get AI savings stats
  app.get("/api/ai/savings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const logs = await storage.getRecentAuditLogs(userId, 1000);

      // Calculate time saved based on action types
      // Assumptions:
      // - Draft generation: saves 5 minutes per draft
      // - Email summary: saves 2 minutes per summary
      // - Inbox refresh/suggestion: saves 3 minutes per action
      // - Read context: saves 1 minute per read
      // - Send/archive/trash: saves 1 minute per action

      let minutesSaved = 0;
      let draftCount = 0;
      let summaryCount = 0;
      let actionCount = 0;

      for (const log of logs) {
        const actionType = log.actionType?.toLowerCase() || "";

        if (
          actionType.includes("draft") ||
          actionType.includes("compose") ||
          actionType.includes("reply")
        ) {
          minutesSaved += 5;
          draftCount++;
        } else if (
          actionType.includes("summary") ||
          actionType.includes("summarize")
        ) {
          minutesSaved += 2;
          summaryCount++;
        } else if (
          actionType.includes("refresh") ||
          actionType.includes("suggest")
        ) {
          minutesSaved += 3;
          actionCount++;
        } else if (
          actionType.includes("send") ||
          actionType.includes("archive") ||
          actionType.includes("trash")
        ) {
          minutesSaved += 1;
          actionCount++;
        } else if (actionType.includes("read")) {
          minutesSaved += 1;
          actionCount++;
        }
      }

      // Calculate money saved
      // Average email assistant/VA costs ~$25/hour
      const hourlyRate = 25;
      const hoursSaved = minutesSaved / 60;
      const moneySaved = hoursSaved * hourlyRate;

      res.json({
        minutesSaved,
        hoursSaved: Math.round(hoursSaved * 10) / 10,
        moneySaved: Math.round(moneySaved * 100) / 100,
        draftCount,
        summaryCount,
        actionCount,
        totalActions: logs.length,
      });
    } catch (error) {
      console.error("Error calculating savings:", error);
      res.status(500).json({ error: "Failed to calculate savings" });
    }
  });

  // Generate quick AI suggestion for email reply (requires Pro+)
  app.post("/api/ai/quick-suggestion", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;

      // Plan gating: requires Pro or Premium
      const userPlan = await getUserPlan(userId);
      if (!hasPlan(userPlan, "pro")) {
        return res.status(403).json({
          error: "Plan upgrade required",
          requiredPlan: "pro",
          currentPlan: userPlan,
        });
      }

      const { subject, sender, preview } = req.body;

      if (!subject || !sender) {
        return res.status(400).json({ error: "Subject and sender required" });
      }

      const user = await storage.getUser(userId);
      const styleProfile = await storage.getUserStyleProfile(userId);

      const profile = styleProfile?.profile || {
        tone: "professional",
        length: "medium",
      };

      // Generate a very brief suggestion using AI
      const prompt = `You are an email assistant. Based on this email, provide a ONE sentence suggestion for how to respond. Be concise and helpful.

Email from: ${sender}
Subject: ${subject}
Preview: ${preview || "No preview available"}

User's preferred tone: ${profile.tone || "professional"}

Respond with ONLY a brief suggestion, like:
- "Confirm the meeting time and thank them for the update"
- "Politely decline and suggest an alternative date"
- "Request more details about the project requirements"`;

      const completion = await openai.chat.completions.create({
        model: getAiModel(userPlan),
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
      });

      const suggestion =
        completion.choices[0]?.message?.content?.trim() ||
        "Click to draft a response with AI";

      res.json({ suggestion });
    } catch (error) {
      console.error("Error generating quick suggestion:", error);
      res.status(500).json({ error: "Failed to generate suggestion" });
    }
  });

  // Generate AI draft (compose/reply/reply-all/forward) (requires Pro+)
  app.post(
    "/api/ai/draft",
    requireAuth,
    aiGenerationLimiter,
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const user = await storage.getUser(userId);

        // Feature flag check: is AI draft enabled for this user?
        const aiDraftEnabled = await storage.isFeatureEnabled(
          "ai_draft",
          user?.email || "",
        );
        if (!aiDraftEnabled) {
          return res.status(403).json({
            error: "AI Draft feature is currently disabled",
            featureDisabled: true,
          });
        }

        // Plan gating: requires Pro or Premium
        const userPlan = await getUserPlan(userId);
        if (!hasPlan(userPlan, "pro")) {
          return res.status(403).json({
            error: "Plan upgrade required",
            requiredPlan: "pro",
            currentPlan: userPlan,
          });
        }

        const { actionType, messageId, instructions, to, cc, bcc, subject } =
          req.body;

        if (
          !actionType ||
          !["compose", "reply", "reply-all", "forward"].includes(actionType)
        ) {
          return res
            .status(400)
            .json({
              error:
                "Valid actionType required: compose, reply, reply-all, forward",
            });
        }

        const providerResult = await getProviderAndToken(userId);
        const styleProfile = await storage.getUserStyleProfile(userId);

        const profile = styleProfile?.profile || {
          tone: "professional",
          length: "medium",
          greetingStyle: "hi",
          signOff: "Best regards",
          formattingPreference: "paragraphs",
        };

        let originalMessage: any = null;
        let originalBody = "";
        let recipientEmail = "";
        let recipientName = "";
        let originalSubject = "";

        if (messageId && actionType !== "compose") {
          if (providerResult) {
            try {
              const fullMessage = await providerResult.provider.getMessage(providerResult.accessToken, messageId);
              if (fullMessage) {
                originalMessage = fullMessage;
                originalBody = stripEmailNoise(
                  typeof fullMessage.body === "string"
                    ? fullMessage.body
                    : "",
                );
                recipientEmail = fullMessage.fromEmail || "";
                recipientName = fullMessage.from || "";
                originalSubject = fullMessage.subject || "";
              }
            } catch (e) {
              console.error("Error fetching original message:", e);
            }
          }
        }

        // Build the draft prompt
        const profileWithCustom = profile as typeof profile & {
          customInstructions?: string;
        };
        const toneGuide = {
          professional: "formal, business-appropriate language",
          friendly: "warm and approachable tone",
          concise: "brief and to-the-point",
          casual: "relaxed and conversational",
          custom: profileWithCustom.customInstructions || "professional tone",
        };

        const lengthGuide = {
          short: "1-2 short paragraphs maximum",
          medium: "2-3 paragraphs",
          long: "detailed response with multiple paragraphs",
        };

        const greetingGuide = {
          none: "No greeting, start directly with content",
          hi: "Start with 'Hi' or 'Hello'",
          name: `Start with 'Hi ${recipientName}' or 'Hello ${recipientName}'`,
          formal: `Start with 'Dear ${recipientName || "Sir/Madam"}'`,
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
          model: getAiModel(userPlan),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 800,
          temperature: 0.7,
        });

        let draftBody = completion.choices[0]?.message?.content || "";

        // Append email signature if enabled
        if (user?.signatureEnabled && user?.emailSignature) {
          draftBody = `${draftBody}\n\n${user.emailSignature}`;
        }

        // Create a pending action for this draft
        const action = await storage.createAssistantAction({
          userId,
          actionType: actionType === "compose" ? "send" : actionType,
          status: "pending",
          metadata: {
            messageId: messageId || undefined,
            to: to ? [to] : recipientEmail ? [recipientEmail] : undefined,
            cc: cc || undefined,
            bcc: bcc || undefined,
            subject:
              subject ||
              (actionType === "reply" || actionType === "reply-all"
                ? `Re: ${originalSubject}`
                : actionType === "forward"
                  ? `Fwd: ${originalSubject}`
                  : undefined),
            body: draftBody,
            originalMessageId: messageId || undefined,
          },
        });

        res.json({
          actionId: action.id,
          actionType,
          draft: {
            to: to || recipientEmail,
            cc,
            bcc,
            subject: action.metadata?.subject,
            body: draftBody,
          },
          status: "pending",
        });
      } catch (error) {
        console.error("Error generating AI draft:", error);
        res.status(500).json({ error: "Failed to generate draft" });
      }
    },
  );

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
          currentPlan: userPlan,
        });
      }

      const { draft, improvementType, customInstructions } = req.body;

      if (!draft || typeof draft !== "string") {
        return res.status(400).json({ error: "Draft content is required" });
      }

      const styleProfile = await storage.getUserStyleProfile(userId);
      const profile = styleProfile?.profile || {
        tone: "professional",
        length: "medium",
      };

      const improvementPrompts: Record<string, string> = {
        shorter: "Make this email more concise while keeping the key points.",
        longer: "Expand this email with more detail and context.",
        formal: "Make this email more professional and formal.",
        casual: "Make this email more friendly and casual.",
        clearer: "Improve the clarity and readability of this email.",
        grammar: "Fix any grammar, spelling, or punctuation errors.",
        tone: `Adjust the tone to be more ${profile.tone}.`,
        custom: customInstructions || "Improve this email.",
      };

      const instruction =
        improvementPrompts[improvementType] || improvementPrompts.clearer;

      const completion = await openai.chat.completions.create({
        model: getAiModel(userPlan),
        messages: [
          {
            role: "system",
            content:
              "You are an email editing assistant. Improve the provided email draft according to the instructions. Return only the improved email body, no explanations.",
          },
          {
            role: "user",
            content: `${instruction}\n\nOriginal draft:\n${draft}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const improvedDraft = completion.choices[0]?.message?.content || draft;

      res.json({
        original: draft,
        improved: improvedDraft,
        improvementType,
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
          currentPlan: userPlan,
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
        return res
          .status(400)
          .json({ error: `Action already ${action.status}` });
      }

      const providerResult = await getProviderAndToken(userId);
      if (!providerResult) {
        return res.status(400).json({ error: "No email account connected" });
      }

      const settings = await storage.getAssistantSettings(userId);
      const canSend = settings?.canSendEmails ?? false;

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
            if (!canSend) {
              result = {
                success: false,
                error:
                  "Send permission not granted. Enable 'Send emails' in assistant permissions.",
              };
              break;
            }
            if (finalMetadata?.to && finalMetadata?.body) {
              await providerResult.provider.sendMessage(providerResult.accessToken, {
                to: finalMetadata.to as string[],
                subject: finalMetadata.subject || "",
                body: finalMetadata.body as string,
                replyToMessageId: action.actionType !== "send"
                  ? finalMetadata.originalMessageId
                  : undefined,
                cc: finalMetadata.cc as string[] | undefined,
                bcc: finalMetadata.bcc as string[] | undefined,
              });

              // Save contacts for autocomplete
              const allRecipients = [
                ...(Array.isArray(finalMetadata.to)
                  ? finalMetadata.to
                  : [finalMetadata.to]),
                ...(Array.isArray(finalMetadata.cc)
                  ? finalMetadata.cc
                  : finalMetadata.cc
                    ? [finalMetadata.cc]
                    : []),
                ...(Array.isArray(finalMetadata.bcc)
                  ? finalMetadata.bcc
                  : finalMetadata.bcc
                    ? [finalMetadata.bcc]
                    : []),
              ];
              for (const email of allRecipients) {
                if (email) {
                  storage
                    .saveContact(userId, String(email))
                    .catch((err) =>
                      console.warn("Failed to save contact:", err),
                    );
                }
              }

              result = { success: true, message: "Email sent successfully" };
            } else {
              result = { success: false, error: "Missing recipient or body" };
            }
            break;

          case "trash":
            if (finalMetadata?.messageId) {
              // Use local storage
              await storage.setLocalEmailFolder(
                userId,
                finalMetadata.messageId,
                "trash",
              );
              result = { success: true, message: "Email moved to trash" };
            } else {
              result = { success: false, error: "Missing messageId" };
            }
            break;

          case "archive":
            if (finalMetadata?.messageId) {
              // Use local storage
              await storage.setLocalEmailFolder(
                userId,
                finalMetadata.messageId,
                "archived",
              );
              result = { success: true, message: "Email archived" };
            } else {
              result = { success: false, error: "Missing messageId" };
            }
            break;

          case "restore":
          case "move_to_inbox":
            if (finalMetadata?.messageId) {
              // Use local storage - restore to inbox
              await storage.restoreEmailToInbox(
                userId,
                finalMetadata.messageId,
              );
              result = { success: true, message: "Email restored to inbox" };
            } else {
              result = { success: false, error: "Missing messageId" };
            }
            break;

          default:
            result = {
              success: false,
              error: `Unknown action type: ${action.actionType}`,
            };
        }
      } catch (actionError) {
        console.error("Email action error:", actionError);
        result = { success: false, error: "Failed to execute email action" };
      }

      // Update action status
      const newStatus = result.success ? "executed" : "pending";
      await storage.updateAssistantActionStatus(
        actionId,
        newStatus,
        result.success ? new Date() : undefined,
      );

      res.json({
        ...result,
        actionId,
        status: newStatus,
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
          currentPlan: userPlan,
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
          currentPlan: userPlan,
        });
      }

      const { assistantMessageId, rating, tags, comment } = req.body;

      if (!assistantMessageId) {
        return res
          .status(400)
          .json({ error: "assistantMessageId is required" });
      }

      // Create feedback record
      const feedback = await storage.createAssistantFeedback({
        userId,
        assistantMessageId,
        rating: rating || null,
        tags: tags || null,
        comment: comment || null,
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
      const notification = await storage.markNotificationAsRead(
        userId,
        notificationId,
      );
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
  app.post(
    "/api/notifications/mark-all-read",
    requireAuth,
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        await storage.markAllNotificationsAsRead(userId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ error: "Failed to mark notifications as read" });
      }
    },
  );

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ error: "Invalid notification ID" });
      }
      const deleted = await storage.deleteNotification(userId, notificationId);
      if (!deleted) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  app.delete("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.clearAllNotifications(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing notifications:", error);
      res.status(500).json({ error: "Failed to clear notifications" });
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
        return res
          .status(403)
          .json({
            error: "Team invites are only available on the Business plan",
          });
      }

      // Check team member limit (max 1 member = 2 total including owner)
      const memberCount = await storage.getTeamMemberCount(userId);
      if (memberCount >= 1) {
        return res
          .status(400)
          .json({
            error:
              "Team limit reached. Business plan allows 1 additional team member.",
          });
      }

      // Check if pending invites already exist
      const sentInvites = await storage.getSentInvites(userId);
      const pendingCount = sentInvites.filter(
        (i) => i.status === "pending",
      ).length;
      if (pendingCount + memberCount >= 1) {
        return res
          .status(400)
          .json({ error: "You already have a pending invite or team member." });
      }

      // Find the invitee user
      const invitee = await storage.getUserByEmail(
        inviteeEmail.toLowerCase().trim(),
      );
      if (!invitee) {
        return res
          .status(404)
          .json({
            error:
              "User not found. They must have an account to receive an invite.",
          });
      }

      // Can't invite yourself
      if (invitee.id === userId) {
        return res.status(400).json({ error: "You cannot invite yourself" });
      }

      // Check if invitee is already a team member somewhere
      const existingMembership = await storage.getTeamMembership(invitee.id);
      if (existingMembership) {
        return res
          .status(400)
          .json({ error: "This user is already on another team" });
      }

      // Check if there's already a pending invite
      const existingInvites = sentInvites.filter(
        (i) => i.inviteeId === invitee.id && i.status === "pending",
      );
      if (existingInvites.length > 0) {
        return res
          .status(400)
          .json({ error: "You already have a pending invite to this user" });
      }

      // Create the invite
      const invite = await storage.createTeamInvite({
        inviterId: userId,
        inviteeId: invitee.id,
        status: "pending",
      });

      // Create notification for invitee
      await storage.createNotification({
        userId: invitee.id,
        type: "team_invite_received",
        title: "Team Invite Received",
        message: `${user.email} invited you to join their team`,
        isRead: false,
        data: {
          inviteId: invite.id,
          inviterId: userId,
          inviterEmail: user.email,
        },
      });

      // Log activity
      await storage.createActivityLog(
        userId,
        user.email,
        "team_invite_sent",
        `Invited ${inviteeEmail} to team`,
      );

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
      const enrichedInvites = await Promise.all(
        invites.map(async (invite) => {
          const invitee = await storage.getUser(invite.inviteeId);
          return {
            ...invite,
            inviteeEmail: invitee?.email || "Unknown",
          };
        }),
      );

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
      const enrichedInvites = await Promise.all(
        invites.map(async (invite) => {
          const inviter = await storage.getUser(invite.inviterId);
          return {
            ...invite,
            inviterEmail: inviter?.email || "Unknown",
          };
        }),
      );

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
        return res
          .status(400)
          .json({ error: "This invite has already been responded to" });
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
        data: { inviteId },
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
        return res
          .status(400)
          .json({ error: "This invite has already been responded to" });
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
        data: { inviteId },
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
      const enrichedMembers = await Promise.all(
        members.map(async (member) => {
          const memberUser = await storage.getUser(member.memberId);
          return {
            ...member,
            memberEmail: memberUser?.email || "Unknown",
          };
        }),
      );

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
        data: {},
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
          joinedAt: membership.joinedAt,
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
      const isOwner =
        ownerEmail && user.email.toLowerCase().trim() === ownerEmail;

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
      const thirtyDaysAgo = new Date(
        today.getTime() - 30 * 24 * 60 * 60 * 1000,
      );

      // Calculate signups
      const signupsToday = allUsers.filter(
        (u) => new Date(u.createdAt) >= today,
      ).length;
      const signupsThisWeek = allUsers.filter(
        (u) => new Date(u.createdAt) >= sevenDaysAgo,
      ).length;

      // Active users (simplified - users created in timeframe for now)
      const activeUsers7Days = allUsers.filter(
        (u) => new Date(u.createdAt) >= sevenDaysAgo,
      ).length;
      const activeUsers30Days = allUsers.filter(
        (u) => new Date(u.createdAt) >= thirtyDaysAgo,
      ).length;

      // Get connected email accounts count
      const usersWithGrants = await Promise.all(
        allUsers.map(async (user) => {
          const account = await storage.getEmailAccount(user.id);
          return account ? 1 : 0;
        }),
      );
      const connectedAccounts = usersWithGrants.reduce(
        (sum: number, val: number) => sum + val,
        0 as number,
      );

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
        estimatedMRR: userStats.pro * 24 + userStats.premium * 49,
      });
    } catch (error) {
      console.error("Error fetching owner stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Suspend/unsuspend user
  app.post(
    "/api/owner/users/:userId/suspend",
    requireOwner,
    async (req, res) => {
      try {
        const { userId } = req.params;
        const { suspended } = req.body;
        // TODO: Add suspended field to users table and implement
        res.json({ success: true, userId, suspended });
      } catch (error) {
        console.error("Error suspending user:", error);
        res.status(500).json({ error: "Failed to update user status" });
      }
    },
  );

  // Reset user AI usage limits
  app.post(
    "/api/owner/users/:userId/reset-limits",
    requireOwner,
    async (req, res) => {
      try {
        const { userId } = req.params;
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        // Reset dailyAICount to 0 and clear lastAICountReset
        await storage.updateUser(userId, {
          dailyAICount: 0,
          lastAICountReset: new Date(),
        });
        res.json({ success: true, message: "Usage limits reset" });
      } catch (error) {
        console.error("Error resetting limits:", error);
        res.status(500).json({ error: "Failed to reset limits" });
      }
    },
  );

  // Get system status
  app.get("/api/owner/system-status", requireOwner, async (req, res) => {
    try {
      // Check various service statuses
      const status = {
        database: "healthy",
        google: process.env.GOOGLE_CLIENT_ID ? "configured" : "not_configured",
        microsoft: process.env.MICROSOFT_CLIENT_ID ? "configured" : "not_configured",
        stripe: process.env.STRIPE_SECRET_KEY ? "configured" : "not_configured",
        openai: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
          ? "configured"
          : "not_configured",
        lastChecked: new Date().toISOString(),
      };
      res.json(status);
    } catch (error) {
      console.error("Error fetching system status:", error);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  app.get("/api/owner/api-health/summary", requireOwner, async (req, res) => {
    try {
      const summary = await getHealthSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching health summary:", error);
      res.status(500).json({ error: "Failed to fetch health summary" });
    }
  });

  app.get("/api/owner/api-health/logs", requireOwner, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await getRecentHealthLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching health logs:", error);
      res.status(500).json({ error: "Failed to fetch health logs" });
    }
  });

  app.get("/api/owner/api-health/unresolved", requireOwner, async (req, res) => {
    try {
      const issues = await getUnresolvedIssues();
      res.json(issues);
    } catch (error) {
      console.error("Error fetching unresolved issues:", error);
      res.status(500).json({ error: "Failed to fetch unresolved issues" });
    }
  });

  app.post("/api/owner/api-health/resolve/:id", requireOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await resolveIssue(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resolving issue:", error);
      res.status(500).json({ error: "Failed to resolve issue" });
    }
  });

  app.post("/api/owner/api-health/resolve-all", requireOwner, async (req, res) => {
    try {
      await resolveAllIssues();
      res.json({ success: true });
    } catch (error) {
      console.error("Error resolving all issues:", error);
      res.status(500).json({ error: "Failed to resolve all issues" });
    }
  });

  // Get feature flags
  app.get("/api/owner/feature-flags", requireOwner, async (req, res) => {
    try {
      const flags = await storage.getAllFeatureFlags();

      // If no flags exist yet, initialize defaults
      if (flags.length === 0) {
        const defaults = [
          {
            key: "ai_chat",
            description: "AI Chat & Voice Assistant",
            enabled: true,
            allowedEmails: [],
          },
          {
            key: "ai_draft",
            description: "AI Draft Generation",
            enabled: true,
            allowedEmails: [],
          },
          {
            key: "ai_polish",
            description: "AI Polish Feature",
            enabled: true,
            allowedEmails: [],
          },
          {
            key: "voice_assistant",
            description: "Voice Assistant",
            enabled: true,
            allowedEmails: [],
          },
          {
            key: "show_testimonials",
            description: "Show Testimonials on Landing Page",
            enabled: false,
            allowedEmails: [],
          },
        ];

        for (const flag of defaults) {
          await storage.setFeatureFlag(
            flag.key,
            flag.enabled,
            flag.allowedEmails,
            flag.description,
          );
        }

        const newFlags = await storage.getAllFeatureFlags();
        return res.json(newFlags);
      }

      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ error: "Failed to fetch flags" });
    }
  });

  // Toggle feature flag
  app.patch("/api/owner/feature-flags/:key", requireOwner, async (req, res) => {
    try {
      const { key } = req.params;
      const { enabled, allowedEmails, description } = req.body;

      const updated = await storage.setFeatureFlag(
        key,
        enabled,
        allowedEmails,
        description,
      );
      res.json(updated);
    } catch (error) {
      console.error("Error updating feature flag:", error);
      res.status(500).json({ error: "Failed to update flag" });
    }
  });

  // Check if feature is enabled for current user (public endpoint for app to check)
  app.get("/api/feature-enabled/:key", requireAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const enabled = await storage.isFeatureEnabled(key, user.email);
      res.json({ key, enabled });
    } catch (error) {
      console.error("Error checking feature flag:", error);
      res.status(500).json({ error: "Failed to check feature" });
    }
  });

  // Public endpoint to check site display settings (no auth needed)
  app.get("/api/site-settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const allowedKeys = ["show_testimonials"];
      if (!allowedKeys.includes(key)) {
        return res.status(404).json({ error: "Setting not found" });
      }
      const flag = await storage.getFeatureFlag(key);
      res.json({ key, enabled: flag?.enabled ?? false });
    } catch (error) {
      console.error("Error checking site setting:", error);
      res.status(500).json({ error: "Failed to check setting" });
    }
  });

  // Get all users for owner
  app.get("/api/owner/users", requireOwner, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();

      // Enrich with connected email provider
      const enrichedUsers = await Promise.all(
        allUsers.map(async (user) => {
          const emailAccount = await storage.getEmailAccount(user.id);
          return {
            id: user.id,
            email: user.email,
            plan: user.plan,
            onboardingCompleted: user.onboardingCompleted,
            createdAt: user.createdAt,
            connectedProvider: emailAccount?.provider || null,
            connectedEmail: emailAccount?.email || null,
          };
        }),
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
  app.patch(
    "/api/owner/feedback/:id/status",
    requireOwner,
    async (req, res) => {
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
    },
  );

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
        return res
          .status(400)
          .json({ error: "Title and message are required" });
      }

      let targetUserIds: string[] = [];

      if (target === "all") {
        const allUsers = await storage.getAllUsers();
        targetUserIds = allUsers.map((u) => u.id);
      } else if (target === "plan" && targetPlan) {
        const planUsers = await storage.getUsersByPlan(targetPlan);
        targetUserIds = planUsers.map((u) => u.id);
      } else if (target === "specific" && userIds && Array.isArray(userIds)) {
        targetUserIds = userIds;
      } else {
        return res.status(400).json({ error: "Invalid target specification" });
      }

      await storage.sendNotificationToUsers(
        targetUserIds,
        type || "admin_notification",
        title,
        message,
      );

      res.json({ success: true, sentTo: targetUserIds.length });
    } catch (error) {
      console.error("Error sending notifications:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  app.post("/api/owner/email/broadcast", requireOwner, async (req, res) => {
    try {
      const { target, targetPlan, subject, body } = req.body;

      if (!subject || !body) {
        return res.status(400).json({ error: "Subject and body are required" });
      }

      let users: any[] = [];
      if (target === "all") {
        users = await storage.getAllUsers();
      } else if (target === "paid") {
        const proUsers = await storage.getUsersByPlan("pro");
        const premiumUsers = await storage.getUsersByPlan("premium");
        users = [...proUsers, ...premiumUsers];
      } else if (target === "plan" && targetPlan) {
        users = await storage.getUsersByPlan(targetPlan);
      } else {
        return res.status(400).json({ error: "Invalid target" });
      }

      const { sendBroadcastEmail } = await import("./email");
      let sent = 0;
      let failed = 0;
      for (const user of users) {
        try {
          const success = await sendBroadcastEmail(user.email, subject, body);
          if (success) sent++;
          else failed++;
        } catch { failed++; }
      }

      res.json({ success: true, sent, failed, total: users.length });
    } catch (error) {
      console.error("Error sending broadcast:", error);
      res.status(500).json({ error: "Failed to send broadcast" });
    }
  });

  app.get("/api/owner/email/stats", requireOwner, async (req, res) => {
    try {
      const { getResendStats } = await import("./email");
      const stats = await getResendStats();
      res.json({ stats, monthlyLimit: 3000 });
    } catch (error) {
      console.error("Error fetching email stats:", error);
      res.status(500).json({ error: "Failed to fetch email stats" });
    }
  });

  // Update user plan (owner only)
  app.patch("/api/owner/users/:userId/plan", requireOwner, async (req, res) => {
    try {
      const { userId } = req.params;
      const { plan } = req.body;

      if (!plan || !["free", "pro", "premium", "business"].includes(plan)) {
        return res
          .status(400)
          .json({
            error: "Invalid plan. Must be free, pro, premium, or business",
          });
      }

      // Map business to premium for internal storage
      const storedPlan = plan === "business" ? "premium" : plan;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const oldPlan = user.plan;
      const updatedUser = await storage.updateUser(userId, {
        plan: storedPlan,
      });

      // Log the plan change
      await storage.createActivityLog(
        userId,
        user.email,
        storedPlan === "free" ? "plan_downgrade" : "plan_upgrade",
        `Plan changed from ${oldPlan} to ${storedPlan} by owner`,
      );

      res.json({
        success: true,
        user: {
          id: updatedUser?.id,
          email: updatedUser?.email,
          plan: updatedUser?.plan,
        },
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
      res.json(
        users.map((u) => ({
          id: u.id,
          email: u.email,
          plan: u.plan,
          createdAt: u.createdAt,
        })),
      );
    } catch (error) {
      console.error("Error fetching users by plan:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // ==================== TESTIMONIALS ROUTES ====================

  // Get approved testimonials (public - for landing page)
  app.get("/api/testimonials", async (req, res) => {
    try {
      const testimonialsList = await storage.getApprovedTestimonials();
      res.json(testimonialsList);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  });

  // Submit a testimonial (requires auth)
  app.post("/api/testimonials", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Check if user already has a testimonial
      const existing = await storage.getUserTestimonial(userId);
      if (existing) {
        return res
          .status(400)
          .json({ error: "You have already submitted a testimonial" });
      }

      const { content, rating } = req.body;

      if (!content || content.trim().length < 10) {
        return res
          .status(400)
          .json({ error: "Testimonial must be at least 10 characters" });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res
          .status(400)
          .json({ error: "Rating must be between 1 and 5" });
      }

      const testimonial = await storage.createTestimonial({
        userId,
        userName: user.displayName || user.email.split("@")[0],
        userEmail: user.email,
        content: content.trim(),
        rating,
        status: "pending",
        isFounder: false,
      });

      res.json(testimonial);
    } catch (error) {
      console.error("Error submitting testimonial:", error);
      res.status(500).json({ error: "Failed to submit testimonial" });
    }
  });

  app.post("/api/testimonial-reward", async (req, res) => {
    try {
      const { token, testimonial, rating } = req.body;

      if (!token || !testimonial || typeof rating !== "number") {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      if (testimonial.trim().length < 10) {
        return res.status(400).json({ error: "Testimonial must be at least 10 characters" });
      }

      const { verifyTestimonialToken } = await import("./email");
      const verified = verifyTestimonialToken(token);
      if (!verified) {
        return res.status(403).json({ error: "Invalid or expired link" });
      }

      const userId = verified.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const existing = await storage.getUserTestimonial(userId);
      if (existing) {
        return res.status(400).json({ error: "You have already submitted a testimonial" });
      }

      await storage.createTestimonial({
        userId,
        userName: user.displayName || user.email.split("@")[0],
        userEmail: user.email,
        content: testimonial.trim(),
        rating,
        status: "pending",
        isFounder: false,
      });

      let rewardApplied = false;
      if (user.stripeSubscriptionId) {
        try {
          const { getUncachableStripeClient } = await import("./stripeClient");
          const stripe = await getUncachableStripeClient();
          const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (sub.status === "active" || sub.status === "trialing") {
            const currentEnd = sub.current_period_end;
            const newEnd = currentEnd + 30 * 24 * 60 * 60;
            await stripe.subscriptions.update(user.stripeSubscriptionId, {
              trial_end: newEnd,
              proration_behavior: "none",
            });
            rewardApplied = true;
          }
        } catch (stripeErr) {
          console.error("[Testimonial] Failed to extend subscription:", stripeErr);
          return res.status(500).json({ error: "Testimonial saved but we couldn't apply the free month. Please contact support." });
        }
      }

      res.json({ success: true, rewardApplied });
    } catch (error) {
      console.error("Error processing testimonial reward:", error);
      res.status(500).json({ error: "Failed to process testimonial" });
    }
  });

  // Get user's own testimonial
  app.get("/api/testimonials/mine", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const testimonial = await storage.getUserTestimonial(userId);
      res.json(testimonial || null);
    } catch (error) {
      console.error("Error fetching user testimonial:", error);
      res.status(500).json({ error: "Failed to fetch testimonial" });
    }
  });

  // Owner: Get all testimonials
  app.get("/api/owner/testimonials", requireOwner, async (req, res) => {
    try {
      const testimonialsList = await storage.getAllTestimonials();
      res.json(testimonialsList);
    } catch (error) {
      console.error("Error fetching all testimonials:", error);
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  });

  // Owner: Update testimonial status (approve/deny)
  app.patch(
    "/api/owner/testimonials/:id/status",
    requireOwner,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { status } = req.body;

        if (!["pending", "approved", "denied"].includes(status)) {
          return res.status(400).json({ error: "Invalid status" });
        }

        const updated = await storage.updateTestimonialStatus(id, status);
        if (!updated) {
          return res.status(404).json({ error: "Testimonial not found" });
        }

        res.json(updated);
      } catch (error) {
        console.error("Error updating testimonial:", error);
        res.status(500).json({ error: "Failed to update testimonial" });
      }
    },
  );

  // Owner: Delete testimonial
  app.delete("/api/owner/testimonials/:id", requireOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTestimonial(id);

      if (!success) {
        return res.status(404).json({ error: "Testimonial not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      res.status(500).json({ error: "Failed to delete testimonial" });
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
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
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
      const {
        category,
        serviceName,
        amount,
        description,
        billingPeriod,
        isRecurring,
        metadata,
      } = req.body;

      if (!category || !serviceName || amount === undefined) {
        return res
          .status(400)
          .json({ error: "Category, service name, and amount are required" });
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
  app.patch(
    "/api/owner/finances/expenses/:id",
    requireOwner,
    async (req, res) => {
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
    },
  );

  // Delete expense
  app.delete(
    "/api/owner/finances/expenses/:id",
    requireOwner,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await storage.deleteExpense(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting expense:", error);
        res.status(500).json({ error: "Failed to delete expense" });
      }
    },
  );

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
      const {
        userId,
        userEmail,
        plan,
        amount,
        type,
        description,
        revenueDate,
      } = req.body;

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

  // AI cost summary for owner dashboard
  app.get("/api/owner/ai-costs", requireOwner, async (req, res) => {
    try {
      const { days = "30" } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(days as string));

      const summary = await storage.getAiCostSummary(
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );
      res.json(summary);
    } catch (error) {
      console.error("Error fetching AI costs:", error);
      res.status(500).json({ error: "Failed to fetch AI costs" });
    }
  });

  // ==================== OWNER NOTES ROUTES ====================

  // Get all owner notes
  app.get("/api/owner/notes", requireOwner, async (req, res) => {
    try {
      const notes = await db
        .select()
        .from(ownerNotes)
        .orderBy(desc(ownerNotes.isPinned), desc(ownerNotes.updatedAt));
      res.json(notes);
    } catch (error) {
      console.error("Error fetching owner notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  // Create a new owner note
  app.post("/api/owner/notes", requireOwner, async (req, res) => {
    try {
      const { content, category = "general", isPinned = false } = req.body;

      if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Note content is required" });
      }

      const [note] = await db
        .insert(ownerNotes)
        .values({
          content: content.trim(),
          category,
          isPinned,
        })
        .returning();

      res.json(note);
    } catch (error) {
      console.error("Error creating owner note:", error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // Update an owner note
  app.patch("/api/owner/notes/:id", requireOwner, async (req, res) => {
    try {
      const { id } = req.params;
      const { content, category, isPinned } = req.body;

      const updates: any = { updatedAt: new Date() };
      if (content !== undefined) updates.content = content.trim();
      if (category !== undefined) updates.category = category;
      if (isPinned !== undefined) updates.isPinned = isPinned;

      const [note] = await db
        .update(ownerNotes)
        .set(updates)
        .where(eq(ownerNotes.id, parseInt(id)))
        .returning();

      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      res.json(note);
    } catch (error) {
      console.error("Error updating owner note:", error);
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  // Delete an owner note
  app.delete("/api/owner/notes/:id", requireOwner, async (req, res) => {
    try {
      const { id } = req.params;

      await db.delete(ownerNotes).where(eq(ownerNotes.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting owner note:", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // ==================== REFERRAL ROUTES ====================

  app.get("/api/referrals/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      let referralCode = user.referralCode;
      if (!referralCode) {
        referralCode = await storage.generateReferralCode(userId);
      }

      const stats = await storage.getReferralStats(userId);
      const referralsList = await storage.getReferrals(userId);
      const canClaimReward = await storage.getUnclaimedReferralReward(userId);
      const claimedCodes = await storage.getPromoCodesByOwner(userId);

      res.json({
        referralCode,
        stats,
        referrals: referralsList,
        proCreditsUntil: user.proCreditsUntil,
        progressToNextReward: canClaimReward ? 1 : 0,
        subscribedNeeded: canClaimReward ? 0 : 1,
        canClaimReward,
        claimedCodes: claimedCodes.map(c => ({
          code: c.code,
          redeemed: c.redeemed,
          creditMonths: c.creditMonths,
          expiresAt: c.expiresAt,
          createdAt: c.createdAt,
        })),
      });
    } catch (error) {
      console.error("Error getting referral stats:", error);
      res.status(500).json({ error: "Failed to get referral stats" });
    }
  });

  app.post("/api/referrals/generate-code", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const code = await storage.generateReferralCode(userId);
      res.json({ referralCode: code });
    } catch (error) {
      console.error("Error generating referral code:", error);
      res.status(500).json({ error: "Failed to generate referral code" });
    }
  });

  app.post("/api/referrals/claim-reward", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const canClaim = await storage.getUnclaimedReferralReward(userId);
      if (!canClaim) {
        return res.status(400).json({ error: "No unclaimed reward available. You need 1 subscribed referral per reward." });
      }
      const promoCode = await storage.createPromoCode(userId, "referral_reward", 1);
      res.json({
        success: true,
        promoCode: promoCode.code,
        creditMonths: promoCode.creditMonths,
        expiresAt: promoCode.expiresAt,
      });
    } catch (error) {
      console.error("Error claiming referral reward:", error);
      res.status(500).json({ error: "Failed to claim reward" });
    }
  });

  app.get("/api/referrals/my-codes", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const codes = await storage.getPromoCodesByOwner(userId);
      res.json({ codes });
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ error: "Failed to fetch promo codes" });
    }
  });

  app.post("/api/promo/validate", requireAuth, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Promo code is required" });
      }
      const promoCode = await storage.getPromoCodeByCode(code.toUpperCase().trim());
      if (!promoCode) {
        return res.status(404).json({ error: "Invalid promo code" });
      }
      if (promoCode.redeemed) {
        return res.status(400).json({ error: "This promo code has already been used" });
      }
      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This promo code has expired" });
      }
      res.json({
        valid: true,
        creditMonths: promoCode.creditMonths,
        type: promoCode.type,
      });
    } catch (error) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ error: "Failed to validate promo code" });
    }
  });

  app.post("/api/promo/redeem", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Promo code is required" });
      }
      const redeemed = await storage.redeemPromoCode(code.toUpperCase().trim(), userId);
      res.json({
        success: true,
        creditMonths: redeemed.creditMonths,
        message: `${redeemed.creditMonths} month${redeemed.creditMonths > 1 ? "s" : ""} of Pro added to your account!`,
      });
    } catch (error: any) {
      console.error("Error redeeming promo code:", error);
      res.status(400).json({ error: error.message || "Failed to redeem promo code" });
    }
  });

  // ==================== STRIPE PAYMENT ROUTES ====================

  // Get Stripe publishable key for frontend
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error("Error getting Stripe key:", error?.message || error);
      console.error("REPLIT_CONNECTORS_HOSTNAME:", process.env.REPLIT_CONNECTORS_HOSTNAME ? "set" : "NOT SET");
      console.error("REPL_IDENTITY:", process.env.REPL_IDENTITY ? "set" : "NOT SET");
      console.error("WEB_REPL_RENEWAL:", process.env.WEB_REPL_RENEWAL ? "set" : "NOT SET");
      console.error("REPLIT_DEPLOYMENT:", process.env.REPLIT_DEPLOYMENT);
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
        `,
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
            prices: [],
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

  // Create Setup Intent for custom checkout (card collection for subscription with trial)
  app.post("/api/stripe/create-setup-intent", requireAuth, async (req, res) => {
    try {
      const { plan, interval } = req.body;

      if (!plan || !["pro", "business"].includes(plan)) {
        return res.status(400).json({ error: "Valid plan is required" });
      }

      if (!interval || !["annual", "monthly"].includes(interval)) {
        return res.status(400).json({ error: "Valid interval is required" });
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

      // Create a SetupIntent to collect payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        metadata: {
          userId: user.id,
          plan: plan === "business" ? "premium" : plan,
          interval,
        },
      });

      res.json({
        clientSecret: setupIntent.client_secret,
        customerId,
      });
    } catch (error) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ error: "Failed to initialize payment" });
    }
  });

  // Confirm subscription after payment method is collected (handles both new subs and upgrades)
  app.post(
    "/api/stripe/confirm-subscription",
    requireAuth,
    async (req, res) => {
      try {
        const { plan, interval, paymentMethodId } = req.body;

        if (!plan || !["pro", "business"].includes(plan)) {
          return res.status(400).json({ error: "Valid plan is required" });
        }

        if (!interval || !["annual", "monthly"].includes(interval)) {
          return res.status(400).json({ error: "Valid interval is required" });
        }

        if (!paymentMethodId) {
          return res.status(400).json({ error: "Payment method is required" });
        }

        const user = await storage.getUser(req.session.userId!);
        if (!user || !user.stripeCustomerId) {
          return res.status(404).json({ error: "User not found" });
        }

        const { getUncachableStripeClient } = await import("./stripeClient");
        const stripe = await getUncachableStripeClient();

        const internalPlan = plan === "business" ? "premium" : plan;

        // Define pricing
        const pricing: Record<string, Record<string, number>> = {
          pro: { monthly: 1000, annual: 9900 },
          business: { monthly: 2900, annual: 29900 },
        };

        const amount = pricing[plan][interval];
        const recurringInterval = interval === "annual" ? "year" : "month";
        const productName = plan === "pro" ? "MyDraft Pro" : "MyDraft Business";

        // Attach payment method to customer
        try {
          await stripe.paymentMethods.attach(paymentMethodId, {
            customer: user.stripeCustomerId,
          });
        } catch (attachErr: any) {
          // Payment method might already be attached - that's okay
          if (!attachErr.message?.includes("already been attached")) {
            throw attachErr;
          }
        }

        // Set as default payment method
        await stripe.customers.update(user.stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });

        // Find or create the product
        let product;
        const existingProducts = await stripe.products.list({ limit: 100 });
        product = existingProducts.data.find(
          (p) => p.name === productName && p.active,
        );

        if (!product) {
          product = await stripe.products.create({
            name: productName,
            metadata: { plan: internalPlan },
          });
        }

        // Find or create the price
        const existingPrices = await stripe.prices.list({
          product: product.id,
          limit: 100,
        });
        let price = existingPrices.data.find(
          (p) =>
            p.active &&
            p.unit_amount === amount &&
            p.recurring?.interval === recurringInterval,
        );

        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: amount,
            currency: "usd",
            recurring: { interval: recurringInterval },
            metadata: { plan: internalPlan },
          });
        }

        // Check for existing active subscription
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "all",
          limit: 10,
        });

        const activeSubscription = existingSubscriptions.data.find((sub) =>
          ["active", "trialing"].includes(sub.status),
        );

        if (activeSubscription) {
          // UPGRADE: Update existing subscription to the new plan/price
          const currentItem = activeSubscription.items.data[0];
          const updateParams: any = {
            items: [{ id: currentItem.id, price: price.id }],
            proration_behavior: "create_prorations",
            default_payment_method: paymentMethodId,
            metadata: { userId: user.id, plan: internalPlan },
          };

          if (activeSubscription.cancel_at_period_end) {
            updateParams.cancel_at_period_end = false;
          }

          const updatedSub = await stripe.subscriptions.update(
            activeSubscription.id,
            updateParams,
          );

          await storage.updateUser(user.id, {
            stripeSubscriptionId: updatedSub.id,
            plan: internalPlan as any,
            onboardingCompleted: true,
          });

          await storage.createActivityLog(
            user.id,
            user.email,
            "plan_upgraded",
            `Plan changed to ${internalPlan} (${interval})`,
          );

          return res.json({
            success: true,
            subscriptionId: updatedSub.id,
            upgraded: true,
            message: `Plan updated to ${productName}`,
          });
        }

        const subscription = await stripe.subscriptions.create({
          customer: user.stripeCustomerId,
          items: [{ price: price.id }],
          default_payment_method: paymentMethodId,
          metadata: { userId: user.id, plan: internalPlan },
        });

        await storage.updateUser(user.id, {
          stripeSubscriptionId: subscription.id,
          plan: internalPlan as any,
          onboardingCompleted: true,
          trialEndsAt: null,
        });

        res.json({
          success: true,
          subscriptionId: subscription.id,
          trialEnd: subscription.trial_end,
        });
      } catch (error: any) {
        console.error("Error confirming subscription:", error);
        res
          .status(500)
          .json({ error: error.message || "Failed to create subscription" });
      }
    },
  );

  // Legacy: Create checkout session for subscription (redirect to Stripe)
  app.post("/api/stripe/checkout", requireAuth, async (req, res) => {
    try {
      const { plan, interval } = req.body;

      if (!plan || !["pro", "business"].includes(plan)) {
        return res
          .status(400)
          .json({ error: "Valid plan (pro or business) is required" });
      }

      if (!interval || !["annual", "monthly"].includes(interval)) {
        return res
          .status(400)
          .json({ error: "Valid interval (annual or monthly) is required" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      // Define pricing (in cents)
      const pricing: Record<string, Record<string, number>> = {
        pro: {
          monthly: 1000, // $10.00 in cents
          annual: 9900, // $99.00 in cents
        },
        business: {
          monthly: 2900, // $29.00 in cents
          annual: 29900, // $299.00 in cents
        },
      };

      const amount = pricing[plan][interval];
      const recurringInterval = interval === "annual" ? "year" : "month";
      const productNames: Record<string, string> = {
        pro: "MyDraft Pro",
        business: "MyDraft Business",
      };
      const productName = productNames[plan];

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

      // Find or create the product
      let product;
      const existingProducts = await stripe.products.list({ limit: 100 });
      product = existingProducts.data.find(
        (p) => p.name === productName && p.active,
      );

      if (!product) {
        product = await stripe.products.create({
          name: productName,
          metadata: { plan: plan === "business" ? "premium" : plan },
        });
      }

      // Find or create the price for this interval
      const existingPrices = await stripe.prices.list({
        product: product.id,
        limit: 100,
      });
      let price = existingPrices.data.find(
        (p) =>
          p.active &&
          p.unit_amount === amount &&
          p.recurring?.interval === recurringInterval,
      );

      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: amount,
          currency: "usd",
          recurring: { interval: recurringInterval },
          metadata: { plan: plan === "business" ? "premium" : plan },
        });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

      console.log(
        "Creating checkout session for user:",
        user.id,
        "plan:",
        plan,
        "interval:",
        interval,
        "price:",
        price.id,
      );

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        billing_address_collection: "required",
        subscription_data: {
          metadata: {
            userId: String(user.id),
            plan: plan === "business" ? "premium" : plan,
          },
        },
        success_url: `${baseUrl}/select-plan?success=true`,
        cancel_url: `${baseUrl}/select-plan?canceled=true`,
        metadata: {
          userId: String(user.id),
          plan: plan === "business" ? "premium" : plan,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error(
        "Error creating checkout session:",
        error?.message || error,
      );
      console.error("Full error:", JSON.stringify(error, null, 2));
      res
        .status(500)
        .json({
          error: "Failed to create checkout session",
          details: error?.message,
        });
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
        sql`SELECT * FROM stripe.subscriptions WHERE id = ${user.stripeSubscriptionId}`,
      );

      const subscription = result.rows[0] || null;
      res.json({ subscription, plan: user.plan });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Get detailed billing information
  app.get("/api/stripe/billing-info", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.stripeCustomerId) {
        return res.json({
          hasSubscription: false,
          nextBillDate: null,
          invoices: [],
          paymentMethod: null,
        });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      // Get subscription details for next bill date
      let nextBillDate = null;
      let currentPeriodEnd = null;
      let subscriptionStatus = null;
      let planName = null;
      let planAmount = null;
      let planInterval = null;
      let cancelAtPeriodEnd = false;
      let cancelAt = null;

      if (user.stripeSubscriptionId) {
        try {
          const subscriptionResponse = await stripe.subscriptions.retrieve(
            user.stripeSubscriptionId,
          );
          const subscription = subscriptionResponse as any;
          currentPeriodEnd = subscription.current_period_end;
          nextBillDate = new Date(
            subscription.current_period_end * 1000,
          ).toISOString();
          subscriptionStatus = subscription.status;
          cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
          cancelAt = subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000).toISOString()
            : null;

          // Get plan details from subscription items
          if (subscription.items.data.length > 0) {
            const price = subscription.items.data[0].price;
            planAmount = price.unit_amount;
            planInterval = price.recurring?.interval;
            if (price.product && typeof price.product === "string") {
              const product = await stripe.products.retrieve(price.product);
              planName = product.name;
            }
          }
        } catch (e) {
          console.error("Error fetching subscription:", e);
        }
      }

      // Get past invoices
      let invoices: any[] = [];
      try {
        const invoiceList = await stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 10,
        });
        invoices = invoiceList.data.map((inv) => ({
          id: inv.id,
          number: inv.number,
          amount: inv.amount_paid,
          currency: inv.currency,
          status: inv.status,
          date: new Date(inv.created * 1000).toISOString(),
          pdfUrl: inv.invoice_pdf,
          hostedUrl: inv.hosted_invoice_url,
        }));
      } catch (e) {
        console.error("Error fetching invoices:", e);
      }

      // Get payment method (last 4 digits of card)
      let paymentMethod = null;
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: "card",
          limit: 1,
        });
        if (paymentMethods.data.length > 0) {
          const pm = paymentMethods.data[0];
          paymentMethod = {
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            expMonth: pm.card?.exp_month,
            expYear: pm.card?.exp_year,
          };
        }
      } catch (e) {
        console.error("Error fetching payment methods:", e);
      }

      res.json({
        hasSubscription: !!user.stripeSubscriptionId,
        nextBillDate,
        currentPeriodEnd,
        subscriptionStatus,
        planName,
        planAmount,
        planInterval,
        cancelAtPeriodEnd,
        cancelAt,
        invoices,
        paymentMethod,
      });
    } catch (error) {
      console.error("Error fetching billing info:", error);
      res.status(500).json({ error: "Failed to fetch billing info" });
    }
  });

  // Cancel subscription (actually cancels on Stripe + downgrades locally)
  app.post("/api/stripe/cancel", requireAuth, async (req, res) => {
    try {
      const { immediately, reason } = req.body || {};
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeSubscriptionId || !user.stripeCustomerId) {
        await storage.updateUser(user.id, { plan: "free" });
        return res.json({ success: true, message: "Plan set to free" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const reasonLabel = reason ? {
        too_expensive: "Too expensive",
        not_enough_features: "Not enough features",
        found_alternative: "Found a better alternative",
        too_complicated: "Too complicated to use",
        not_using_enough: "Not using it enough",
        missing_integration: "Missing an integration",
        poor_performance: "Poor performance or too slow",
        temporary: "Taking a break",
        other: "Other",
      }[reason as string] || reason : "No reason provided";

      if (immediately) {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        await storage.updateUser(user.id, {
          plan: "free",
          stripeSubscriptionId: null,
        });

        await storage.createActivityLog(
          user.id,
          user.email,
          "subscription_canceled",
          `Subscription canceled immediately. Reason: ${reasonLabel}`,
        );

        try {
          const { sendPlanCancelEmail } = await import("./email");
          const planLabel = user.plan === "premium" ? "Business" : user.plan === "pro" ? "Pro" : "Free";
          await sendPlanCancelEmail(user.email, planLabel);
        } catch (emailErr) { console.error("Failed to send cancel email:", emailErr); }

        res.json({
          success: true,
          message: "Subscription canceled immediately",
        });
      } else {
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        const sub = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId,
        );

        await storage.createActivityLog(
          user.id,
          user.email,
          "subscription_cancel_scheduled",
          `Subscription set to cancel at period end. Reason: ${reasonLabel}`,
        );

        const cancelAtDate = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        try {
          const { sendPlanCancelEmail } = await import("./email");
          const planLabel = user.plan === "premium" ? "Business" : user.plan === "pro" ? "Pro" : "Free";
          await sendPlanCancelEmail(user.email, planLabel, cancelAtDate || undefined);
        } catch (emailErr) { console.error("Failed to send cancel email:", emailErr); }

        res.json({
          success: true,
          message:
            "Your subscription will remain active until the end of your billing period, then it will be canceled.",
          cancelAt: cancelAtDate,
        });
      }
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to cancel subscription" });
    }
  });

  // Reactivate subscription (undo cancel-at-period-end)
  app.post("/api/stripe/reactivate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res
          .status(400)
          .json({ error: "No subscription to reactivate. Please subscribe first." });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        return res
          .status(400)
          .json({ error: `Subscription is ${subscription.status} and cannot be reactivated. Please subscribe again.` });
      }

      if (!subscription.cancel_at_period_end) {
        return res.json({ success: true, message: "Subscription is already active." });
      }

      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      await storage.createActivityLog(
        user.id,
        user.email,
        "subscription_reactivated",
        `Subscription reactivated — cancellation undone`,
      );

      res.json({
        success: true,
        message: "Your subscription has been reactivated.",
      });
    } catch (error: any) {
      console.error("Error reactivating subscription:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to reactivate subscription" });
    }
  });

  // Change plan (upgrade/downgrade between paid plans with proration)
  app.post("/api/stripe/change-plan", requireAuth, async (req, res) => {
    try {
      const { plan, interval } = req.body;

      if (!plan || !["pro", "business"].includes(plan)) {
        return res
          .status(400)
          .json({ error: "Valid plan (pro or business) is required" });
      }

      if (!interval || !["annual", "monthly"].includes(interval)) {
        return res
          .status(400)
          .json({ error: "Valid interval (annual or monthly) is required" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeSubscriptionId || !user.stripeCustomerId) {
        return res
          .status(400)
          .json({
            error: "No active subscription to change. Please subscribe first.",
          });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      // Get existing subscription
      const subscription = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId,
      );
      if (
        !subscription ||
        !["active", "trialing"].includes(subscription.status)
      ) {
        return res
          .status(400)
          .json({
            error: "No active subscription found. Please subscribe first.",
          });
      }

      // Pricing
      const pricing: Record<string, Record<string, number>> = {
        pro: { monthly: 1000, annual: 9900 },
        business: { monthly: 2900, annual: 29900 },
      };

      const amount = pricing[plan][interval];
      const recurringInterval = interval === "annual" ? "year" : "month";
      const productName = plan === "pro" ? "MyDraft Pro" : "MyDraft Business";
      const internalPlan = plan === "business" ? "premium" : plan;

      // Find or create product
      let product;
      const existingProducts = await stripe.products.list({ limit: 100 });
      product = existingProducts.data.find(
        (p) => p.name === productName && p.active,
      );

      if (!product) {
        product = await stripe.products.create({
          name: productName,
          metadata: { plan: internalPlan },
        });
      }

      // Find or create price
      const existingPrices = await stripe.prices.list({
        product: product.id,
        limit: 100,
      });
      let price = existingPrices.data.find(
        (p) =>
          p.active &&
          p.unit_amount === amount &&
          p.recurring?.interval === recurringInterval,
      );

      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: amount,
          currency: "usd",
          recurring: { interval: recurringInterval },
          metadata: { plan: internalPlan },
        });
      }

      // Update the subscription's item to the new price (Stripe handles proration automatically)
      const currentItem = subscription.items.data[0];

      // Also undo any pending cancellation
      const updateParams: any = {
        items: [
          {
            id: currentItem.id,
            price: price.id,
          },
        ],
        proration_behavior: "create_prorations",
        metadata: { userId: user.id, plan: internalPlan },
      };

      // If subscription was set to cancel at period end, undo that
      if (subscription.cancel_at_period_end) {
        updateParams.cancel_at_period_end = false;
      }

      const updatedSubscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId,
        updateParams,
      );

      // Update local plan
      const oldPlan = user.plan;
      await storage.updateUser(user.id, { plan: internalPlan as any });

      await storage.createActivityLog(
        user.id,
        user.email,
        "plan_changed",
        `Plan changed from ${oldPlan} to ${internalPlan} (${interval})`,
      );

      res.json({
        success: true,
        plan: internalPlan,
        subscriptionId: updatedSubscription.id,
        message: `Plan changed to ${productName} (${interval})`,
      });
    } catch (error: any) {
      console.error("Error changing plan:", error);
      res.status(500).json({ error: error.message || "Failed to change plan" });
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

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
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

  // ==================== EMAIL CAMPAIGN ROUTES (Business Plan Only) ====================

  // Middleware to check if user has Business plan
  async function requireBusinessPlan(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (user.plan !== "premium") {
      return res
        .status(403)
        .json({ error: "Email campaigns require a Business plan" });
    }
    next();
  }

  // Get all campaigns for the current user
  app.get(
    "/api/campaigns",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const campaigns = await storage.getCampaigns(req.session.userId!);
        res.json(campaigns);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
        res.status(500).json({ error: "Failed to fetch campaigns" });
      }
    },
  );

  // Get a single campaign
  app.get(
    "/api/campaigns/:id",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const campaign = await storage.getCampaign(id);

        if (!campaign || campaign.userId !== req.session.userId) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        const recipients = await storage.getCampaignRecipients(id);
        res.json({ ...campaign, recipients });
      } catch (error) {
        console.error("Error fetching campaign:", error);
        res.status(500).json({ error: "Failed to fetch campaign" });
      }
    },
  );

  // Create a new campaign
  app.post(
    "/api/campaigns",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const { name, subject, body, recipients } = req.body;

        if (!name || !subject || !body) {
          return res
            .status(400)
            .json({ error: "Name, subject, and body are required" });
        }

        const campaign = await storage.createCampaign({
          userId: req.session.userId!,
          name,
          subject,
          body,
          status: "draft",
          totalRecipients: 0,
        });

        // Add recipients if provided
        if (recipients && Array.isArray(recipients) && recipients.length > 0) {
          await storage.addCampaignRecipients(campaign.id, recipients);
        }

        const updatedCampaign = await storage.getCampaign(campaign.id);
        res.json(updatedCampaign);
      } catch (error) {
        console.error("Error creating campaign:", error);
        res.status(500).json({ error: "Failed to create campaign" });
      }
    },
  );

  // Update a campaign
  app.patch(
    "/api/campaigns/:id",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const campaign = await storage.getCampaign(id);

        if (!campaign || campaign.userId !== req.session.userId) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.status === "sending" || campaign.status === "completed") {
          return res
            .status(400)
            .json({
              error: "Cannot edit a campaign that is sending or completed",
            });
        }

        const { name, subject, body, status } = req.body;
        const updates: Record<string, any> = {};

        if (name !== undefined) updates.name = name;
        if (subject !== undefined) updates.subject = subject;
        if (body !== undefined) updates.body = body;
        if (status !== undefined) updates.status = status;

        const updated = await storage.updateCampaign(id, updates);
        res.json(updated);
      } catch (error) {
        console.error("Error updating campaign:", error);
        res.status(500).json({ error: "Failed to update campaign" });
      }
    },
  );

  // Delete a campaign
  app.delete(
    "/api/campaigns/:id",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const campaign = await storage.getCampaign(id);

        if (!campaign || campaign.userId !== req.session.userId) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.status === "sending") {
          return res
            .status(400)
            .json({
              error: "Cannot delete a campaign that is currently sending",
            });
        }

        await storage.deleteCampaign(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting campaign:", error);
        res.status(500).json({ error: "Failed to delete campaign" });
      }
    },
  );

  // Add recipients to a campaign
  app.post(
    "/api/campaigns/:id/recipients",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const campaign = await storage.getCampaign(id);

        if (!campaign || campaign.userId !== req.session.userId) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.status !== "draft") {
          return res
            .status(400)
            .json({ error: "Can only add recipients to draft campaigns" });
        }

        const { recipients } = req.body;

        if (
          !recipients ||
          !Array.isArray(recipients) ||
          recipients.length === 0
        ) {
          return res
            .status(400)
            .json({ error: "Recipients array is required" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validRecipients = recipients.filter(
          (r: any) => r.email && emailRegex.test(r.email),
        );

        if (validRecipients.length === 0) {
          return res
            .status(400)
            .json({ error: "No valid email addresses provided" });
        }

        const added = await storage.addCampaignRecipients(id, validRecipients);
        res.json({ added: added.length, recipients: added });
      } catch (error) {
        console.error("Error adding recipients:", error);
        res.status(500).json({ error: "Failed to add recipients" });
      }
    },
  );

  // Get recipients for a campaign
  app.get(
    "/api/campaigns/:id/recipients",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const campaign = await storage.getCampaign(id);

        if (!campaign || campaign.userId !== req.session.userId) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        const recipients = await storage.getCampaignRecipients(id);
        res.json(recipients);
      } catch (error) {
        console.error("Error fetching recipients:", error);
        res.status(500).json({ error: "Failed to fetch recipients" });
      }
    },
  );

  // Clear all recipients from a campaign
  app.delete(
    "/api/campaigns/:id/recipients",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const campaign = await storage.getCampaign(id);

        if (!campaign || campaign.userId !== req.session.userId) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.status !== "draft") {
          return res
            .status(400)
            .json({ error: "Can only clear recipients from draft campaigns" });
        }

        await storage.clearCampaignRecipients(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error clearing recipients:", error);
        res.status(500).json({ error: "Failed to clear recipients" });
      }
    },
  );

  // Delete a single recipient
  app.delete(
    "/api/campaigns/:id/recipients/:recipientId",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const recipientId = parseInt(req.params.recipientId);
        const campaign = await storage.getCampaign(id);

        if (!campaign || campaign.userId !== req.session.userId) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.status !== "draft") {
          return res
            .status(400)
            .json({ error: "Can only remove recipients from draft campaigns" });
        }

        await storage.deleteCampaignRecipient(recipientId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting recipient:", error);
        res.status(500).json({ error: "Failed to delete recipient" });
      }
    },
  );

  // Helper: replace personalization variables in text
  function replaceVariables(
    text: string,
    recipient: { email: string; name?: string | null },
  ): string {
    const firstName = recipient.name ? recipient.name.split(" ")[0] : "";
    const lastName = recipient.name
      ? recipient.name.split(" ").slice(1).join(" ")
      : "";
    return text
      .replace(/\{name\}/gi, recipient.name || "")
      .replace(/\{first_name\}/gi, firstName)
      .replace(/\{last_name\}/gi, lastName)
      .replace(/\{email\}/gi, recipient.email)
      .replace(
        /\{company\}/gi,
        recipient.email.split("@")[1]?.split(".")[0] || "",
      );
  }

  // Send test campaign email to self
  app.post(
    "/api/campaigns/:id/test",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const campaign = await storage.getCampaign(id);

        if (!campaign || campaign.userId !== req.session.userId) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        const providerResult = await getProviderAndToken(req.session.userId!);
        if (!providerResult) {
          return res
            .status(400)
            .json({ error: "Please connect your email account first" });
        }

        const user = await storage.getUser(req.session.userId!);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const testRecipient = {
          email: user.email,
          name: user.email.split("@")[0].replace(/[._]/g, " "),
        };

        const personalizedSubject = replaceVariables(
          campaign.subject,
          testRecipient,
        );
        const personalizedBody = replaceVariables(campaign.body, testRecipient);

        const testSubject = `[TEST] ${personalizedSubject}`;

        await providerResult.provider.sendMessage(providerResult.accessToken, {
          to: [user.email],
          subject: testSubject,
          body: personalizedBody,
        });

        res.json({ message: "Test email sent to your inbox" });
      } catch (error) {
        console.error("Error sending test campaign:", error);
        res.status(500).json({ error: "Failed to send test email" });
      }
    },
  );

  // Preview campaign with variable replacement
  app.post(
    "/api/campaigns/:id/preview",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const campaign = await storage.getCampaign(id);

        if (!campaign || campaign.userId !== req.session.userId) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        const { recipientEmail, recipientName } = req.body;
        const testRecipient = {
          email: recipientEmail || "john@example.com",
          name: recipientName || "John Doe",
        };

        res.json({
          subject: replaceVariables(campaign.subject, testRecipient),
          body: replaceVariables(campaign.body, testRecipient),
          recipient: testRecipient,
        });
      } catch (error) {
        console.error("Error previewing campaign:", error);
        res.status(500).json({ error: "Failed to preview campaign" });
      }
    },
  );

  // Send a campaign (start sending emails)
  app.post(
    "/api/campaigns/:id/send",
    requireAuth,
    requireBusinessPlan,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const campaign = await storage.getCampaign(id);

        if (!campaign || campaign.userId !== req.session.userId) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.status !== "draft") {
          return res
            .status(400)
            .json({ error: "Can only send draft campaigns" });
        }

        const recipients = await storage.getCampaignRecipients(id);

        if (recipients.length === 0) {
          return res
            .status(400)
            .json({ error: "No recipients in this campaign" });
        }

        const providerResult = await getProviderAndToken(req.session.userId!);
        if (!providerResult) {
          return res
            .status(400)
            .json({ error: "Please connect your email account first" });
        }

        await storage.updateCampaign(id, {
          status: "sending",
          startedAt: new Date(),
        });

        (async () => {
          let sentCount = 0;
          let failedCount = 0;

          for (const recipient of recipients) {
            try {
              const personalizedSubject = replaceVariables(
                campaign.subject,
                recipient,
              );
              const personalizedBody = replaceVariables(
                campaign.body,
                recipient,
              );

              await providerResult.provider.sendMessage(providerResult.accessToken, {
                to: [recipient.email],
                subject: personalizedSubject,
                body: personalizedBody,
              });

              storage
                .saveContact(
                  req.session.userId!,
                  recipient.email,
                  recipient.name || undefined,
                )
                .catch((err) => console.warn("Failed to save contact:", err));

              await storage.updateCampaignRecipientStatus(recipient.id, "sent");
              sentCount++;
            } catch (error: any) {
              console.error(`Failed to send to ${recipient.email}:`, error);
              await storage.updateCampaignRecipientStatus(
                recipient.id,
                "failed",
                error.message || "Unknown error",
              );
              failedCount++;
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          await storage.updateCampaign(id, {
            status: "completed",
            sentCount,
            failedCount,
            completedAt: new Date(),
          });
        })();

        res.json({
          message: "Campaign started",
          totalRecipients: recipients.length,
        });
      } catch (error) {
        console.error("Error starting campaign:", error);
        res.status(500).json({ error: "Failed to start campaign" });
      }
    },
  );

  return httpServer;
}
