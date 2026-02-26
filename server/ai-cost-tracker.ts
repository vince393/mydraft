import { storage } from "./storage";
import type OpenAI from "openai";

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.00 },
};

function estimateCostCents(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4o-mini"];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 100);
}

export function trackAiCost(
  response: any,
  endpoint: string,
  model: string,
  userId?: string
): void {
  const usage = response?.usage;
  if (!usage) return;

  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || promptTokens + completionTokens;
  const costCents = estimateCostCents(model, promptTokens, completionTokens);

  storage.logAiCost({
    userId,
    endpoint,
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostCents: costCents,
  }).catch(() => {});
}

export function wrapOpenAIWithTracking(client: OpenAI): OpenAI {
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  (client.chat.completions as any).create = async function (...args: any[]) {
    const params = args[0] || {};
    const response = await originalCreate(...args);
    const model = params.model || "gpt-4o-mini";
    trackAiCost(response, "auto", model);
    return response;
  };

  return client;
}
