import type { Express, Request, Response } from "express";
import { speechToText, voiceChat, textToSpeech, textToSpeechStream } from "./client";
import { storage } from "../../storage";
import { gmailProvider } from "../../gmail";
import { microsoftProvider } from "../../microsoft";
import { imapProvider } from "../../imap";
import { stripEmailNoise } from "../../email-utils";
import type { IEmailProvider, EmailListItem } from "../../email-provider";
import { getActionCost, getBalance, spendCredits, refundCredits } from "../../credits";

// Atomically RESERVE (spend up front) credits for an audio action so two concurrent
// requests near zero balance can't both pass a pre-check when only one is affordable.
// Sends 401/402 and returns { ok: false } on failure. Callers MUST refund via
// refundCredits if the downstream AI call fails or yields no usable audio.
async function reserveAudioCredits(
  req: Request,
  res: Response,
  action: "voice_chat" | "read_aloud",
  reference?: string,
): Promise<{ ok: true; userId: string; cost: number; balanceAfter: number } | { ok: false }> {
  const userId = (req as any).jwtUserId || (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return { ok: false };
  }
  const cost = getActionCost(action);
  if (cost <= 0) return { ok: true, userId, cost: 0, balanceAfter: await getBalance(userId) };
  const result = await spendCredits({ userId, amount: cost, action, reference });
  if (!result.success) {
    res.status(402).json({
      error: "Not enough credits",
      code: "INSUFFICIENT_CREDITS",
      creditsNeeded: cost,
      balance: result.balanceAfter,
    });
    return { ok: false };
  }
  return { ok: true, userId, cost, balanceAfter: result.balanceAfter };
}

const ttsCache: Map<string, { audio: string; timestamp: number }> = new Map();
const TTS_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const TTS_CACHE_MAX_SIZE = 30;

function getProviderForAccount(account: { provider: string }): IEmailProvider {
  if (account.provider === "google") return gmailProvider;
  if (account.provider === "imap") return imapProvider;
  return microsoftProvider;
}

async function getEmailContext(userId: string): Promise<string> {
  try {
    const account = await storage.getEmailAccount(userId);
    if (!account) return "";

    let accessToken = account.accessToken;

    if (account.provider !== "imap") {
      const isExpired = account.tokenExpiresAt && new Date(account.tokenExpiresAt).getTime() < Date.now() + 5 * 60 * 1000;
      if (isExpired) {
        const provider = getProviderForAccount(account);
        try {
          const refreshed = await provider.refreshAccessToken(account.refreshToken);
          await storage.updateEmailAccount(userId, {
            accessToken: refreshed.accessToken,
            tokenExpiresAt: refreshed.expiresAt,
          });
          accessToken = refreshed.accessToken;
        } catch {
          return "Unable to fetch emails — token expired.";
        }
      }
    }

    const provider = getProviderForAccount(account);
    const messages = await provider.getMessages(accessToken);
    const recent = messages.slice(0, 10);
    return recent
      .map((m: EmailListItem, i: number) => {
        const from = m.from || m.fromEmail || "unknown";
        const subject = m.subject || "(no subject)";
        const unread = !m.isRead ? "[UNREAD]" : "";
        const preview = (m.preview || "").substring(0, 100);
        return `${i + 1}. ${unread} FROM: ${from} — ${subject} — ${preview}`;
      })
      .join("\n");
  } catch (e) {
    console.error("Error fetching email context for voice:", e);
    return "Unable to fetch emails right now.";
  }
}

export function registerAudioRoutes(app: Express) {
  app.post("/api/voice/transcribe", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).jwtUserId || (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { audio, mimeType } = req.body;
      
      if (!audio || typeof audio !== "string") {
        return res.status(400).json({ error: "Audio data required" });
      }

      // Reserve credits before the AI call; refund if transcription fails.
      const cost = getActionCost("ai_chat");
      let spent = false;
      if (cost > 0) {
        const result = await spendCredits({ userId, amount: cost, action: "ai_chat", reference: "voice-transcribe" });
        if (!result.success) {
          return res.status(402).json({
            error: "Not enough credits",
            code: "INSUFFICIENT_CREDITS",
            creditsNeeded: cost,
            balance: result.balanceAfter,
          });
        }
        spent = true;
      }

      try {
        const audioBuffer = Buffer.from(audio, "base64");
        const transcript = await speechToText(audioBuffer, mimeType || "audio/webm");
        res.json({ transcript });
      } catch (aiErr) {
        if (spent) {
          try { await refundCredits({ userId, amount: cost, action: "ai_chat", reference: "voice-transcribe" }); } catch (e) { console.error("Failed to refund transcribe credits:", e); }
        }
        throw aiErr;
      }
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  app.post("/api/voice/chat", async (req: Request, res: Response) => {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message required" });
    }

    // Reserve credits up front (atomic) before any AI work; refund on failure.
    const reservation = await reserveAudioCredits(req, res, "voice_chat");
    if (!reservation.ok) return;
    const userId = reservation.userId;

    try {
      const user = await storage.getUser(userId);
      const emailAccount = await storage.getEmailAccount(userId);
      const emailContext = await getEmailContext(userId);

      const systemMessage = {
        role: "system" as const,
        content: `You are Vince, a helpful AI voice assistant for MyDraft, an email management app.
You help users manage their inbox, compose emails, and stay organized.
Keep responses concise and conversational since you're speaking out loud.
Be warm, helpful, and professional. Don't use markdown, asterisks, bullet points, or special formatting since your response will be spoken aloud.
Use natural spoken language. Say numbers as words when appropriate.

USER INFO:
- Email: ${user?.email || "Unknown"}
- Connected email: ${emailAccount?.email || "Not connected"}
- Plan: ${user?.plan || "free"}

${emailContext ? `RECENT EMAILS:\n${emailContext}` : "No email account connected yet."}`,
      };

      const messages = [
        systemMessage,
        ...conversationHistory.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      await storage.addAssistantMessage(userId, "user", message);

      const { text, audio } = await voiceChat(messages, message);

      await storage.addAssistantMessage(userId, "assistant", text);

      res.json({ 
        response: text, 
        audio,
        audioFormat: "wav",
        creditsRemaining: reservation.cost > 0 ? reservation.balanceAfter : undefined,
      });
    } catch (error) {
      console.error("Voice chat error:", error);
      if (reservation.cost > 0) {
        try {
          await refundCredits({ userId, amount: reservation.cost, action: "voice_chat" });
        } catch (refundErr) {
          console.error("Failed to refund voice chat credits:", refundErr);
        }
      }
      res.status(500).json({ error: "Failed to process voice chat" });
    }
  });

  app.post("/api/voice/tts", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).jwtUserId || (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { text, emailId, voice } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text required" });
      }

      const validVoices = ["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"];
      const selectedVoice = voice && validVoices.includes(voice) ? voice : "nova";

      const cacheKey = emailId
        ? `${userId}-${emailId}-${selectedVoice}`
        : `${userId}-${selectedVoice}-${text.slice(0, 100)}`;

      const now = Date.now();
      const cached = ttsCache.get(cacheKey);
      if (cached && now - cached.timestamp < TTS_CACHE_TTL_MS) {
        return res.json({ audio: cached.audio, audioFormat: "wav", cached: true });
      }

      let cleanText = stripEmailNoise(text).slice(0, 2000);
      if (!cleanText.trim()) {
        cleanText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
      }
      console.log(`[TTS] Request: voice=${selectedVoice}, textLength=${text.length}, cleanLength=${cleanText.length}`);

      // Reserve credits atomically right before the AI call; refund below if no audio.
      const reservation = await reserveAudioCredits(req, res, "read_aloud", emailId ? String(emailId) : undefined);
      if (!reservation.ok) return;

      let audio: string | undefined;
      try {
        audio = await textToSpeech(cleanText || text.slice(0, 2000), selectedVoice);
      } catch (aiErr) {
        if (reservation.cost > 0) {
          try { await refundCredits({ userId, amount: reservation.cost, action: "read_aloud", reference: emailId ? String(emailId) : undefined }); } catch (e) { console.error("Failed to refund TTS credits:", e); }
        }
        throw aiErr;
      }

      let creditsRemaining: number | undefined;
      if (audio) {
        ttsCache.set(cacheKey, { audio, timestamp: now });

        if (ttsCache.size > TTS_CACHE_MAX_SIZE) {
          const entries = Array.from(ttsCache.entries()).sort(
            (a, b) => a[1].timestamp - b[1].timestamp,
          );
          entries.slice(0, ttsCache.size - TTS_CACHE_MAX_SIZE)
            .forEach(([key]) => ttsCache.delete(key));
        }

        creditsRemaining = reservation.cost > 0 ? reservation.balanceAfter : undefined;
      } else if (reservation.cost > 0) {
        // No usable audio produced — refund the reservation.
        try { await refundCredits({ userId, amount: reservation.cost, action: "read_aloud", reference: emailId ? String(emailId) : undefined }); } catch (e) { console.error("Failed to refund TTS credits:", e); }
      }
      
      res.json({ audio, audioFormat: "wav", creditsRemaining });
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  app.post("/api/voice/tts/stream", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).jwtUserId || (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { text, emailId, voice } = req.body;

      if (!text || typeof text !== "string") {
        console.log("[TTS Stream] No text provided");
        return res.status(400).json({ error: "Text required" });
      }

      console.log(`[TTS Stream] Request: voice=${voice}, emailId=${emailId}, textLength=${text.length}`);

      const validVoices = ["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"];
      const selectedVoice = voice && validVoices.includes(voice) ? voice : "nova";

      const cacheKey = emailId
        ? `${userId}-${emailId}-${selectedVoice}`
        : `${userId}-${selectedVoice}-${text.slice(0, 100)}`;

      const now = Date.now();
      const cached = ttsCache.get(cacheKey);
      if (cached && now - cached.timestamp < TTS_CACHE_TTL_MS) {
        console.log("[TTS Stream] Serving from cache");
        const buf = Buffer.from(cached.audio, "base64");
        res.set({ "Content-Type": "audio/wav", "Content-Length": String(buf.length) });
        return res.end(buf);
      }

      let cleanText = stripEmailNoise(text).slice(0, 2000);
      if (!cleanText.trim()) {
        cleanText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
      }
      if (!cleanText.trim()) {
        console.log("[TTS Stream] No readable text after cleaning");
        return res.status(400).json({ error: "No readable text found" });
      }
      console.log(`[TTS Stream] Clean text length: ${cleanText.length}`);

      // Reserve credits atomically right before the AI call; refund if no audio.
      const reservation = await reserveAudioCredits(req, res, "read_aloud", emailId ? String(emailId) : undefined);
      if (!reservation.ok) return;

      const refundReservation = async () => {
        if (reservation.cost > 0) {
          try {
            await refundCredits({ userId, amount: reservation.cost, action: "read_aloud", reference: emailId ? String(emailId) : undefined });
          } catch (e) {
            console.error("Failed to refund TTS stream credits:", e);
          }
        }
      };

      let audioBuffer: Buffer | null | undefined;
      try {
        audioBuffer = await textToSpeechStream(cleanText, selectedVoice);
      } catch (aiErr) {
        await refundReservation();
        throw aiErr;
      }

      if (!audioBuffer) {
        await refundReservation();
        return res.status(500).json({ error: "Failed to generate speech" });
      }

      ttsCache.set(cacheKey, { audio: audioBuffer.toString("base64"), timestamp: Date.now() });
      if (ttsCache.size > TTS_CACHE_MAX_SIZE) {
        const entries = Array.from(ttsCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
        entries.slice(0, ttsCache.size - TTS_CACHE_MAX_SIZE).forEach(([key]) => ttsCache.delete(key));
      }

      res.set({ "Content-Type": "audio/wav", "Content-Length": String(audioBuffer.length) });
      res.end(audioBuffer);
    } catch (error) {
      console.error("TTS stream error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Failed to generate speech" });
    }
  });
}
