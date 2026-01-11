import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Sparkles, 
  Clock, 
  Shield, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Inbox,
  Send,
  Brain
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">MailFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="button-signin-nav">
                Sign in
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" data-testid="button-getstarted-nav">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            AI-Powered Email Management
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
            Your inbox, finally
            <span className="text-primary"> under control</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            MailFlow uses AI to help you write better replies, organize your inbox, 
            and respond faster. No more email overwhelm.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-getstarted-hero">
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto" data-testid="button-signin-hero">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">
              Everything you need to master email
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful features designed to save you hours every week
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Sparkles className="w-5 h-5" />}
              title="AI Reply Drafts"
              description="Get contextual reply suggestions with adjustable tone. Professional, casual, or concise - you choose."
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="Smart Organization"
              description="AI automatically labels and categorizes your emails so you can focus on what matters."
            />
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Schedule Sends"
              description="Write now, send later. Schedule emails for the perfect delivery time."
            />
            <FeatureCard
              icon={<Brain className="w-5 h-5" />}
              title="Email Summaries"
              description="Get instant summaries of long email threads. Never lose context again."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Secure & Private"
              description="Your data stays yours. Enterprise-grade security with no data selling."
            />
            <FeatureCard
              icon={<Send className="w-5 h-5" />}
              title="Multi-Provider"
              description="Works with Gmail, Outlook, and more. Connect all your accounts in one place."
            />
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">
              Get started in minutes
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three simple steps to a better inbox experience
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="Connect your email"
              description="Sign in with your Google or Microsoft account. Secure OAuth - we never see your password."
            />
            <StepCard
              step="2"
              title="Set your preferences"
              description="Tell us how you like to communicate. Formal? Casual? We'll adapt to your style."
            />
            <StepCard
              step="3"
              title="Start flowing"
              description="Let AI help you respond faster and keep your inbox organized effortlessly."
            />
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start free, upgrade when you need more
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              name="Free"
              price="$0"
              description="For personal use"
              features={[
                "1 email account",
                "10 AI replies/day",
                "Basic organization",
                "7-day history"
              ]}
            />
            <PricingCard
              name="Pro"
              price="$12"
              description="For professionals"
              features={[
                "3 email accounts",
                "Unlimited AI replies",
                "Smart scheduling",
                "Priority support",
                "30-day history"
              ]}
              highlighted
            />
            <PricingCard
              name="Business"
              price="$29"
              description="For teams"
              features={[
                "Unlimited accounts",
                "Team collaboration",
                "Admin controls",
                "API access",
                "Unlimited history"
              ]}
            />
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <Inbox className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            Ready to take control of your inbox?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join thousands who've already transformed their email workflow. 
            Start free, no credit card required.
          </p>
          <Link href="/login">
            <Button size="lg" className="gap-2" data-testid="button-getstarted-cta">
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Mail className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">MailFlow</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your inbox, reimagined with AI.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="pt-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
        <h3 className="font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({
  step,
  title,
  description
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-lg font-semibold">
        {step}
      </div>
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <Card className={`relative ${highlighted ? 'border-primary ring-1 ring-primary' : 'border-border/50'}`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
        </div>
      )}
      <CardContent className="pt-8 pb-6">
        <div className="text-center mb-6">
          <h3 className="font-medium mb-1">{name}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-semibold">{price}</span>
            {price !== "$0" && <span className="text-muted-foreground">/mo</span>}
          </div>
        </div>
        <ul className="space-y-3 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link href="/login">
          <Button 
            variant={highlighted ? "default" : "outline"} 
            className="w-full"
            data-testid={`button-select-${name.toLowerCase()}`}
          >
            Get started
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
