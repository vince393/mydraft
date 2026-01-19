import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery } from "@tanstack/react-query";
import { 
  Sparkles, 
  Brain,
  Tag,
  Clock,
  ArrowRight,
  Mail,
  CheckCircle,
  Inbox,
  Send,
  Zap
} from "lucide-react";

interface AuthResponse {
  user: { id: string; plan?: string; onboardingCompleted?: boolean; emailConnected?: boolean } | null;
}

export default function ProductPage() {
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

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">Product</Badge>
          <h1 className="text-4xl md:text-5xl font-semibold mb-6">
            Email, reimagined with AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            MyDraft combines a clean, focused inbox with powerful AI features 
            that help you communicate faster and stay organized effortlessly.
          </p>
          <Link href={getStartedHref()}>
            <Button size="lg" className="gap-2">
              Try it free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <FeatureSection
        badge="AI Replies"
        title="AI drafts replies in seconds"
        description="Select any email and get an AI-generated reply that matches your tone. Professional, friendly, or concise - you choose the style, we handle the writing."
        icon={<Sparkles className="w-6 h-6" />}
        features={[
          "Contextual responses based on the full thread",
          "Three tone options: Professional, Friendly, Concise",
          "Edit freely before sending",
          "Learns your writing style over time"
        ]}
        imageSide="right"
        mockContent={
          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-border/50 bg-card/30">
              <p className="text-sm text-muted-foreground">From: Sarah Chen</p>
              <p className="text-sm font-medium mt-1">Can you review the Q4 report?</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI Draft</span>
                <Badge variant="secondary" className="text-xs ml-auto">Professional</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Hi Sarah,<br /><br />
                I've reviewed the Q4 report and it looks solid. The revenue projections 
                align well with our targets. I have a few minor suggestions for the 
                executive summary that I'll share in our call tomorrow.<br /><br />
                Best regards
              </p>
            </div>
          </div>
        }
      />

      <FeatureSection
        badge="Thread Summaries"
        title="Never lose context again"
        description="Long email threads can be overwhelming. Our AI summarizes key points, decisions, and action items so you can catch up in seconds, not minutes."
        icon={<Brain className="w-6 h-6" />}
        features={[
          "Instant summaries of any thread length",
          "Highlights decisions and action items",
          "Shows who said what, when",
          "Works for new and existing threads"
        ]}
        imageSide="left"
        mockContent={
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Q4 Budget Discussion</p>
              <span className="text-xs text-muted-foreground">23 messages</span>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Summary</span>
              </div>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Marketing requested 15% increase</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Finance approved 10% with ROI conditions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Your approval needed by Friday</span>
                </li>
              </ul>
            </div>
          </div>
        }
      />

      <FeatureSection
        badge="Auto-Labels"
        title="Organized without effort"
        description="Every email is automatically categorized as it arrives. Find what you need instantly without creating complex rules or sorting manually."
        icon={<Tag className="w-6 h-6" />}
        features={[
          "Automatic categorization on arrival",
          "Built-in labels: Work, Personal, Newsletters, Receipts",
          "Custom labels and rules (Pro)",
          "'Needs Reply' detection"
        ]}
        imageSide="right"
        mockContent={
          <div className="space-y-3">
            <MockEmail from="HR Team" subject="Benefits Enrollment" label="Action Required" labelColor="bg-red-500/20 text-red-400" />
            <MockEmail from="AWS" subject="Invoice #12345" label="Receipts" labelColor="bg-green-500/20 text-green-400" />
            <MockEmail from="Sarah Chen" subject="Project Update" label="Work" labelColor="bg-purple-500/20 text-purple-400" />
            <MockEmail from="TechCrunch" subject="Daily Digest" label="Newsletter" labelColor="bg-blue-500/20 text-blue-400" />
          </div>
        }
      />

      <FeatureSection
        badge="Smart Scheduling"
        title="Send at the perfect time"
        description="Write emails when it's convenient for you, send them when they'll have the most impact. Schedule sends for optimal delivery times."
        icon={<Clock className="w-6 h-6" />}
        features={[
          "Schedule for any date and time",
          "Timezone-aware delivery",
          "Optimal send time suggestions",
          "Edit or cancel scheduled emails"
        ]}
        imageSide="left"
        mockContent={
          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-border/50 bg-card/30">
              <p className="text-sm font-medium mb-2">Scheduled Emails</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">To: client@company.com</span>
                  <Badge variant="secondary" className="text-xs">Tomorrow 9:00 AM</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">To: team@startup.io</span>
                  <Badge variant="secondary" className="text-xs">Mon 8:00 AM</Badge>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary">Best time to send: 9:00 AM EST</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on recipient's typical response patterns
              </p>
            </div>
          </div>
        }
      />

      <section className="py-20 px-6 border-t border-border/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-4">
            Works with your email
          </h2>
          <p className="text-muted-foreground mb-12 max-w-xl mx-auto">
            Connect your existing email accounts in seconds. No migration needed.
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            <ProviderCard name="Gmail" icon={<Mail className="w-8 h-8" />} />
            <ProviderCard name="Google Workspace" icon={<Inbox className="w-8 h-8" />} />
            <ProviderCard name="Outlook" icon={<Send className="w-8 h-8" />} />
            <ProviderCard name="Microsoft 365" icon={<Mail className="w-8 h-8" />} />
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-border/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-4">
            Ready to try MyDraft?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Start free and see how AI can transform your email workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={getStartedHref()}>
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Start free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                View pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureSection({ 
  badge, 
  title, 
  description, 
  icon, 
  features, 
  imageSide,
  mockContent
}: {
  badge: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  imageSide: 'left' | 'right';
  mockContent: React.ReactNode;
}) {
  const content = (
    <div>
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary">
        {icon}
      </div>
      <Badge variant="secondary" className="mb-4">{badge}</Badge>
      <h2 className="text-2xl md:text-3xl font-semibold mb-4">{title}</h2>
      <p className="text-muted-foreground mb-6">{description}</p>
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );

  const mock = (
    <div className="rounded-xl border border-border/50 bg-card/30 p-6">
      {mockContent}
    </div>
  );

  return (
    <section className="py-20 px-6 border-t border-border/30">
      <div className="max-w-6xl mx-auto">
        <div className={`grid lg:grid-cols-2 gap-12 items-center ${imageSide === 'left' ? 'lg:grid-flow-dense' : ''}`}>
          {imageSide === 'left' ? (
            <>
              <div className="lg:col-start-2">{content}</div>
              <div className="lg:col-start-1">{mock}</div>
            </>
          ) : (
            <>
              {content}
              {mock}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function MockEmail({ from, subject, label, labelColor }: { 
  from: string; 
  subject: string; 
  label: string;
  labelColor: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-border/50 bg-card/30 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
          {from.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{from}</p>
          <p className="text-xs text-muted-foreground truncate">{subject}</p>
        </div>
      </div>
      <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${labelColor}`}>
        {label}
      </span>
    </div>
  );
}

function ProviderCard({ name, icon }: { name: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border/50 bg-card/30 min-w-[140px]">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border/30">
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
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <a href="mailto:support@mydraft.io" className="hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
            <a href="tel:+16197757982" className="hover:text-foreground transition-colors" data-testid="footer-phone">+1 (619) 775-7982</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
