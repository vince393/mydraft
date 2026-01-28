import { storage } from "./storage";
import * as nylas from "./nylas";

let schedulerInterval: NodeJS.Timeout | null = null;

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
    const openai = new OpenAI();
    
    const samples = await storage.getWritingSamples(userId, 20);
    if (samples.length < 3) return;

    const sampleTexts = samples.map(s => s.finalContent).join("\n\n---\n\n");
    
    const response = await openai.chat.completions.create({
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

    const responseText = response.choices[0]?.message?.content || "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(responseText.replace(/```json\n?|\n?```/g, "").trim());
    } catch (parseError) {
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
        await nylas.sendMessage(claimed.grantId, to, subject, body, replyToMessageId, cc, bcc, attachments);
        nylas.invalidateMessagesCache(claimed.grantId);
        await storage.markPendingSendSent(claimed.id);
        console.log(`[EmailScheduler] Successfully sent email ${claimed.id} to ${to.join(", ")}`);

        await captureWritingSample(claimed.userId, subject, body);
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

export function startEmailScheduler() {
  if (schedulerInterval) {
    console.log("[EmailScheduler] Scheduler already running");
    return;
  }
  
  console.log("[EmailScheduler] Starting email scheduler (polling every 1 second)");
  schedulerInterval = setInterval(processPendingSends, 1000);
  
  processPendingSends();
}

export function stopEmailScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[EmailScheduler] Scheduler stopped");
  }
}
