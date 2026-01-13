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

  return {
    plan,
    hasPro,
    hasPremium,
    isLoading,
    canUseTextAI: hasPro,
    canUseVoiceAI: hasPremium,
    canUseSummaries: hasPro,
    canUseDrafting: hasPro,
    canUseLearning: hasPro,
  };
}
