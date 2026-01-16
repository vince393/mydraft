import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  CheckCircle,
  X,
  ChevronDown,
  ArrowRight,
  Mail,
  Sparkles
} from "lucide-react";

interface AuthResponse {
  user: { id: string; plan?: string; onboardingCompleted?: boolean; emailConnected?: boolean } | null;
}

export default function PublicPricingPage() {
  const [billingInterval, setBillingInterval] = useState<"annual" | "monthly">("annual");
  
  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const getStartedHref = () => {
    if (!authData?.user) return "/login";
    // New flow: Login → Onboarding → Pricing → Connect Email
    if (!authData.user.onboardingCompleted) return "/onboarding";
    if (!authData.user.plan) return "/select-plan";
    if (!authData.user.emailConnected) return "/connect-email";
    return "/inbox";
  };

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
          
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            <PricingCard
              name="Free"
              price="$0"
              period="forever"
              description="Perfect for trying out Draft"
              features={[
                { text: "Connect 1 email account", included: true },
                { text: "Basic inbox management", included: true },
                { text: "Standard support", included: true },
                { text: "Unlimited AI replies", included: false },
                { text: "Email scheduling", included: false },
                { text: "Voice assistant", included: false },
              ]}
              href={getStartedHref()}
              buttonText="Start free"
            />
            <PricingCard
              name="Pro"
              price={billingInterval === "annual" ? "$199" : "$24"}
              period={billingInterval === "annual" ? "year" : "month"}
              description="For professionals who need more"
              features={[
                { text: "Connect 1 email account", included: true },
                { text: "Unlimited AI replies", included: true },
                { text: "Advanced tone customization", included: true },
                { text: "Email scheduling", included: true },
                { text: "Priority support", included: true },
                { text: "14-day free trial", included: true },
              ]}
              href={getStartedHref()}
              buttonText="Start free trial"
              highlighted
            />
            <PricingCard
              name="Business"
              price={billingInterval === "annual" ? "$399" : "$49"}
              period={billingInterval === "annual" ? "year" : "month"}
              description="For teams and power users"
              features={[
                { text: "Connect 1 email account", included: true },
                { text: "Unlimited AI replies", included: true },
                { text: "Voice assistant", included: true },
                { text: "Custom AI training", included: true },
                { text: "Team collaboration", included: true },
                { text: "Dedicated support", included: true },
                { text: "14-day free trial", included: true },
              ]}
              href={getStartedHref()}
              buttonText="Start free trial"
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
  price, 
  period = "month",
  description, 
  features, 
  href,
  buttonText,
  highlighted = false 
}: { 
  name: string;
  price: string;
  period?: string;
  description: string;
  features: { text: string; included: boolean }[];
  href: string;
  buttonText: string;
  highlighted?: boolean;
}) {
  return (
    <Card className={`relative transition-all duration-300 ${
      highlighted 
        ? 'border-primary/50 bg-gradient-to-b from-primary/[0.08] to-transparent shadow-2xl shadow-primary/10 scale-[1.02]' 
        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
    }`}>
      {highlighted && (
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
        <Link href={href}>
          <Button 
            variant={highlighted ? "default" : "outline"} 
            className={`w-full h-11 ${
              highlighted 
                ? 'shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30' 
                : 'border-white/10 hover:bg-white/[0.03]'
            }`}
            data-testid={`pricing-${name.toLowerCase()}-cta`}
          >
            {buttonText}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function FeatureComparison() {
  const features = [
    { name: "Email accounts", free: "1", pro: "1", business: "1" },
    { name: "Free trial", free: "x", pro: "14 days", business: "14 days" },
    { name: "AI replies", free: "Limited", pro: "Unlimited", business: "Unlimited" },
    { name: "Inbox management", free: "Basic", pro: "Advanced", business: "Advanced" },
    { name: "Tone customization", free: "x", pro: "check", business: "check" },
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
    <footer className="py-8 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center">
          <p className="text-sm text-muted-foreground/50">
            © 2024 Draft
          </p>
        </div>
      </div>
    </footer>
  );
}
