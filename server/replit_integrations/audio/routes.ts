import type { Express, Request, Response } from "express";
import { speechToText, voiceChat, textToSpeech } from "./client";
import { storage } from "../../storage";

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

      const { message, conversationHistory = [] } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message required" });
      }

      const systemMessage = {
        role: "system" as const,
        content: `You are Vince, a helpful and friendly AI assistant for an email management application called Draft. 
You help users manage their inbox, compose emails, and stay organized.
Keep responses concise and conversational since you're speaking out loud.
Be warm, helpful, and professional. Don't use markdown or special formatting since your response will be spoken aloud.`,
      };

      const messages = [
        systemMessage,
        ...conversationHistory.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const { text, audio } = await voiceChat(messages, message);
      
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

      const { text } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text required" });
      }

      const audio = await textToSpeech(text);
      
      res.json({ 
        audio,
        audioFormat: "wav",
      });
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });
}
