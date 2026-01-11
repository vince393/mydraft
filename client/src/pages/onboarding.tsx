import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, ArrowLeft, Loader2, Sparkles, Mail, Zap, MessageSquare } from "lucide-react";

type Step = "primary-use" | "ai-features" | "automation" | "tone";

interface AIPreferences {
  primaryUse: string;
  aiFeatures: string[];
  automationLevel: string;
  replyTone: string;
  customTone?: string;
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("primary-use");
  const [preferences, setPreferences] = useState<AIPreferences>({
    primaryUse: "",
    aiFeatures: [],
    automationLevel: "",
    replyTone: "",
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const steps: Step[] = ["primary-use", "ai-features", "automation", "tone"];
  const currentStepIndex = steps.indexOf(step);

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/onboarding", { aiPreferences: preferences });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    } else {
      completeOnboardingMutation.mutate();
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    } else {
      setLocation("/pricing");
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 w-16 rounded-full transition-colors ${
                i <= currentStepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-xl">
              {step === "primary-use" && "How will you use MailFlow?"}
              {step === "ai-features" && "Which AI features interest you?"}
              {step === "automation" && "How much automation do you want?"}
              {step === "tone" && "What's your preferred reply tone?"}
            </CardTitle>
            <CardDescription>
              {step === "primary-use" && "Help us personalize your experience"}
              {step === "ai-features" && "Select all that apply"}
              {step === "automation" && "We'll set up your inbox accordingly"}
              {step === "tone" && "This will be your default for AI replies"}
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
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={goBack}
            data-testid="button-onboarding-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={goNext}
            disabled={
              (step === "primary-use" && !preferences.primaryUse) ||
              (step === "ai-features" && preferences.aiFeatures.length === 0) ||
              (step === "automation" && !preferences.automationLevel) ||
              (step === "tone" && !preferences.replyTone) ||
              completeOnboardingMutation.isPending
            }
            data-testid="button-onboarding-next"
          >
            {completeOnboardingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStepIndex === steps.length - 1 ? "Complete Setup" : "Continue"}
            {currentStepIndex < steps.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
