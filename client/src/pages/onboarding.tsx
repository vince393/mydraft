import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, ArrowLeft, Loader2, Sparkles, Mail, Zap, MessageSquare, Inbox, Users, Shield, Check, Star, TrendingUp, Clock, Brain, Rocket } from "lucide-react";
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
      "Basic inbox management",
      "Standard support",
    ],
  },
  {
    id: "student",
    name: "Student",
    monthlyPrice: 5,
    annualPrice: 45,
    annualSavings: 15,
    description: "50% student discount",
    badge: "Student Discount",
    features: [
      "Unlimited AI replies",
      "Email humanizer",
      "Make AI text sound natural",
      "Tone customization",
      "Priority support",
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

function getRecommendationReasons(planId: string, preferences: AIPreferences): string[] {
  const reasons: string[] = [];
  const { emailVolume, automationLevel, primaryUse, aiFeatures } = preferences;
  
  if (planId === "business") {
    if (emailVolume === "very-high") {
      reasons.push("You receive a high volume of emails daily - unlimited AI assistance will save you hours");
    }
    if (automationLevel === "high") {
      reasons.push("You want maximum automation - Business includes advanced workflows and custom AI training");
    }
    if (primaryUse === "work") {
      reasons.push("For professional use, you'll benefit from team collaboration and dedicated support");
    }
    reasons.push("Voice assistant and custom AI training included");
  } else if (planId === "pro") {
    if (emailVolume === "high" || emailVolume === "medium") {
      reasons.push("100 AI emails per day is perfect for your email volume");
    }
    if (automationLevel === "medium" || automationLevel === "high") {
      reasons.push("Advanced automation and custom rules to streamline your workflow");
    }
    if (aiFeatures?.includes("drafts") || aiFeatures?.includes("tone")) {
      reasons.push("Personal writing style memory learns how you communicate");
    }
    reasons.push("API access and integrations for power users");
  } else if (planId === "student") {
    reasons.push("50% discount for students - all the essentials at half the price");
    reasons.push("Email humanizer makes AI text sound natural");
  } else if (planId === "free") {
    if (emailVolume === "low") {
      reasons.push("Your low email volume is perfect for the free tier");
    }
    if (automationLevel === "low") {
      reasons.push("You prefer writing replies yourself - free plan gives you the basics");
    }
    reasons.push("Try MyDraft risk-free before upgrading");
  }
  
  return reasons.slice(0, 3);
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
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  // If user has already completed onboarding, redirect them to the next step
  useEffect(() => {
    if (authData?.user?.onboardingCompleted) {
      // Redirect based on their current state
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

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/onboarding", { aiPreferences: preferences });
      return response.json();
    },
    onSuccess: async () => {
      // If 2FA was enabled during onboarding, enable it
      if (preferences.enableTwoFactor) {
        try {
          await apiRequest("POST", "/api/settings/2fa/toggle", { enable: true });
        } catch (err) {
          console.error("Failed to enable 2FA:", err);
        }
      }
      
      // Wait for the query to refetch with updated data before redirecting
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      // Redirect to email connection
      setLocation("/connect-email");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Free plan selection
  const selectFreePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/plan", { plan: "free" });
      return response.json();
    },
    onSuccess: () => {
      completeOnboardingMutation.mutate();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to select plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stripe checkout for paid plans
  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: "annual" | "monthly" }) => {
      // First save the AI preferences
      await apiRequest("POST", "/api/user/onboarding", { aiPreferences: preferences });
      // If 2FA was enabled, enable it
      if (preferences.enableTwoFactor) {
        try {
          await apiRequest("POST", "/api/settings/2fa/toggle", { enable: true });
        } catch (err) {
          console.error("Failed to enable 2FA:", err);
        }
      }
      // Then start checkout
      const response = await apiRequest("POST", "/api/stripe/checkout", { plan, interval });
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start checkout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlanSelect = (planId: string) => {
    setPreferences({ ...preferences, selectedPlan: planId });
    
    if (planId === "free") {
      selectFreePlanMutation.mutate();
    } else {
      checkoutMutation.mutate({ plan: planId, interval: billingInterval });
    }
  };

  const isPlanLoading = selectFreePlanMutation.isPending || checkoutMutation.isPending || completeOnboardingMutation.isPending;

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
    // For select-plan step, plan selection handles completion
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    } else {
      setLocation("/login");
    }
  };

  const toggleFeature = (feature: string) => {
    setPreferences((prev) => ({
      ...prev,
      aiFeatures: prev.aiFeatures.includes(feature)
        ? prev.aiFeatures.filter((f) => f !== feature)
        : [...prev.aiFeatures, feature],
    }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 sm:py-12">
      <div className={`w-full transition-all ${step === "select-plan" ? "max-w-4xl" : "max-w-lg"}`}>
        <div className="flex justify-center gap-1 sm:gap-1.5 mb-6 sm:mb-8">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1 sm:h-1.5 w-6 sm:w-10 rounded-full transition-colors ${
                i <= currentStepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <CardTitle className="text-lg sm:text-xl">
              {step === "primary-use" && "How will you use MyDraft?"}
              {step === "email-volume" && "How many emails do you receive daily?"}
              {step === "ai-features" && "Which AI features interest you?"}
              {step === "automation" && "How much automation do you want?"}
              {step === "tone" && "What's your preferred reply tone?"}
              {step === "security" && "Secure your account"}
              {step === "referral" && "How did you hear about us?"}
              {step === "select-plan" && "Choose your plan"}
            </CardTitle>
            <CardDescription>
              {step === "primary-use" && "Help us personalize your experience"}
              {step === "email-volume" && "This helps us recommend the right plan for you"}
              {step === "ai-features" && "Select all that apply"}
              {step === "automation" && "We'll set up your inbox accordingly"}
              {step === "tone" && "This will be your default for AI replies"}
              {step === "security" && "Add extra protection with two-factor authentication"}
              {step === "referral" && "We'd love to know how you found us"}
              {step === "select-plan" && "Select a plan to complete setup"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "primary-use" && (
              <RadioGroup
                value={preferences.primaryUse}
                onValueChange={(value) => setPreferences({ ...preferences, primaryUse: value })}
                className="space-y-3"
              >
                {[
                  { value: "personal", label: "Personal email", icon: Mail, desc: "Friends, family, subscriptions" },
                  { value: "work", label: "Work email", icon: Zap, desc: "Clients, colleagues, projects" },
                  { value: "both", label: "Both", icon: MessageSquare, desc: "Mix of personal and work" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem 
                      value={option.value} 
                      id={option.value}
                      data-testid={`radio-primary-use-${option.value}`}
                    />
                    <Label htmlFor={option.value} className="flex items-center gap-3 cursor-pointer flex-1">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <option.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.desc}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {step === "email-volume" && (
              <RadioGroup
                value={preferences.emailVolume}
                onValueChange={(value) => setPreferences({ ...preferences, emailVolume: value })}
                className="space-y-3"
              >
                {[
                  { value: "low", label: "Less than 20", desc: "I keep it light" },
                  { value: "medium", label: "20-50 emails", desc: "A moderate flow" },
                  { value: "high", label: "50-100 emails", desc: "Busy inbox" },
                  { value: "very-high", label: "100+ emails", desc: "I need serious help" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem 
                      value={option.value} 
                      id={`volume-${option.value}`}
                      data-testid={`radio-email-volume-${option.value}`}
                    />
                    <Label htmlFor={`volume-${option.value}`} className="flex items-center gap-3 cursor-pointer flex-1">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <Inbox className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.desc}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {step === "ai-features" && (
              <div className="space-y-3">
                {[
                  { value: "auto-draft", label: "AI Reply Drafts", desc: "Generate smart reply suggestions" },
                  { value: "suggest-replies", label: "Tone Matching", desc: "Match your writing style" },
                  { value: "auto-label", label: "Smart Labeling", desc: "Automatically organize emails" },
                  { value: "summarize", label: "Email Summaries", desc: "Get quick email summaries" },
                ].map((feature) => (
                  <button
                    key={feature.value}
                    type="button"
                    onClick={() => toggleFeature(feature.value)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      preferences.aiFeatures.includes(feature.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    data-testid={`button-feature-${feature.value}`}
                  >
                    <div className="font-medium">{feature.label}</div>
                    <div className="text-sm text-muted-foreground">{feature.desc}</div>
                  </button>
                ))}
              </div>
            )}

            {step === "automation" && (
              <RadioGroup
                value={preferences.automationLevel}
                onValueChange={(value) => setPreferences({ ...preferences, automationLevel: value })}
                className="space-y-3"
              >
                {[
                  { value: "low", label: "Minimal", desc: "I'll write most replies myself" },
                  { value: "medium", label: "Balanced", desc: "Suggest drafts but let me review" },
                  { value: "high", label: "Maximum", desc: "Automate as much as possible" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem 
                      value={option.value} 
                      id={option.value}
                      data-testid={`radio-automation-${option.value}`}
                    />
                    <Label htmlFor={option.value} className="cursor-pointer flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.desc}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {step === "tone" && (
              <div className="space-y-4">
                <RadioGroup
                  value={preferences.replyTone}
                  onValueChange={(value) => setPreferences({ ...preferences, replyTone: value })}
                  className="space-y-3"
                >
                  {[
                    { value: "professional", label: "Professional", desc: "Clear, formal, and courteous" },
                    { value: "friendly", label: "Friendly", desc: "Warm, approachable, casual" },
                    { value: "concise", label: "Concise", desc: "Brief, to the point" },
                    { value: "custom", label: "Custom", desc: "Describe your own style" },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-3">
                      <RadioGroupItem 
                        value={option.value} 
                        id={option.value}
                        data-testid={`radio-tone-${option.value}`}
                      />
                      <Label htmlFor={option.value} className="cursor-pointer flex-1">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.desc}</div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {preferences.replyTone === "custom" && (
                  <Input
                    placeholder="Describe your preferred tone..."
                    value={preferences.customTone || ""}
                    onChange={(e) => setPreferences({ ...preferences, customTone: e.target.value })}
                    data-testid="input-custom-tone"
                  />
                )}
              </div>
            )}

            {step === "security" && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0">
                    <Shield className="w-10 h-10 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account. When enabled, you'll need to enter a code sent to your email when signing in.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="enable-2fa" className="font-medium">Enable 2FA</Label>
                    <p className="text-sm text-muted-foreground">
                      Require email verification for sign in
                    </p>
                  </div>
                  <Switch
                    id="enable-2fa"
                    checked={preferences.enableTwoFactor || false}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, enableTwoFactor: checked })}
                    data-testid="switch-enable-2fa"
                  />
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  You can change this setting anytime in your account settings.
                </p>
              </div>
            )}

            {step === "referral" && (
              <div className="space-y-4">
                <RadioGroup
                  value={preferences.referralSource}
                  onValueChange={(value) => setPreferences({ ...preferences, referralSource: value })}
                  className="space-y-3"
                >
                  {[
                    { value: "search", label: "Search engine (Google, etc.)" },
                    { value: "social", label: "Social media" },
                    { value: "friend", label: "Friend or colleague" },
                    { value: "blog", label: "Blog or article" },
                    { value: "podcast", label: "Podcast" },
                    { value: "ad", label: "Online advertisement" },
                    { value: "other", label: "Other" },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-3">
                      <RadioGroupItem 
                        value={option.value} 
                        id={`referral-${option.value}`}
                        data-testid={`radio-referral-${option.value}`}
                      />
                      <Label htmlFor={`referral-${option.value}`} className="cursor-pointer flex-1">
                        <div className="font-medium">{option.label}</div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {preferences.referralSource === "other" && (
                  <Input
                    placeholder="Please specify..."
                    value={preferences.referralOther || ""}
                    onChange={(e) => setPreferences({ ...preferences, referralOther: e.target.value })}
                    data-testid="input-referral-other"
                  />
                )}
              </div>
            )}

            {step === "select-plan" && (
              <div className="space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center bg-muted rounded-full p-1" data-testid="billing-toggle">
                    <button
                      className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all touch-target ${
                        billingInterval === "monthly" 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setBillingInterval("monthly")}
                      data-testid="button-billing-monthly"
                    >
                      Monthly
                    </button>
                    <button
                      className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all touch-target ${
                        billingInterval === "annual" 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setBillingInterval("annual")}
                      data-testid="button-billing-annual"
                    >
                      Annual
                    </button>
                  </div>
                </div>

                {!showAllPlans ? (
                  <>
                    {(() => {
                      const plan = basePlans.find(p => p.id === recommendedPlan)!;
                      const displayPrice = plan.id === "free" 
                        ? "$0" 
                        : billingInterval === "annual" 
                          ? `$${plan.annualPrice}` 
                          : `$${plan.monthlyPrice}`;
                      const displayPeriod = plan.id === "free" 
                        ? "forever" 
                        : billingInterval === "annual" 
                          ? "/year" 
                          : "/month";

                      const getVisualizationData = () => {
                        const emailVolume = preferences.emailVolume;
                        const automationLevel = preferences.automationLevel;
                        
                        const emailsPerDay = emailVolume === "very-high" ? 120 : emailVolume === "high" ? 75 : emailVolume === "medium" ? 35 : 15;
                        const timeSavedPerEmail = plan.id === "business" ? 3 : plan.id === "pro" ? 2.5 : plan.id === "student" ? 2 : 1;
                        const dailyTimeSaved = Math.round((emailsPerDay * timeSavedPerEmail) / 60);
                        const monthlyTimeSaved = dailyTimeSaved * 22;
                        const yearlyTimeSaved = monthlyTimeSaved * 12;
                        
                        const productivityBoost = plan.id === "business" ? 95 : plan.id === "pro" ? 78 : plan.id === "student" ? 65 : 25;
                        const aiCapability = plan.id === "business" ? 100 : plan.id === "pro" ? 75 : plan.id === "student" ? 60 : 20;
                        
                        return { emailsPerDay, dailyTimeSaved, monthlyTimeSaved, yearlyTimeSaved, productivityBoost, aiCapability };
                      };
                      
                      const vizData = getVisualizationData();

                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="p-4 sm:p-5 rounded-lg border-2 border-primary bg-primary/5 relative">
                            <Badge className="absolute -top-2.5 left-3 sm:left-4 bg-primary text-primary-foreground text-[10px] sm:text-xs">
                              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                              Recommended for you
                            </Badge>
                            
                            <div className="flex items-start justify-between gap-4 mb-6 mt-2">
                              <div>
                                <h3 className="text-2xl font-bold">{plan.name}</h3>
                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold">{displayPrice}</div>
                                <div className="text-sm text-muted-foreground">{displayPeriod}</div>
                              </div>
                            </div>

                            <div className="space-y-2 mb-6">
                              <div className="grid grid-cols-1 gap-1.5">
                                {plan.features.map((feature) => (
                                  <div key={feature} className="flex items-center gap-2 text-sm">
                                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                    <span>{feature}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <Button
                              className="w-full"
                              size="lg"
                              onClick={() => handlePlanSelect(plan.id)}
                              disabled={isPlanLoading}
                              data-testid={`button-plan-${plan.id}`}
                            >
                              {isPlanLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Setting up...
                                </>
                              ) : plan.id === "free" ? (
                                "Get started free"
                              ) : (
                                `Start 14-day free trial`
                              )}
                            </Button>
                          </div>

                          <div className="p-4 sm:p-5 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-primary" />
                              </div>
                              <h4 className="font-semibold">Why {plan.name} is perfect for you</h4>
                            </div>

                            <div className="space-y-5">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    Time saved per month
                                  </span>
                                  <span className="font-bold text-primary">{vizData.monthlyTimeSaved}+ hours</span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000 ease-out"
                                    style={{ 
                                      width: `${Math.min(vizData.monthlyTimeSaved * 2.5, 100)}%`,
                                      animation: 'slideIn 1s ease-out'
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  With {vizData.emailsPerDay} emails/day, you'll save {vizData.yearlyTimeSaved}+ hours/year
                                </p>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-muted-foreground" />
                                    AI capability unlocked
                                  </span>
                                  <span className="font-bold text-primary">{vizData.aiCapability}%</span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ 
                                      width: `${vizData.aiCapability}%`,
                                      animation: 'slideIn 1.2s ease-out'
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2">
                                    <Rocket className="w-4 h-4 text-muted-foreground" />
                                    Productivity boost
                                  </span>
                                  <span className="font-bold text-primary">{vizData.productivityBoost}%</span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                                    style={{ 
                                      width: `${vizData.productivityBoost}%`,
                                      animation: 'slideIn 1.4s ease-out'
                                    }}
                                  />
                                </div>
                              </div>

                              {plan.id !== "free" && (
                                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">Value comparison</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    At ${billingInterval === "annual" ? Math.round((plan.annualPrice || 0) / 12) : plan.monthlyPrice}/month, 
                                    you're paying just ${(((billingInterval === "annual" ? (plan.annualPrice || 0) / 12 : plan.monthlyPrice) || 0) / vizData.monthlyTimeSaved).toFixed(2)}/hour 
                                    for time saved. That's {Math.round(25 / (((billingInterval === "annual" ? (plan.annualPrice || 0) / 12 : plan.monthlyPrice) || 1) / vizData.monthlyTimeSaved))}x more 
                                    valuable than your hourly rate.
                                  </p>
                                </div>
                              )}

                              {plan.id === "free" && (
                                <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Good starting point</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Perfect for trying MyDraft. Upgrade anytime when you're ready for more AI power.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="lg:col-span-2">
                            <button
                              type="button"
                              onClick={() => setShowAllPlans(true)}
                              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                              data-testid="button-view-all-plans"
                            >
                              View all plans
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="space-y-3">
                    {basePlans.map((plan) => {
                      const isRecommended = plan.id === recommendedPlan;
                      const displayPrice = plan.id === "free" 
                        ? "$0" 
                        : billingInterval === "annual" 
                          ? `$${plan.annualPrice}` 
                          : `$${plan.monthlyPrice}`;
                      const displayPeriod = plan.id === "free" 
                        ? "forever" 
                        : billingInterval === "annual" 
                          ? "/year" 
                          : "/month";

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => handlePlanSelect(plan.id)}
                          disabled={isPlanLoading}
                          className={`w-full p-3 sm:p-4 rounded-lg border text-left transition-all relative touch-target ${
                            isRecommended
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-muted-foreground"
                          } ${isPlanLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                          data-testid={`button-plan-${plan.id}`}
                        >
                          {isRecommended && (
                            <Badge className="absolute -top-2.5 left-3 sm:left-4 bg-primary text-primary-foreground text-[10px] sm:text-xs">
                              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                              Recommended
                            </Badge>
                          )}
                          <div className="flex items-center justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm sm:text-base">{plan.name}</div>
                              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">{plan.description}</div>
                              <div className="flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 mt-2">
                                {plan.features.slice(0, 2).map((feature) => (
                                  <span key={feature} className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5 sm:gap-1">
                                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary flex-shrink-0" />
                                    <span className="line-clamp-1">{feature}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg sm:text-xl font-bold">{displayPrice}</div>
                              <div className="text-[10px] sm:text-xs text-muted-foreground">{displayPeriod}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setShowAllPlans(false)}
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                      data-testid="button-hide-all-plans"
                    >
                      Show recommended only
                    </button>
                  </div>
                )}

                {isPlanLoading && !showAllPlans && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Setting up your account...</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Pro and Business plans include a 14-day free trial. Cancel anytime.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={isPlanLoading}
            data-testid="button-onboarding-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {step !== "select-plan" && (
            <Button
              onClick={goNext}
              disabled={
                (step === "primary-use" && !preferences.primaryUse) ||
                (step === "email-volume" && !preferences.emailVolume) ||
                (step === "ai-features" && preferences.aiFeatures.length === 0) ||
                (step === "automation" && !preferences.automationLevel) ||
                (step === "tone" && !preferences.replyTone) ||
                (step === "referral" && !preferences.referralSource)
              }
              data-testid="button-onboarding-next"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
