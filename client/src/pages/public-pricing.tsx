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
  ChevronUp,
  HelpCircle
} from "lucide-react";

interface AuthResponse {
  user: { id: string; plan?: string; onboardingCompleted?: boolean; emailConnected?: boolean } | null;
}

export default function PublicPricingPage() {
  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const getStartedHref = () => {
    if (!authData?.user) return "/login";
    if (!authData.user.plan) return "/select-plan";
    if (!authData.user.onboardingCompleted) return "/onboarding";
    if (!authData.user.emailConnected) return "/connect-email";
    return "/inbox";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />

      <section className="pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-semibold mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <PricingCard
              name="Free"
              price="$0"
              description="For personal use"
              features={[
                { text: "1 email account", included: true },
                { text: "10 AI replies/day", included: true },
                { text: "Basic organization", included: true },
                { text: "7-day email history", included: true },
                { text: "Community support", included: true },
                { text: "Smart scheduling", included: false },
                { text: "Priority support", included: false },
              ]}
              href={getStartedHref()}
              buttonText="Start free"
            />
            <PricingCard
              name="Pro"
              price="$12"
              description="For professionals"
              features={[
                { text: "3 email accounts", included: true },
                { text: "Unlimited AI replies", included: true },
                { text: "Advanced organization", included: true },
                { text: "30-day email history", included: true },
                { text: "Smart scheduling", included: true },
                { text: "Custom labels & rules", included: true },
                { text: "Priority support", included: true },
              ]}
              href={getStartedHref()}
              buttonText="Get started"
              highlighted
            />
            <PricingCard
              name="Business"
              price="$29"
              description="For teams"
              features={[
                { text: "Unlimited accounts", included: true },
                { text: "Unlimited AI replies", included: true },
                { text: "Advanced organization", included: true },
                { text: "Unlimited history", included: true },
                { text: "Team collaboration", included: true },
                { text: "Admin controls", included: true },
                { text: "API access", included: true },
              ]}
              href={getStartedHref()}
              buttonText="Get started"
            />
          </div>

          <FeatureComparison />
        </div>
      </section>

      <PricingFAQ />

      <section className="py-16 px-6 border-t border-border/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            We're here to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <Link href={getStartedHref()}>
            <Button size="lg">
              Start free trial
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
  description, 
  features, 
  href,
  buttonText,
  highlighted = false 
}: { 
  name: string;
  price: string;
  description: string;
  features: { text: string; included: boolean }[];
  href: string;
  buttonText: string;
  highlighted?: boolean;
}) {
  return (
    <Card className={`relative ${highlighted ? 'border-primary ring-1 ring-primary' : 'border-border/50'}`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="text-center">
          <CardTitle className="text-lg mb-1">{name}</CardTitle>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">{price}</span>
            {price !== "$0" && <span className="text-muted-foreground">/month</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              {feature.included ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              )}
              <span className={feature.included ? '' : 'text-muted-foreground/50'}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
        <Link href={href}>
          <Button 
            variant={highlighted ? "default" : "outline"} 
            className="w-full"
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
    { name: "Email accounts", free: "1", pro: "3", business: "Unlimited" },
    { name: "AI replies per day", free: "10", pro: "Unlimited", business: "Unlimited" },
    { name: "Email history", free: "7 days", pro: "30 days", business: "Unlimited" },
    { name: "Thread summaries", free: "check", pro: "check", business: "check" },
    { name: "Auto-labeling", free: "Basic", pro: "Advanced", business: "Advanced" },
    { name: "Smart scheduling", free: "x", pro: "check", business: "check" },
    { name: "Custom rules", free: "x", pro: "check", business: "check" },
    { name: "Team features", free: "x", pro: "x", business: "check" },
    { name: "API access", free: "x", pro: "x", business: "check" },
    { name: "Support", free: "Community", pro: "Priority", business: "Dedicated" },
  ];

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-4 font-medium">Features</th>
              <th className="text-center p-4 font-medium">Free</th>
              <th className="text-center p-4 font-medium bg-primary/5">Pro</th>
              <th className="text-center p-4 font-medium">Business</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0">
                <td className="p-4 text-sm">{feature.name}</td>
                <td className="p-4 text-center text-sm">
                  <FeatureValue value={feature.free} />
                </td>
                <td className="p-4 text-center text-sm bg-primary/5">
                  <FeatureValue value={feature.pro} />
                </td>
                <td className="p-4 text-center text-sm">
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

function FeatureValue({ value }: { value: string }) {
  if (value === "check") {
    return <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />;
  }
  if (value === "x") {
    return <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
  }
  return <span className="text-muted-foreground">{value}</span>;
}

function PricingFAQ() {
  const faqs = [
    {
      q: "Can I switch plans later?",
      a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle."
    },
    {
      q: "Is there a free trial for Pro?",
      a: "Yes! Start with our free plan and experience core features. Upgrade to Pro when you're ready for unlimited AI replies and more accounts."
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
    <section className="py-16 px-6 border-t border-border/30">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold mb-4">Pricing FAQ</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-border/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="font-medium pr-4">{faq.q}</span>
                {openIndex === i ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border/30">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <HelpCircle className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">MailFlow</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/product" className="hover:text-foreground transition-colors">Product</Link>
            <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
