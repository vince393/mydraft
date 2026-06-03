import { useQuery } from "@tanstack/react-query";

export type Plan = "free" | "pro" | "premium";

interface User {
  id: string;
  email: string;
  plan: Plan;
  onboardingCompleted: boolean;
}

interface AuthResponse {
  user: User | null;
}

export function usePlan() {
  const { data, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
  });

  const plan: Plan = (data?.user?.plan as Plan) || "free";

  const hasPro = plan === "pro" || plan === "premium";
  const hasPremium = plan === "premium";

  // AI features are no longer gated by plan — every plan can use them and is
  // metered by credits server-side (a 402 surfaces a "top up" prompt). These
  // capability flags stay `true` so the UI never shows plan-based lockouts.
  return {
    plan,
    hasPro,
    hasPremium,
    isLoading,
    canUseTextAI: true,
    canUseVoiceAI: true,
    canUseSummaries: true,
    canUseDrafting: true,
    canUseLearning: true,
  };
}
