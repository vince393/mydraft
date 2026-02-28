import type { Express, Request, Response } from "express";
import { speechToText, voiceChat, textToSpeech } from "./client";
import { storage } from "../../storage";
import { gmailProvider } from "../../gmail";
import { microsoftProvider } from "../../microsoft";
import { stripEmailNoise } from "../../email-utils";

const ttsCache: Map<string, { audio: string; timestamp: number }> = new Map();
const TTS_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const TTS_CACHE_MAX_SIZE = 30;

async function getEmailContext(userId: string): Promise<string> {
  try {
    const account = await storage.getEmailAccount(userId);
    if (!account) return "";

    const isExpired = account.tokenExpiresAt && new Date(account.tokenExpiresAt).getTime() < Date.now() + 5 * 60 * 1000;
    let accessToken = account.accessToken;

    if (isExpired) {
      const provider = account.provider === "google" ? gmailProvider : microsoftProvider;
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

    const provider = account.provider === "google" ? gmailProvider : microsoftProvider;
    const messages = await provider.getMessages(accessToken);
    const recent = messages.slice(0, 10);
    return recent
      .map((m: any, i: number) => {
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
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { audio, mimeType } = req.body;
      
      if (!audio || typeof audio !== "string") {
        return res.status(400).json({ error: "Audio data required" });
      }

      const audioBuffer = Buffer.from(audio, "base64");
      const transcript = await speechToText(audioBuffer, mimeType || "audio/webm");
      
      res.json({ transcript });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  app.post("/api/voice/chat", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userId = req.session.userId;
      const { message, conversationHistory = [] } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message required" });
      }

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
      });
    } catch (error) {
      console.error("Voice chat error:", error);
      res.status(500).json({ error: "Failed to process voice chat" });
    }
  });

  app.post("/api/voice/tts", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { text, emailId } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text required" });
      }

      const cacheKey = emailId
        ? `${req.session.userId}-${emailId}`
        : `${req.session.userId}-${text.slice(0, 100)}`;

      const now = Date.now();
      const cached = ttsCache.get(cacheKey);
      if (cached && now - cached.timestamp < TTS_CACHE_TTL_MS) {
        return res.json({ audio: cached.audio, audioFormat: "wav", cached: true });
      }

      const cleanText = stripEmailNoise(text).slice(0, 4000);
      const audio = await textToSpeech(cleanText);

      if (audio) {
        ttsCache.set(cacheKey, { audio, timestamp: now });

        if (ttsCache.size > TTS_CACHE_MAX_SIZE) {
          const entries = Array.from(ttsCache.entries()).sort(
            (a, b) => a[1].timestamp - b[1].timestamp,
          );
          entries.slice(0, ttsCache.size - TTS_CACHE_MAX_SIZE)
            .forEach(([key]) => ttsCache.delete(key));
        }
      }
      
      res.json({ audio, audioFormat: "wav" });
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });
}
