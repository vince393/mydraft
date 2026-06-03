import { storage } from "./storage";
import { gmailProvider } from "./gmail";
import { microsoftProvider } from "./microsoft";
import type { IEmailProvider } from "./email-provider";
import { spendCredits, refundCredits, getBalance, getActionCost } from "./credits";

let schedulerInterval: NodeJS.Timeout | null = null;
let autoSortInterval: NodeJS.Timeout | null = null;
const autoSortedEmails = new Map<string, Set<string>>();
let autoSortRunning = false;

async function captureWritingSample(userId: string, subject: string, body: string) {
  try {
    const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
    
    if (wordCount < 10) {
      return;
    }

    await storage.createWritingSample({
      userId,
      sampleType: "sent_email",
      originalContent: body,
      finalContent: body,
      context: subject,
      wordCount,
    });

    await storage.deleteOldWritingSamples(userId, 20);
    console.log(`[EmailScheduler] Captured writing sample for user ${userId} (${wordCount} words)`);

    const sampleCount = await storage.getWritingSampleCount(userId);
    const existingStyle = await storage.getLearnedWritingStyle(userId);
    
    if (sampleCount >= 3 && (!existingStyle || existingStyle.samplesAnalyzed < sampleCount - 2)) {
      triggerStyleAnalysis(userId).catch(err => 
        console.error("[EmailScheduler] Background style analysis failed:", err)
      );
    }
  } catch (error) {
    console.error("[EmailScheduler] Failed to capture writing sample:", error);
  }
}

const analysisInProgress = new Set<string>();

async function triggerStyleAnalysis(userId: string) {
  if (analysisInProgress.has(userId)) {
    console.log(`[EmailScheduler] Style analysis already in progress for user ${userId}, skipping`);
    return;
  }

  analysisInProgress.add(userId);
  
  try {
    const { default: OpenAI } = await import("openai");
    const { wrapOpenAIWithTracking } = await import("./ai-cost-tracker");
    const openai = wrapOpenAIWithTracking(new OpenAI());
    
    const samples = await storage.getWritingSamples(userId, 20);
    if (samples.length < 3) return;

    const sampleTexts = samples.map(s => s.finalContent).join("\n\n---\n\n");

    // Background writing-style learning still uses AI — charge a summary credit before
    // the call (skip silently if the user can't afford it), refund on any failure.
    const styleCost = getActionCost("ai_summary");
    let styleSpent = false;
    if (styleCost > 0) {
      const r = await spendCredits({ userId, amount: styleCost, action: "ai_summary", reference: "bg-style-analysis" });
      if (!r.success) {
        console.log(`[EmailScheduler] Skipping style analysis for user ${userId} — insufficient credits`);
        return;
      }
      styleSpent = true;
    }
    const refundStyle = async () => {
      if (styleSpent) {
        try { await refundCredits({ userId, amount: styleCost, action: "ai_summary", reference: "bg-style-analysis" }); } catch (e) { console.error("[EmailScheduler] Failed to refund style credits:", e); }
      }
    };

    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing writing styles. Extract patterns from email samples to help personalize future AI-generated drafts."
          },
          {
            role: "user",
            content: `Analyze these email samples and extract the user's unique writing style. Return a JSON object with:
1. "styleAnalysis": A 2-3 sentence description of their overall writing style
2. "commonPhrases": Array of 5-10 phrases or expressions they commonly use
3. "greetingPatterns": Array of greetings they typically use
4. "signOffPatterns": Array of sign-offs they typically use
5. "toneDescription": One word describing their typical tone
6. "avgSentenceLength": Estimated average sentence length (short/medium/long)

Email samples:
${sampleTexts}

Return ONLY valid JSON, no other text.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });
    } catch (aiErr) {
      await refundStyle();
      throw aiErr;
    }

    const responseText = response.choices[0]?.message?.content || "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(responseText.replace(/```json\n?|\n?```/g, "").trim());
    } catch (parseError) {
      await refundStyle();
      console.error("[EmailScheduler] Failed to parse style analysis JSON:", parseError);
      return;
    }

    await storage.upsertLearnedWritingStyle(userId, {
      styleAnalysis: parsed.styleAnalysis || "",
      commonPhrases: parsed.commonPhrases || [],
      greetingPatterns: parsed.greetingPatterns || [],
      signOffPatterns: parsed.signOffPatterns || [],
      toneDescription: parsed.toneDescription,
      avgSentenceLength: parsed.avgSentenceLength,
      samplesAnalyzed: samples.length,
    });

    console.log(`[EmailScheduler] Updated writing style for user ${userId} (${samples.length} samples)`);
  } finally {
    analysisInProgress.delete(userId);
  }
}

async function processPendingSends() {
  try {
    const readySends = await storage.getPendingSendsReady();
    
    for (const send of readySends) {
      try {
        const claimed = await storage.claimPendingSendForProcessing(send.id);
        
        if (!claimed) {
          console.log(`[EmailScheduler] Skipping email ${send.id} - already cancelled or processed`);
          continue;
        }
        
        const { to, cc, bcc, subject, body, replyToMessageId, attachments } = claimed.payload;
        
        const account = await storage.getEmailAccount(claimed.userId);
        if (!account) {
          throw new Error("No email account connected for user " + claimed.userId);
        }
        
        const emailProvider: IEmailProvider = account.provider === "google" ? gmailProvider : microsoftProvider;
        
        let accessToken = account.accessToken;
        const isExpired = account.tokenExpiresAt && new Date(account.tokenExpiresAt).getTime() < Date.now() + 5 * 60 * 1000;
        if (isExpired) {
          const refreshed = await emailProvider.refreshAccessToken(account.refreshToken);
          await storage.updateEmailAccount(claimed.userId, {
            accessToken: refreshed.accessToken,
            tokenExpiresAt: refreshed.expiresAt,
          });
          accessToken = refreshed.accessToken;
        }
        
        await emailProvider.sendMessage(accessToken, { to, subject, body, cc, bcc, replyToMessageId, attachments });
        await storage.markPendingSendSent(claimed.id);
        console.log(`[EmailScheduler] Successfully sent email ${claimed.id} to ${to.join(", ")}`);

        // Save contacts for autocomplete
        const allRecipients = [
          ...(to || []),
          ...(cc || []),
          ...(bcc || [])
        ];
        for (const email of allRecipients) {
          if (email) {
            storage.saveContact(claimed.userId, email).catch(err => 
              console.warn("[EmailScheduler] Failed to save contact:", err)
            );
          }
        }

        const sendUser = await storage.getUser(claimed.userId);
        const sendUserPlan = sendUser?.plan || "free";
        if (sendUserPlan === "pro" || sendUserPlan === "premium") {
          await captureWritingSample(claimed.userId, subject, body);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await storage.markPendingSendFailed(send.id, errorMessage);
        console.error(`[EmailScheduler] Failed to send email ${send.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[EmailScheduler] Error processing pending sends:", error);
  }
}

let dailyCheckInterval: NodeJS.Timeout | null = null;
const dailyChecksSent = new Set<string>();

async function runDailyChecks() {
  const today = new Date().toISOString().split("T")[0];
  const checkKey = `daily-${today}`;
  if (dailyChecksSent.has(checkKey)) return;
  dailyChecksSent.add(checkKey);

  try {
    const { sendTrialEndingEmail, sendTestimonialRequestEmail } = await import("./email");
    const allUsers = await storage.getAllUsers();

    for (const user of allUsers) {
      if (!user.stripeSubscriptionId || !user.stripeCustomerId) continue;

      try {
        const { getUncachableStripeClient } = await import("./stripeClient");
        const stripe = await getUncachableStripeClient();
        const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

        if (sub.status === "trialing" && sub.trial_end) {
          const trialEnd = new Date(sub.trial_end * 1000);
          const now = new Date();
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysLeft === 3) {
            const planLabel = user.plan === "premium" ? "Business" : "Pro";
            const price = sub.items?.data?.[0]?.price;
            const amt = price?.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : "";
            await sendTrialEndingEmail(user.email, planLabel, daysLeft, amt);
            console.log(`[EmailScheduler] Sent trial ending email to ${user.email} (${daysLeft} days left)`);
          }
        }
      } catch (err) {
        console.error(`[EmailScheduler] Error checking trial for user ${user.id}:`, err);
      }

      try {
        const account = await storage.getEmailAccount(user.id);
        if (account && account.createdAt) {
          const connectedAt = new Date(account.createdAt);
          const now = new Date();
          const daysSinceConnect = Math.floor((now.getTime() - connectedAt.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceConnect === 7 && user.plan !== "free") {
            const existing = await storage.getUserTestimonial(user.id);
            if (!existing) {
              const { generateTestimonialToken } = await import("./email");
              const token = generateTestimonialToken(user.id);
              const baseUrl = process.env.REPLIT_DOMAINS
                ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
                : "https://mydraft.io";
              const activateUrl = `${baseUrl}/testimonial-reward?token=${token}`;
              await sendTestimonialRequestEmail(user.email, activateUrl);
              console.log(`[EmailScheduler] Sent testimonial request to ${user.email}`);
            }
          }
        }
      } catch (err) {
        console.error(`[EmailScheduler] Error checking testimonial for user ${user.id}:`, err);
      }
    }
  } catch (error) {
    console.error("[EmailScheduler] Error in daily checks:", error);
  }
}

async function autoSortUserEmails(userId: string, folders: { id: number; name: string; aiDescription: string | null }[]) {
  const foldersWithAi = folders.filter(f => f.aiDescription);
  if (foldersWithAi.length === 0) return;

  const account = await storage.getEmailAccount(userId);
  if (!account) return;

  const emailProvider: IEmailProvider = account.provider === "google" ? gmailProvider : microsoftProvider;

  let accessToken = account.accessToken;
  const isExpired = account.tokenExpiresAt && new Date(account.tokenExpiresAt).getTime() < Date.now() + 5 * 60 * 1000;
  if (isExpired) {
    try {
      const refreshed = await emailProvider.refreshAccessToken(account.refreshToken);
      await storage.updateEmailAccount(userId, {
        accessToken: refreshed.accessToken,
        tokenExpiresAt: refreshed.expiresAt,
      });
      accessToken = refreshed.accessToken;
    } catch {
      return;
    }
  }

  let messages: any[];
  try {
    messages = await emailProvider.getMessages(accessToken, { folder: "inbox", limit: 100 });
  } catch {
    return;
  }
  if (!messages || messages.length === 0) return;

  if (!autoSortedEmails.has(userId)) {
    autoSortedEmails.set(userId, new Set());
  }
  const sorted = autoSortedEmails.get(userId)!;

  const newEmails = messages.filter((m: any) => !sorted.has(String(m.id)));
  if (newEmails.length === 0) return;

  const folderList = foldersWithAi.map(f => `- Folder ID ${f.id}: "${f.name}" — ${f.aiDescription}`).join("\n");
  const maxPerCycle = 100;
  const batchSize = 50;
  const toProcess = newEmails.slice(0, maxPerCycle);

  try {
    const { default: OpenAI } = await import("openai");
    const { wrapOpenAIWithTracking } = await import("./ai-cost-tracker");
    const openai = wrapOpenAIWithTracking(new OpenAI());

    const validFolderIds = new Set(foldersWithAi.map(f => f.id));
    let assignedCount = 0;

    // Background auto-sort is metered like the manual auto-sort: bill 1 credit per email
    // actually assigned. Reserve 1 before each batch's AI call and settle to the real
    // count afterward (refund if zero assigned, top up if more). Stop when out of credits.
    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      const emailSummaries = batch.map((e: any) => ({
        id: String(e.id),
        sender: e.from || "Unknown",
        senderEmail: e.fromEmail || "",
        subject: e.subject || "(No subject)",
        preview: (e.preview || "").slice(0, 200),
      }));

      // Reserve one credit up front; if the user can't afford even one, stop processing.
      const reserve = await spendCredits({ userId, amount: 1, action: "ai_auto_sort", reference: `autosort:${userId}` });
      if (!reserve.success) {
        console.log(`[AutoSort] Stopping for user ${userId} — insufficient credits`);
        break;
      }
      let batchAssigned = 0;

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an email auto-sorting assistant. Match emails to the user's custom folders based on folder names and descriptions. Be INCLUSIVE — if an email could reasonably fit in a folder, include it. Only skip emails that clearly don't match ANY folder.

Available folders:
${folderList}

Return a JSON array of matches. Each match has "emailId" (string) and "folderId" (number).
If an email doesn't match any folder, omit it. If no emails match, return [].
Example: [{"emailId":"abc123","folderId":5},{"emailId":"def456","folderId":3}]
Return ONLY the JSON array, nothing else.`,
            },
            {
              role: "user",
              content: `Sort these emails:\n${JSON.stringify(emailSummaries)}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        });

        const responseText = response.choices[0]?.message?.content || "[]";
        const cleaned = responseText.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          const validEmailIds = new Set(emailSummaries.map(e => e.id));
          for (const match of parsed) {
            if (!match.emailId || !match.folderId) continue;
            if (!validFolderIds.has(match.folderId) || !validEmailIds.has(match.emailId)) continue;
            try {
              await storage.assignEmailToFolder(userId, match.emailId, match.folderId);
              assignedCount++;
              batchAssigned++;
            } catch {}
          }
        }

        for (const e of batch) sorted.add(String(e.id));

        // Settle the 1-credit reservation against the real per-email count.
        if (batchAssigned === 0) {
          try { await refundCredits({ userId, amount: 1, action: "ai_auto_sort", reference: `autosort:${userId}` }); } catch (e) { console.error("[AutoSort] Refund failed:", e); }
        } else if (batchAssigned > 1) {
          const extra = batchAssigned - 1;
          const top = await spendCredits({ userId, amount: extra, action: "ai_auto_sort", reference: `autosort:${userId}` });
          if (!top.success) {
            // Balance drained concurrently — drain whatever remains so delivered AI is never free.
            const bal = await getBalance(userId);
            if (bal > 0) await spendCredits({ userId, amount: bal, action: "ai_auto_sort", reference: `autosort:${userId}` });
          }
        }
      } catch (batchErr) {
        // AI/parse failed — refund the reserved credit (no usable output delivered).
        try { await refundCredits({ userId, amount: 1, action: "ai_auto_sort", reference: `autosort:${userId}` }); } catch (e) { console.error("[AutoSort] Refund failed:", e); }
        console.error(`[AutoSort] Batch ${Math.floor(i / batchSize) + 1} failed for user ${userId}, will retry next cycle`);
      }
    }

    if (sorted.size > 1000) {
      const entries = Array.from(sorted);
      const toRemove = entries.slice(0, entries.length - 1000);
      for (const id of toRemove) sorted.delete(id);
    }

    if (assignedCount > 0) {
      console.log(`[AutoSort] Sorted ${assignedCount} email(s) for user ${userId}`);
    }
  } catch (error) {
    console.error(`[AutoSort] AI error for user ${userId}:`, error);
  }
}

async function runAutoSort() {
  if (autoSortRunning) return;
  autoSortRunning = true;

  try {
    const allUsers = await storage.getAllUsers();
    const activeUserIds = new Set<string>();

    for (const user of allUsers) {
      if (user.plan === "free") continue;

      try {
        const folders = await storage.getCustomFolders(user.id);
        const foldersWithAi = folders.filter(f => f.aiDescription);
        if (foldersWithAi.length === 0) continue;

        activeUserIds.add(user.id);
        await autoSortUserEmails(user.id, foldersWithAi);
      } catch (error) {
        console.error(`[AutoSort] Error processing user ${user.id}:`, error);
      }
    }

    for (const userId of autoSortedEmails.keys()) {
      if (!activeUserIds.has(userId)) {
        autoSortedEmails.delete(userId);
      }
    }
  } catch (error) {
    console.error("[AutoSort] Error in auto-sort cycle:", error);
  } finally {
    autoSortRunning = false;
  }
}

export function startEmailScheduler() {
  if (schedulerInterval) {
    console.log("[EmailScheduler] Scheduler already running");
    return;
  }
  
  console.log("[EmailScheduler] Starting email scheduler (polling every 1 second)");
  schedulerInterval = setInterval(processPendingSends, 1000);
  dailyCheckInterval = setInterval(runDailyChecks, 60 * 60 * 1000);
  autoSortInterval = setInterval(runAutoSort, 5 * 60 * 1000);
  
  processPendingSends();
  setTimeout(runDailyChecks, 30000);
  setTimeout(runAutoSort, 60000);
}

export function stopEmailScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  if (dailyCheckInterval) {
    clearInterval(dailyCheckInterval);
    dailyCheckInterval = null;
  }
  if (autoSortInterval) {
    clearInterval(autoSortInterval);
    autoSortInterval = null;
  }
  console.log("[EmailScheduler] Scheduler stopped");
}
