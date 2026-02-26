import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, ArrowLeft, Loader2, Check, Star, Clock, Brain, Rocket, Shield, Mail, Briefcase, RefreshCw, Inbox, MailOpen, Mails, Waves, PenLine, Sparkles, Tag, FileText, Palette, Smile, Zap, Search, Users, Newspaper, Radio, Megaphone, MessageCircle, ChevronLeft } from "lucide-react";
import logoPath from "@assets/bd6ad8b0-8b19-4e70-8b55-0ddd333f446e_removalai_preview_1768612163407.png";
import type { User } from "@shared/schema";

interface AuthResponse {
  user: (User & { emailConnected?: boolean }) | null;
}

type Step = "primary-use" | "email-volume" | "ai-features" | "automation" | "tone" | "security" | "referral" | "select-plan";

interface AIPreferences {
  primaryUse: string;
  emailVolume: string;
  aiFeatures: string[];
  automationLevel: string;
  replyTone: string;
  customTone?: string;
  referralSource: string;
  referralOther?: string;
  enableTwoFactor?: boolean;
  selectedPlan?: string;
}

const basePlans = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for trying out MyDraft",
    features: [
      "Connect 1 email account",
      "5 AI drafts per day",
      "Basic inbox management",
      "Standard support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 10,
    annualPrice: 99,
    annualSavings: 21,
    description: "For professionals who need more",
    features: [
      "Personal writing style memory",
      "100 AI emails per day",
      "Advanced automation & workflows",
      "Custom rules and sequences",
      "Team or shared inboxes",
      "API access & integrations",
      "Priority support",
      "14-day free trial",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 29,
    annualPrice: 299,
    annualSavings: 49,
    description: "For teams and power users",
    features: [
      "Everything in Pro",
      "Enhanced AI quality (GPT-4o)",
      "Unlimited AI assistance",
      "Voice assistant",
      "Custom AI training",
      "Team collaboration",
      "Dedicated account manager",
      "14-day free trial",
    ],
  },
];

function getRecommendedPlan(preferences: AIPreferences): string {
  const { emailVolume, automationLevel, primaryUse } = preferences;
  if (emailVolume === "very-high") return "business";
  if (automationLevel === "high" && primaryUse === "work") return "business";
  if (emailVolume === "high" && automationLevel === "high") return "business";
  if (emailVolume === "low" && automationLevel === "low") return "free";
  return "pro";
}

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc?: string;
  testId: string;
}

function OptionCard({ selected, onClick, icon, label, desc, testId }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        selected
          ? "border-primary/40 bg-primary/[0.08]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          selected ? "bg-primary/15" : "bg-white/[0.04]"
        }`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium ${selected ? "text-foreground" : "text-foreground/80"}`}>{label}</div>
          {desc && <div className="text-xs text-muted-foreground/60 mt-0.5">{desc}</div>}
        </div>
        {selected && (
          <div className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </button>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("primary-use");
  const [preferences, setPreferences] = useState<AIPreferences>({
    primaryUse: "",
    emailVolume: "",
    aiFeatures: [],
    automationLevel: "",
    replyTone: "",
    referralSource: "",
  });
  const [billingInterval, setBillingInterval] = useState<"annual" | "monthly">("annual");
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  useEffect(() => {
    if (authData?.user?.onboardingCompleted) {
      if (!authData.user.emailConnected) {
        setLocation("/connect-email");
      } else {
        setLocation("/inbox");
      }
    }
  }, [authData, setLocation]);

  const steps: Step[] = ["primary-use", "email-volume", "ai-features", "automation", "tone", "security", "referral", "select-plan"];
  const currentStepIndex = steps.indexOf(step);
  const recommendedPlan = getRecommendedPlan(preferences);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setTransitioning(true);
      setTimeout(() => {
        setStep(steps[nextIndex]);
        setTransitioning(false);
      }, 300);
    }
  }, [currentStepIndex, steps]);

  const autoAdvance = useCallback((delay = 600) => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null;
      goNext();
    }, delay);
  }, [goNext]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const goBack = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setTransitioning(true);
      setTimeout(() => {
        setStep(steps[prevIndex]);
        setTransitioning(false);
      }, 300);
    }
  }, [currentStepIndex, steps]);

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/onboarding", { aiPreferences: preferences });
      return response.json();
    },
    onSuccess: async () => {
      if (preferences.enableTwoFactor) {
        try {
          await apiRequest("POST", "/api/settings/2fa/toggle", { enable: true });
        } catch (err) {
          console.error("Failed to enable 2FA:", err);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/connect-email");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save preferences", description: error.message, variant: "destructive" });
    },
  });

  const selectFreePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/plan", { plan: "free" });
      return response.json();
    },
    onSuccess: () => completeOnboardingMutation.mutate(),
    onError: (error: Error) => {
      toast({ title: "Failed to select plan", description: error.message, variant: "destructive" });
    },
  });

  const prepareCheckoutMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: "annual" | "monthly" }) => {
      await apiRequest("POST", "/api/user/onboarding", { aiPreferences: preferences });
      if (preferences.enableTwoFactor) {
        try { await apiRequest("POST", "/api/settings/2fa/toggle", { enable: true }); } catch (err) { console.error("Failed to enable 2FA:", err); }
      }
      return { plan, interval };
    },
    onSuccess: ({ plan, interval }) => setLocation(`/checkout?plan=${plan}&interval=${interval}`),
    onError: (error: Error) => {
      toast({ title: "Failed to save preferences", description: error.message, variant: "destructive" });
    },
  });

  const handlePlanSelect = (planId: string) => {
    setPreferences({ ...preferences, selectedPlan: planId });
    if (planId === "free") {
      selectFreePlanMutation.mutate();
    } else {
      prepareCheckoutMutation.mutate({ plan: planId, interval: billingInterval });
    }
  };

  const isPlanLoading = selectFreePlanMutation.isPending || prepareCheckoutMutation.isPending || completeOnboardingMutation.isPending;

  const toggleFeature = (feature: string) => {
    setPreferences((prev) => ({
      ...prev,
      aiFeatures: prev.aiFeatures.includes(feature)
        ? prev.aiFeatures.filter((f) => f !== feature)
        : [...prev.aiFeatures, feature],
    }));
  };

  const conversationalTitles: Record<Step, { greeting: string; question: string }> = {
    "primary-use": { greeting: "Let's get to know you", question: "What will you mainly use MyDraft for?" },
    "email-volume": { greeting: "Got it!", question: "How busy is your inbox on a typical day?" },
    "ai-features": { greeting: "Nice", question: "Which of these sound useful to you?" },
    "automation": { greeting: "Great choices", question: "How hands-on do you want to be with your replies?" },
    "tone": { greeting: "Almost there", question: "How should your emails sound?" },
    "security": { greeting: "One more thing", question: "Want to add extra security?" },
    "referral": { greeting: "Last question", question: "How did you find us?" },
    "select-plan": { greeting: "You're all set!", question: "Here's the plan we'd recommend for you" },
  };

  const title = conversationalTitles[step];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-violet-600/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="flex justify-center mb-8">
            <img src={logoPath} alt="MyDraft" className="h-6 w-auto opacity-50" />
          </div>

          <div className="flex justify-center gap-1.5 mb-8">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i < currentStepIndex ? "w-8 bg-blue-500" : i === currentStepIndex ? "w-8 bg-blue-500" : "w-4 bg-white/[0.06]"
                }`}
              />
            ))}
          </div>

          {step !== "select-plan" ? (
            <div className={`transition-all duration-300 ${transitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}>
              <div className="text-center mb-8">
                <p className="text-xs text-blue-400/70 font-medium uppercase tracking-widest mb-2">{title.greeting}</p>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-snug">{title.question}</h1>
              </div>

              <div className="space-y-2.5">
                {step === "primary-use" && (
                  <>
                    {[
                      { value: "personal", icon: <Mail className="w-4 h-4 text-muted-foreground" />, label: "Personal email", desc: "Friends, family, subscriptions" },
                      { value: "work", icon: <Briefcase className="w-4 h-4 text-muted-foreground" />, label: "Work email", desc: "Clients, colleagues, projects" },
                      { value: "both", icon: <RefreshCw className="w-4 h-4 text-muted-foreground" />, label: "Both", desc: "Mix of personal and work" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={preferences.primaryUse === opt.value}
                        onClick={() => {
                          setPreferences({ ...preferences, primaryUse: opt.value });
                          autoAdvance();
                        }}
                        icon={opt.icon}
                        label={opt.label}
                        desc={opt.desc}
                        testId={`radio-primary-use-${opt.value}`}
                      />
                    ))}
                  </>
                )}

                {step === "email-volume" && (
                  <>
                    {[
                      { value: "low", icon: <Inbox className="w-4 h-4 text-muted-foreground" />, label: "Less than 20", desc: "Nice and manageable" },
                      { value: "medium", icon: <MailOpen className="w-4 h-4 text-muted-foreground" />, label: "20-50 emails", desc: "A steady flow" },
                      { value: "high", icon: <Mails className="w-4 h-4 text-muted-foreground" />, label: "50-100 emails", desc: "Quite a bit to keep up with" },
                      { value: "very-high", icon: <Waves className="w-4 h-4 text-muted-foreground" />, label: "100+ emails", desc: "You definitely need help" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={preferences.emailVolume === opt.value}
                        onClick={() => {
                          setPreferences({ ...preferences, emailVolume: opt.value });
                          autoAdvance();
                        }}
                        icon={opt.icon}
                        label={opt.label}
                        desc={opt.desc}
                        testId={`radio-email-volume-${opt.value}`}
                      />
                    ))}
                  </>
                )}

                {step === "ai-features" && (
                  <>
                    {[
                      { value: "auto-draft", icon: <PenLine className="w-4 h-4 text-muted-foreground" />, label: "AI Reply Drafts", desc: "Generate smart reply suggestions" },
                      { value: "suggest-replies", icon: <Sparkles className="w-4 h-4 text-muted-foreground" />, label: "Tone Matching", desc: "Match your writing style" },
                      { value: "auto-label", icon: <Tag className="w-4 h-4 text-muted-foreground" />, label: "Smart Labeling", desc: "Automatically organize emails" },
                      { value: "summarize", icon: <FileText className="w-4 h-4 text-muted-foreground" />, label: "Email Summaries", desc: "Get quick email summaries" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={preferences.aiFeatures.includes(opt.value)}
                        onClick={() => toggleFeature(opt.value)}
                        icon={opt.icon}
                        label={opt.label}
                        desc={opt.desc}
                        testId={`button-feature-${opt.value}`}
                      />
                    ))}
                    <div className="pt-4 flex justify-end">
                      <Button
                        onClick={goNext}
                        disabled={preferences.aiFeatures.length === 0}
                        className="gap-2"
                        data-testid="button-onboarding-next"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}

                {step === "automation" && (
                  <>
                    {[
                      { value: "low", icon: <PenLine className="w-4 h-4 text-muted-foreground" />, label: "I'll write most replies myself", desc: "Just help me organize" },
                      { value: "medium", icon: <Users className="w-4 h-4 text-muted-foreground" />, label: "Suggest drafts, but let me review", desc: "Best of both worlds" },
                      { value: "high", icon: <Rocket className="w-4 h-4 text-muted-foreground" />, label: "Automate as much as possible", desc: "Full speed ahead" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={preferences.automationLevel === opt.value}
                        onClick={() => {
                          setPreferences({ ...preferences, automationLevel: opt.value });
                          autoAdvance();
                        }}
                        icon={opt.icon}
                        label={opt.label}
                        desc={opt.desc}
                        testId={`radio-automation-${opt.value}`}
                      />
                    ))}
                  </>
                )}

                {step === "tone" && (
                  <>
                    {[
                      { value: "professional", icon: <Briefcase className="w-4 h-4 text-muted-foreground" />, label: "Professional", desc: "Clear, formal, and courteous" },
                      { value: "friendly", icon: <Smile className="w-4 h-4 text-muted-foreground" />, label: "Friendly", desc: "Warm, approachable, casual" },
                      { value: "concise", icon: <Zap className="w-4 h-4 text-muted-foreground" />, label: "Concise", desc: "Brief and to the point" },
                      { value: "custom", icon: <Palette className="w-4 h-4 text-muted-foreground" />, label: "Custom", desc: "Describe your own style" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={preferences.replyTone === opt.value}
                        onClick={() => {
                          setPreferences({ ...preferences, replyTone: opt.value });
                          if (opt.value !== "custom") autoAdvance();
                        }}
                        icon={opt.icon}
                        label={opt.label}
                        desc={opt.desc}
                        testId={`radio-tone-${opt.value}`}
                      />
                    ))}
                    {preferences.replyTone === "custom" && (
                      <div className="pt-2 flex gap-2">
                        <Input
                          placeholder="Describe your preferred tone..."
                          value={preferences.customTone || ""}
                          onChange={(e) => setPreferences({ ...preferences, customTone: e.target.value })}
                          className="flex-1"
                          data-testid="input-custom-tone"
                        />
                        <Button onClick={goNext} disabled={!preferences.customTone?.trim()} data-testid="button-onboarding-next">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {step === "security" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium mb-1">Two-Factor Authentication</h4>
                          <p className="text-xs text-muted-foreground/60 leading-relaxed mb-4">
                            We'll send a code to your email each time you sign in. You can always change this later in settings.
                          </p>
                          <div className="flex items-center gap-3">
                            <Switch
                              id="enable-2fa"
                              checked={preferences.enableTwoFactor || false}
                              onCheckedChange={(checked) => setPreferences({ ...preferences, enableTwoFactor: checked })}
                              data-testid="switch-enable-2fa"
                            />
                            <Label htmlFor="enable-2fa" className="text-sm text-muted-foreground cursor-pointer">
                              {preferences.enableTwoFactor ? "Enabled" : "Enable 2FA"}
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={goNext} className="gap-2" data-testid="button-onboarding-next">
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === "referral" && (
                  <>
                    {[
                      { value: "search", icon: <Search className="w-4 h-4 text-muted-foreground" />, label: "Search engine" },
                      { value: "social", icon: <Users className="w-4 h-4 text-muted-foreground" />, label: "Social media" },
                      { value: "friend", icon: <Users className="w-4 h-4 text-muted-foreground" />, label: "Friend or colleague" },
                      { value: "blog", icon: <Newspaper className="w-4 h-4 text-muted-foreground" />, label: "Blog or article" },
                      { value: "podcast", icon: <Radio className="w-4 h-4 text-muted-foreground" />, label: "Podcast" },
                      { value: "ad", icon: <Megaphone className="w-4 h-4 text-muted-foreground" />, label: "Online ad" },
                      { value: "other", icon: <MessageCircle className="w-4 h-4 text-muted-foreground" />, label: "Other" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={preferences.referralSource === opt.value}
                        onClick={() => {
                          setPreferences({ ...preferences, referralSource: opt.value });
                          if (opt.value !== "other") autoAdvance();
                        }}
                        icon={opt.icon}
                        label={opt.label}
                        testId={`radio-referral-${opt.value}`}
                      />
                    ))}
                    {preferences.referralSource === "other" && (
                      <div className="pt-2 flex gap-2">
                        <Input
                          placeholder="Please specify..."
                          value={preferences.referralOther || ""}
                          onChange={(e) => setPreferences({ ...preferences, referralOther: e.target.value })}
                          className="flex-1"
                          data-testid="input-referral-other"
                        />
                        <Button onClick={goNext} disabled={!preferences.referralOther?.trim()} data-testid="button-onboarding-next">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {currentStepIndex > 0 && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={goBack}
                    className="text-sm text-muted-foreground/50 hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    data-testid="button-onboarding-back"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              )}
            </div>
          ) : (
            <PlanSelectionStep
              preferences={preferences}
              recommendedPlan={recommendedPlan}
              billingInterval={billingInterval}
              setBillingInterval={setBillingInterval}
              showAllPlans={showAllPlans}
              setShowAllPlans={setShowAllPlans}
              handlePlanSelect={handlePlanSelect}
              isPlanLoading={isPlanLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PlanSelectionStep({
  preferences,
  recommendedPlan,
  billingInterval,
  setBillingInterval,
  showAllPlans,
  setShowAllPlans,
  handlePlanSelect,
  isPlanLoading,
}: {
  preferences: AIPreferences;
  recommendedPlan: string;
  billingInterval: "annual" | "monthly";
  setBillingInterval: (v: "annual" | "monthly") => void;
  showAllPlans: boolean;
  setShowAllPlans: (v: boolean) => void;
  handlePlanSelect: (planId: string) => void;
  isPlanLoading: boolean;
}) {
  if (!showAllPlans) {
    const plan = basePlans.find(p => p.id === recommendedPlan)!;
    const displayPrice = plan.id === "free" ? "$0" : billingInterval === "annual" ? `$${plan.annualPrice}` : `$${plan.monthlyPrice}`;
    const displayPeriod = plan.id === "free" ? "forever" : billingInterval === "annual" ? "/year" : "/month";

    const emailsPerDay = preferences.emailVolume === "very-high" ? 120 : preferences.emailVolume === "high" ? 75 : preferences.emailVolume === "medium" ? 35 : 15;
    const timeSavedPerEmail = plan.id === "business" ? 3 : plan.id === "pro" ? 2.5 : 1;
    const yearlyTimeSaved = Math.round((emailsPerDay * timeSavedPerEmail * 22 * 12) / 60);
    const emailsAutomated = plan.id === "business" ? "Unlimited" : plan.id === "pro" ? "100" : "5";
    const responseTime = plan.id === "business" ? "< 30 sec" : plan.id === "pro" ? "< 1 min" : "< 5 min";

    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs text-blue-400/70 font-medium uppercase tracking-widest mb-2">You're all set!</p>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Here's the perfect plan for you</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 rounded-2xl overflow-hidden border border-white/[0.08]">
          <div className="p-6 sm:p-8 flex flex-col">
            <Badge className="bg-blue-500 text-white text-xs mb-5 w-fit">
              <Star className="w-3 h-3 mr-1" />
              Recommended for you
            </Badge>

            <h2 className="text-3xl font-bold mb-1">{plan.name}</h2>
            <p className="text-sm text-muted-foreground/60 mb-5">{plan.description}</p>

            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-bold">{displayPrice}</span>
              <span className="text-muted-foreground/50">{displayPeriod}</span>
            </div>

            <div className="inline-flex items-center bg-white/[0.04] border border-white/[0.06] rounded-full p-1 mb-6 w-fit" data-testid="billing-toggle">
              <button
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  billingInterval === "monthly" ? "bg-blue-500 text-white" : "text-muted-foreground/60"
                }`}
                onClick={() => setBillingInterval("monthly")}
                data-testid="button-billing-monthly"
              >
                Monthly
              </button>
              <button
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  billingInterval === "annual" ? "bg-blue-500 text-white" : "text-muted-foreground/60"
                }`}
                onClick={() => setBillingInterval("annual")}
                data-testid="button-billing-annual"
              >
                Annual
              </button>
            </div>

            <div className="space-y-2.5 mb-8 flex-1">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                  <span className="text-sm text-foreground/70">{feature}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              <Button
                className="w-full"
                size="lg"
                onClick={() => handlePlanSelect(plan.id)}
                disabled={isPlanLoading}
                data-testid={`button-plan-${plan.id}`}
              >
                {isPlanLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Setting up...</>
                ) : plan.id === "free" ? "Get started free" : "Start 14-day free trial"}
              </Button>
              <button
                type="button"
                onClick={() => setShowAllPlans(true)}
                className="w-full text-sm text-muted-foreground/50 hover:text-foreground transition-colors py-2"
                data-testid="button-view-all-plans"
              >
                View all plans
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-violet-500/[0.04] flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-white/[0.06]">
            <div className="space-y-6">
              <div>
                <p className="text-xs text-muted-foreground/50 mb-1.5">Based on your email volume</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-emerald-400">{yearlyTimeSaved}+</span>
                  <span className="text-lg text-muted-foreground/50">hours saved/year</span>
                </div>
                <p className="text-xs text-muted-foreground/40 mt-1">
                  That's like getting <span className="text-foreground/70 font-medium">{Math.round(yearlyTimeSaved / 8)} extra workdays</span> back
                </p>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground/50 mb-1">AI emails/day</p>
                  <p className="text-2xl font-bold text-blue-400">{emailsAutomated}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground/50 mb-1">Draft speed</p>
                  <p className="text-2xl font-bold text-violet-400">{responseTime}</p>
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Stop wasting time on repetitive emails</p>
                    <p className="text-xs text-muted-foreground/50">AI drafts replies in seconds</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Your writing, amplified by AI</p>
                    <p className="text-xs text-muted-foreground/50">Replies sound exactly like you</p>
                  </div>
                </div>
                {plan.id !== "free" && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Rocket className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">14 days free, cancel anytime</p>
                      <p className="text-xs text-muted-foreground/50">No commitment required</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <p className="text-xs text-blue-400/70 font-medium uppercase tracking-widest mb-2">Choose your plan</p>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Pick what works for you</h1>
      </div>

      <div className="space-y-2.5">
        {basePlans.map((plan) => {
          const isRecommended = plan.id === recommendedPlan;
          const displayPrice = plan.id === "free" ? "$0" : billingInterval === "annual" ? `$${plan.annualPrice}` : `$${plan.monthlyPrice}`;
          const displayPeriod = plan.id === "free" ? "forever" : billingInterval === "annual" ? "/year" : "/month";

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => handlePlanSelect(plan.id)}
              disabled={isPlanLoading}
              className={`w-full p-4 rounded-xl border text-left transition-all relative ${
                isRecommended
                  ? "border-blue-500/30 bg-blue-500/[0.06]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
              } ${isPlanLoading ? "opacity-50" : ""}`}
              data-testid={`button-plan-${plan.id}`}
            >
              {isRecommended && (
                <Badge className="absolute -top-2.5 left-4 bg-blue-500 text-white text-[10px]">
                  <Star className="w-2.5 h-2.5 mr-0.5" />
                  Recommended
                </Badge>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{plan.name}</div>
                  <div className="text-xs text-muted-foreground/50 mt-0.5">{plan.description}</div>
                  <div className="flex flex-wrap gap-x-2 mt-2">
                    {plan.features.slice(0, 2).map((f) => (
                      <span key={f} className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-lg font-bold">{displayPrice}</div>
                  <div className="text-[10px] text-muted-foreground/40">{displayPeriod}</div>
                </div>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAllPlans(false)}
          className="w-full text-sm text-muted-foreground/50 hover:text-foreground transition-colors py-2"
          data-testid="button-hide-all-plans"
        >
          Show recommended only
        </button>
      </div>

      {isPlanLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Setting up your account...</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground/30 text-center mt-4">
        Pro and Business plans include a 14-day free trial. Cancel anytime.
      </p>
    </div>
  );
}
