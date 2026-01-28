import type { Express, Request, Response, NextFunction } from "express";
import { openai } from "./client";
import { storage } from "../../storage";

// Middleware to require Pro plan or higher
async function requireProPlan(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }
  
  const allowedPlans = ["pro", "premium", "business"];
  if (!allowedPlans.includes(user.plan)) {
    return res.status(403).json({ error: "Pro plan or higher required for AI image generation" });
  }
  
  next();
}

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", requireProPlan, async (req: Request, res: Response) => {
    try {
      const { prompt, size = "1024x1024" } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

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
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });
}

