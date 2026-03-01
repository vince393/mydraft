import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle,
  X,
  ChevronDown,
  ArrowRight,
  Mail,
  Sparkles,
  Loader2
} from "lucide-react";

interface AuthResponse {
  user: { id: string; email?: string; plan?: string; onboardingCompleted?: boolean; emailConnected?: boolean } | null;
}

export default function PublicPricingPage() {
  const [billingInterval, setBillingInterval] = useState<"annual" | "monthly">("annual");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectingPlan, setSelectingPlan] = useState<string | null>(null);
  
  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const isLoggedIn = !!authData?.user;
  const currentPlan = authData?.user?.plan || null;
  const userEmail = authData?.user?.email;

  const getStartedHref = () => {
    if (!authData?.user) return "/login";
    // New flow: Login → Onboarding → Pricing → Connect Email
    if (!authData.user.onboardingCompleted) return "/onboarding";
    if (!authData.user.plan) return "/select-plan";
    if (!authData.user.emailConnected) return "/connect-email";
    return "/inbox";
  };

  // Free plan selection
  const selectFreePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/plan", { plan: "free" });
      return response.json();
    },
    onSuccess: () => {
      setLocation("/connect-email");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to select plan", description: error.message, variant: "destructive" });
      setSelectingPlan(null);
    },
  });

  // Navigate to custom checkout page for paid plans
  const handleCheckout = (plan: string, interval: "annual" | "monthly") => {
    setLocation(`/checkout?plan=${plan}&interval=${interval}`);
  };

  const handlePlanSelect = (planId: string) => {
    // If not logged in, go to signup
    if (!isLoggedIn) {
      setLocation("/login?mode=register");
      return;
    }

    // If user hasn't completed onboarding, send them there
    if (!authData?.user?.onboardingCompleted) {
      setLocation("/onboarding");
      return;
    }

    // If this is their current plan, do nothing
    if (planId === currentPlan || (planId === "business" && currentPlan === "premium")) {
      return;
    }

    setSelectingPlan(planId);

    if (planId === "free") {
      selectFreePlanMutation.mutate();
    } else {
      handleCheckout(planId, billingInterval);
    }
  };

  const isLoading = selectFreePlanMutation.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />

      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.06] rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Start Free Today
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.1] mb-6">
            Simple, transparent
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              pricing
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            14-day free trial on Pro & Business. Cancel anytime.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center bg-white/[0.04] rounded-full p-1 border border-white/[0.08]" data-testid="billing-toggle">
              <button
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
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
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
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
          
          {isLoggedIn && userEmail && (
            <div className="text-center mb-6 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="text-foreground font-medium">{userEmail}</span>
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-20">
            <PricingCard
              name="Free"
              planId="free"
              price="$0"
              period="forever"
              description="Perfect for trying out MyDraft"
              features={[
                { text: "Connect 1 email account", included: true },
                { text: "5 AI drafts per day", included: true },
                { text: "Basic inbox management", included: true },
                { text: "Standard support", included: true },
                { text: "Writing style memory", included: false },
                { text: "Voice assistant", included: false },
              ]}
              onSelect={() => handlePlanSelect("free")}
              buttonText={currentPlan === "free" ? "Current Plan" : "Start free"}
              isCurrentPlan={currentPlan === "free"}
              isLoading={selectingPlan === "free" && isLoading}
            />
            <PricingCard
              name="Pro"
              planId="pro"
              price={billingInterval === "annual" ? "$8.25" : "$10"}
              period="month"
              billedAnnually={billingInterval === "annual" ? 99 : undefined}
              annualSavings={billingInterval === "annual" ? 21 : undefined}
              description="For professionals who need more"
              features={[
                { text: "Connect 1 email account", included: true },
                { text: "Unlimited AI replies", included: true },
                { text: "Writing style memory", included: true },
                { text: "Email scheduling", included: true },
                { text: "Priority support", included: true },
                { text: "14-day free trial", included: true },
              ]}
              onSelect={() => handlePlanSelect("pro")}
              buttonText={currentPlan === "pro" ? "Current Plan" : "Start free trial"}
              isCurrentPlan={currentPlan === "pro"}
              isLoading={selectingPlan === "pro" && isLoading}
              highlighted
            />
            <PricingCard
              name="Business"
              planId="business"
              price={billingInterval === "annual" ? "$24.92" : "$29"}
              period="month"
              billedAnnually={billingInterval === "annual" ? 299 : undefined}
              annualSavings={billingInterval === "annual" ? 49 : undefined}
              description="For teams and power users"
              features={[
                { text: "Connect 1 email account", included: true },
                { text: "Enhanced AI quality", included: true },
                { text: "Unlimited AI replies", included: true },
                { text: "Voice assistant", included: true },
                { text: "Custom AI training", included: true },
                { text: "Team collaboration", included: true },
                { text: "14-day free trial", included: true },
              ]}
              onSelect={() => handlePlanSelect("business")}
              buttonText={(currentPlan === "business" || currentPlan === "premium") ? "Current Plan" : "Start free trial"}
              isCurrentPlan={currentPlan === "business" || currentPlan === "premium"}
              isLoading={selectingPlan === "business" && isLoading}
            />
          </div>

          <FeatureComparison />
        </div>
      </section>

      <PricingFAQ />

      <section className="py-20 px-6 border-t border-white/[0.04] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.05] via-transparent to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-5">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            14-day free trial on Pro & Business. Cancel anytime.
          </p>
          <Link href={getStartedHref()}>
            <Button size="lg" className="gap-2 h-12 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function PricingCard({ 
  name, 
  planId,
  price, 
  period = "month",
  billedAnnually,
  annualSavings,
  description, 
  features, 
  onSelect,
  buttonText,
  isCurrentPlan = false,
  isLoading = false,
  highlighted = false 
}: { 
  name: string;
  planId: string;
  price: string;
  period?: string;
  billedAnnually?: number;
  annualSavings?: number;
  description: string;
  features: { text: string; included: boolean }[];
  onSelect: () => void;
  buttonText: string;
  isCurrentPlan?: boolean;
  isLoading?: boolean;
  highlighted?: boolean;
}) {
  return (
    <Card className={`relative transition-all duration-300 ${
      isCurrentPlan
        ? 'border-green-500/50 bg-green-500/5'
        : highlighted 
          ? 'border-primary/50 bg-gradient-to-b from-primary/[0.08] to-transparent shadow-2xl shadow-primary/10 scale-[1.02]' 
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
    }`}>
      {isCurrentPlan ? (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1.5 rounded-full bg-green-600 text-white text-xs font-semibold shadow-lg">
            Current Plan
          </span>
        </div>
      ) : highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/30">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader className="pb-2 pt-8">
        <div className="text-center">
          <CardTitle className="text-lg font-medium mb-1">{name}</CardTitle>
          <p className="text-sm text-muted-foreground/70 mb-5">{description}</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-semibold tracking-tight">{price}</span>
            {price !== "$0" && <span className="text-muted-foreground/60">/{period}</span>}
          </div>
          {billedAnnually && (
            <p className="text-xs text-muted-foreground/60 mt-2">
              Billed annually at ${billedAnnually}/year
              {annualSavings && (
                <span className="text-green-500 ml-1 font-medium">· Save ${annualSavings}</span>
              )}
            </p>
          )}
          {!billedAnnually && annualSavings && (
            <p className="text-xs text-green-500 mt-2 font-medium">
              Save ${annualSavings}/year
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ul className="space-y-3.5 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              {feature.included ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
              )}
              <span className={feature.included ? 'text-foreground/90' : 'text-muted-foreground/40'}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
        <Button 
          variant={isCurrentPlan ? "secondary" : highlighted ? "default" : "outline"} 
          className={`w-full h-11 ${
            isCurrentPlan
              ? 'cursor-not-allowed opacity-70'
              : highlighted 
                ? 'shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30' 
                : 'border-white/10 hover:bg-white/[0.03]'
          }`}
          onClick={onSelect}
          disabled={isCurrentPlan || isLoading}
          data-testid={`pricing-${name.toLowerCase()}-cta`}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}

function FeatureComparison() {
  const features = [
    { name: "Email accounts", free: "1", pro: "1", business: "1" },
    { name: "Free trial", free: "x", pro: "14 days", business: "14 days" },
    { name: "AI replies", free: "5/day", pro: "Unlimited", business: "Unlimited" },
    { name: "Writing style memory", free: "x", pro: "check", business: "check" },
    { name: "AI model", free: "Standard", pro: "Standard", business: "Enhanced" },
    { name: "Inbox management", free: "Basic", pro: "Advanced", business: "Advanced" },
    { name: "Email scheduling", free: "x", pro: "check", business: "check" },
    { name: "Voice assistant", free: "x", pro: "x", business: "check" },
    { name: "Custom AI training", free: "x", pro: "x", business: "check" },
    { name: "Team collaboration", free: "x", pro: "x", business: "check" },
    { name: "Support", free: "Standard", pro: "Priority", business: "Dedicated" },
  ];

  return (
    <div className="border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.01]">
      <div className="p-6 border-b border-white/[0.06]">
        <h3 className="text-xl font-semibold">Compare plans</h3>
        <p className="text-sm text-muted-foreground/60 mt-1">See what's included in each plan</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left p-5 font-medium text-muted-foreground/70">Features</th>
              <th className="text-center p-5 font-medium text-muted-foreground/70 w-28">Free</th>
              <th className="text-center p-5 font-medium text-primary w-28 bg-primary/[0.03]">Pro</th>
              <th className="text-center p-5 font-medium text-muted-foreground/70 w-28">Business</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, i) => (
              <tr key={i} className="border-b border-white/[0.04] last:border-0">
                <td className="p-5 text-sm">{feature.name}</td>
                <td className="p-5 text-center text-sm">
                  <FeatureValue value={feature.free} />
                </td>
                <td className="p-5 text-center text-sm bg-primary/[0.03]">
                  <FeatureValue value={feature.pro} highlight />
                </td>
                <td className="p-5 text-center text-sm">
                  <FeatureValue value={feature.business} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeatureValue({ value, highlight = false }: { value: string; highlight?: boolean }) {
  if (value === "check") {
    return <CheckCircle className={`w-4 h-4 mx-auto ${highlight ? 'text-primary' : 'text-green-500'}`} />;
  }
  if (value === "x") {
    return <X className="w-4 h-4 text-muted-foreground/20 mx-auto" />;
  }
  return <span className={highlight ? 'text-primary font-medium' : 'text-muted-foreground/70'}>{value}</span>;
}

function PricingFAQ() {
  const faqs = [
    {
      q: "Can I switch plans later?",
      a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle."
    },
    {
      q: "Is there a free trial for Pro?",
      a: "Yes! Both Pro and Business plans include a 14-day free trial. Just add a card to start - you won't be charged until day 15. Cancel anytime."
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept all major credit cards and debit cards through Stripe. Enterprise customers can pay via invoice."
    },
    {
      q: "Can I cancel anytime?",
      a: "Absolutely. No contracts or cancellation fees. Cancel anytime from your account settings."
    },
    {
      q: "Do you offer discounts for annual billing?",
      a: "Yes, annual plans save you 20% compared to monthly billing. Contact us for team discounts."
    },
    {
      q: "What happens if I exceed my limits?",
      a: "On the Free plan, you'll see a prompt to upgrade when you hit your daily AI reply limit. Your emails remain accessible."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 px-6 border-t border-white/[0.04]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">Pricing FAQ</h2>
          <p className="text-muted-foreground">Common questions about our plans</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.01]">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                data-testid={`pricing-faq-toggle-${i}`}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-medium pr-4">{faq.q}</span>
                <div className={`p-1.5 rounded-lg bg-white/[0.04] transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${openIndex === i ? 'max-h-40' : 'max-h-0'}`}>
                <div className="px-5 pb-5">
                  <p className="text-sm text-muted-foreground/70 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6">
          <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms</Link>
          <Link href="/cookies" className="hover:text-foreground transition-colors" data-testid="footer-link-cookies">Cookies</Link>
          <Link href="/acceptable-use" className="hover:text-foreground transition-colors" data-testid="footer-link-aup">Acceptable Use</Link>
          <Link href="/dpa" className="hover:text-foreground transition-colors" data-testid="footer-link-dpa">DPA</Link>
          <Link href="/ai-policy" className="hover:text-foreground transition-colors" data-testid="footer-link-ai">AI Policy</Link>
          <Link href="/refund-policy" className="hover:text-foreground transition-colors" data-testid="footer-link-refund">Refunds</Link>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground/50">© 2024 MyDraft. All rights reserved.</p>
          <a href="mailto:support@mydraft.io" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
        </div>
      </div>
    </footer>
  );
}
