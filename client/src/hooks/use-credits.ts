import { useQuery } from "@tanstack/react-query";

export interface CreditPack {
  sku: string;
  credits: number;
  price: number;
}

export interface CreditAddon {
  sku: string;
  credits: number;
  price: number;
}

export interface CreditsConfig {
  costs: Record<string, number>;
  planCredits: { free: number; pro: number; premium: number };
  packs: CreditPack[];
  addons: CreditAddon[];
  trialDays: number;
}

export interface ActiveAddon {
  id: string | number;
  creditsPerMonth: number;
  sku?: string;
  name?: string;
  [key: string]: unknown;
}

export interface ExpiringSoon {
  amount: number;
  date: string;
}

export interface CreditsSummary {
  balance: number;
  addons: ActiveAddon[];
  expiringSoon?: ExpiringSoon;
}

export function useCredits() {
  const { data, isLoading } = useQuery<CreditsSummary>({
    queryKey: ["/api/credits"],
  });

  return {
    balance: data?.balance ?? 0,
    addons: data?.addons ?? [],
    expiringSoon: data?.expiringSoon,
    isLoading,
  };
}

export function useCreditsConfig() {
  return useQuery<CreditsConfig>({
    queryKey: ["/api/credits/config"],
  });
}

export interface InsufficientCreditsError {
  error: string;
  code: "INSUFFICIENT_CREDITS";
  creditsNeeded: number;
  balance: number;
}

export function isInsufficientCreditsBody(
  body: unknown,
): body is InsufficientCreditsError {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { code?: string }).code === "INSUFFICIENT_CREDITS"
  );
}

export async function parseInsufficientCredits(
  res: Response,
): Promise<InsufficientCreditsError | null> {
  if (res.status !== 402) return null;
  try {
    const body = await res.clone().json();
    return isInsufficientCreditsBody(body) ? body : null;
  } catch {
    return null;
  }
}
