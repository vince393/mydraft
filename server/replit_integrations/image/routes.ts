import type { Express, Request, Response } from "express";
import { openai } from "./client";
import { storage } from "../../storage";
import { getActionCost, spendCredits, refundCredits } from "../../credits";

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { prompt, size = "1024x1024" } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const userId = req.session.userId;

      // Reserve credits before the AI call; refund if generation fails.
      const cost = getActionCost("image_generate");
      let spent = false;
      if (cost > 0) {
        const result = await spendCredits({ userId, amount: cost, action: "image_generate", reference: "generate-image" });
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
        const response = await openai.images.generate({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: size as "1024x1024" | "512x512" | "256x256",
        });

        const imageData = response.data[0];
        res.json({
          url: imageData.url,
          b64_json: imageData.b64_json,
        });
      } catch (aiErr) {
        if (spent) {
          try { await refundCredits({ userId, amount: cost, action: "image_generate", reference: "generate-image" }); } catch (e) { console.error("Failed to refund image credits:", e); }
        }
        throw aiErr;
      }
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });
}

