import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Sparkles, 
  Clock, 
  Shield, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Brain,
  Mail,
  Star,
  Lock,
  Eye,
  ChevronDown,
  ChevronUp,
  Tag,
  Inbox,
  Send
} from "lucide-react";

interface AuthResponse {
  user: { id: string; plan?: string; onboardingCompleted?: boolean; emailConnected?: boolean } | null;
}

export default function LandingPage() {
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

      <HeroSection getStartedHref={getStartedHref()} />
      <DemoSection />
      <BenefitsSection />
      <TestimonialsSection />
      <SecuritySection />
      <FAQSection />
      <FinalCTASection getStartedHref={getStartedHref()} />
      <Footer />
    </div>
  );
}

function HeroSection({ getStartedHref }: { getStartedHref: string }) {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="secondary" className="mb-6">
              AI-Powered Email for Professionals
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6 leading-tight">
              Reply faster.
              <br />
              <span className="text-primary">Stress less.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              MailFlow uses AI to draft replies in your voice, summarize long threads, 
              and organize your inbox automatically. Save 2+ hours every day.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={getStartedHref}>
                <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="hero-getstarted">
                  Start free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto" data-testid="hero-signin">
                  Sign in
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Free forever. No credit card required.
            </p>
          </div>
          
          <div className="relative">
            <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden shadow-2xl">
              <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="text-xs text-muted-foreground ml-2">MailFlow</span>
              </div>
              <div className="p-4 space-y-3">
                <MockEmailItem 
                  from="Sarah Chen" 
                  subject="Q4 Report Review"
                  preview="Could you review the attached report..."
                  time="2m"
                  unread
                />
                <MockEmailItem 
                  from="James Wilson" 
                  subject="Meeting Tomorrow"
                  preview="Just confirming our 2pm call..."
                  time="15m"
                />
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI Draft Ready</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    "Hi Sarah, I've reviewed the Q4 report and it looks great. I have a few minor suggestions..."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockEmailItem({ from, subject, preview, time, unread = false }: { 
  from: string; 
  subject: string; 
  preview: string; 
  time: string;
  unread?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border ${unread ? 'bg-muted/20 border-border/50' : 'border-transparent'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
            {from.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${unread ? 'font-semibold' : ''}`}>{from}</span>
              {unread && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <p className={`text-sm truncate ${unread ? 'text-foreground' : 'text-muted-foreground'}`}>{subject}</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">{time}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 pl-11 truncate">{preview}</p>
    </div>
  );
}

function DemoSection() {
  const [activeDemo, setActiveDemo] = useState<'summary' | 'draft' | 'label'>('summary');

  return (
    <section className="py-20 px-6 border-t border-border/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            See it in action
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Experience how MailFlow transforms your email workflow
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-3">
            <DemoToggle 
              active={activeDemo === 'summary'}
              onClick={() => setActiveDemo('summary')}
              icon={<Brain className="w-5 h-5" />}
              title="AI Summaries"
              description="Click any email to get an instant summary of long threads"
              testId="demo-toggle-summary"
            />
            <DemoToggle 
              active={activeDemo === 'draft'}
              onClick={() => setActiveDemo('draft')}
              icon={<Sparkles className="w-5 h-5" />}
              title="Smart Drafts"
              description="Generate replies in your chosen tone: professional, friendly, or concise"
              testId="demo-toggle-draft"
            />
            <DemoToggle 
              active={activeDemo === 'label'}
              onClick={() => setActiveDemo('label')}
              icon={<Tag className="w-5 h-5" />}
              title="Auto-Labels"
              description="Emails are automatically categorized so you can focus on what matters"
              testId="demo-toggle-label"
            />
          </div>

          <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
            {activeDemo === 'summary' && (
              <DemoSummary />
            )}
            {activeDemo === 'draft' && (
              <DemoDraft />
            )}
            {activeDemo === 'label' && (
              <DemoLabels />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoToggle({ active, onClick, icon, title, description, testId }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        active 
          ? 'bg-primary/10 border-primary/30' 
          : 'border-border/50 hover:border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
        <div>
          <h3 className={`font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

function DemoSummary() {
  return (
    <div className="p-6">
      <div className="mb-4">
        <h4 className="font-medium mb-1">Re: Q4 Marketing Budget Review</h4>
        <p className="text-sm text-muted-foreground">15 messages in thread</p>
      </div>
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Thread Summary</span>
        </div>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            Marketing team requests 15% budget increase for Q4 campaigns
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            Finance approved 10% with condition on ROI metrics
          </li>
          <li className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            Awaiting your approval on the revised proposal
          </li>
        </ul>
      </div>
    </div>
  );
}

function DemoDraft() {
  const [tone, setTone] = useState<'professional' | 'friendly' | 'concise'>('professional');
  
  const drafts = {
    professional: "Dear Sarah,\n\nThank you for sending over the Q4 report. I've reviewed the key metrics and overall performance indicators. The results look promising.\n\nI have a few suggestions for the executive summary that I believe would strengthen the presentation. Would you have time for a brief call tomorrow to discuss?\n\nBest regards",
    friendly: "Hi Sarah!\n\nJust finished going through the Q4 report - great work! The numbers look really solid.\n\nI've got a couple of small tweaks for the summary section. Want to hop on a quick call tomorrow to chat through them?\n\nThanks!",
    concise: "Sarah - Reviewed the Q4 report. Looks good overall. Have minor suggestions for the exec summary. Free for a call tomorrow?"
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Tone:</span>
        <div className="flex gap-2">
          {(['professional', 'friendly', 'concise'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              data-testid={`demo-tone-${t}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                tone === t 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">AI Draft</span>
        </div>
        <p className="text-sm whitespace-pre-line text-muted-foreground">
          {drafts[tone]}
        </p>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Edit freely before sending. Your voice, perfected.
      </p>
    </div>
  );
}

function DemoLabels() {
  return (
    <div className="p-6 space-y-3">
      <MockLabeledEmail 
        from="HR Team" 
        subject="Benefits Enrollment Reminder"
        labels={[{ name: "Action Required", color: "bg-red-500/20 text-red-400" }]}
      />
      <MockLabeledEmail 
        from="Newsletter" 
        subject="Weekly Tech Digest"
        labels={[{ name: "Newsletter", color: "bg-blue-500/20 text-blue-400" }]}
      />
      <MockLabeledEmail 
        from="Sarah Chen" 
        subject="Q4 Report Review"
        labels={[
          { name: "Work", color: "bg-purple-500/20 text-purple-400" },
          { name: "Needs Reply", color: "bg-yellow-500/20 text-yellow-400" }
        ]}
      />
      <MockLabeledEmail 
        from="Amazon" 
        subject="Your order has shipped"
        labels={[{ name: "Receipts", color: "bg-green-500/20 text-green-400" }]}
      />
      <p className="text-xs text-muted-foreground pt-2">
        Labels are applied automatically as emails arrive
      </p>
    </div>
  );
}

function MockLabeledEmail({ from, subject, labels }: { 
  from: string; 
  subject: string;
  labels: { name: string; color: string }[];
}) {
  return (
    <div className="p-3 rounded-lg border border-border/50 bg-card/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {from.charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium">{from}</span>
            <p className="text-sm text-muted-foreground truncate">{subject}</p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {labels.map((label, i) => (
            <span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${label.color}`}>
              {label.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BenefitsSection() {
  const benefits = [
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Save 2+ hours daily",
      description: "AI drafts replies in seconds, not minutes. Focus on decisions, not typing."
    },
    {
      icon: <Inbox className="w-5 h-5" />,
      title: "Zero inbox stress",
      description: "Smart organization means the right emails surface at the right time."
    },
    {
      icon: <Brain className="w-5 h-5" />,
      title: "Never miss context",
      description: "Thread summaries keep you informed without reading every message."
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Your voice, amplified",
      description: "AI learns your style. Every reply sounds like you wrote it."
    },
    {
      icon: <Send className="w-5 h-5" />,
      title: "Multi-account support",
      description: "Gmail, Outlook, and more. All your inboxes in one clean interface."
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Enterprise security",
      description: "SOC 2 compliant. OAuth only. We never see your password."
    }
  ];

  return (
    <section className="py-20 px-6 border-t border-border/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Why professionals choose MailFlow
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built for people who get hundreds of emails a day
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, i) => (
            <Card key={i} className="bg-card/30 border-border/50">
              <CardContent className="pt-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                  {benefit.icon}
                </div>
                <h3 className="font-medium mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      quote: "I used to spend 3 hours on email every morning. Now it's under an hour. MailFlow's AI drafts are surprisingly good - I usually just tweak a word or two.",
      name: "Rachel Torres",
      role: "VP of Sales, SaaS Company",
      metric: "Saves 2+ hours/day"
    },
    {
      quote: "The thread summaries alone are worth it. I can jump into any conversation and know exactly what's happening without reading 50 messages.",
      name: "David Park",
      role: "Product Manager",
      metric: null
    },
    {
      quote: "Finally, an email tool that doesn't try to do too much. It's fast, clean, and the AI actually helps instead of getting in the way.",
      name: "Maria Santos",
      role: "Founder & CEO",
      metric: null
    },
    {
      quote: "I was skeptical about AI writing my emails, but the tone customization is great. My replies still sound like me, just faster.",
      name: "James Chen",
      role: "Account Executive",
      metric: "40% faster responses"
    },
    {
      quote: "The auto-labeling saved my sanity. No more digging through newsletters to find client emails. Everything's organized the moment it arrives.",
      name: "Emma Williams",
      role: "Customer Success Lead",
      metric: null
    },
    {
      quote: "We rolled this out to our exec team and they're hooked. Clean interface, smart features, and it just works with our existing Google Workspace.",
      name: "Michael Brown",
      role: "IT Director",
      metric: "Team of 12 users"
    }
  ];

  return (
    <section className="py-20 px-6 border-t border-border/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Trusted by busy professionals
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join thousands who've reclaimed their inbox
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Card key={i} className="bg-card/30 border-border/50">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">"{t.quote}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                  {t.metric && (
                    <Badge variant="secondary" className="text-xs">
                      {t.metric}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="py-20 px-6 border-t border-border/30">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl font-semibold mb-4">
              Your privacy, protected
            </h2>
            <p className="text-muted-foreground mb-6">
              We built MailFlow with security-first principles. Your emails are yours - 
              we're just here to help you manage them better.
            </p>
            <Link href="/security">
              <Button variant="outline" className="gap-2">
                Learn more about security
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            <SecurityItem 
              icon={<Lock className="w-4 h-4" />}
              title="OAuth-only access"
              description="We never see or store your email password"
            />
            <SecurityItem 
              icon={<Eye className="w-4 h-4" />}
              title="Minimal permissions"
              description="We only request access we need to function"
            />
            <SecurityItem 
              icon={<Shield className="w-4 h-4" />}
              title="No data selling"
              description="Your data is never sold to advertisers. Ever."
            />
            <SecurityItem 
              icon={<Zap className="w-4 h-4" />}
              title="Process, don't store"
              description="Emails are processed in real-time, not retained"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-border/50 bg-card/30">
      <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
        {icon}
      </div>
      <div>
        <h4 className="font-medium mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "Do you read my emails?",
      a: "Our AI processes your emails to generate summaries and drafts, but we don't store email content or use it for training. All processing happens in real-time and is not retained."
    },
    {
      q: "Can I edit AI-generated replies?",
      a: "Absolutely. AI drafts are suggestions, not final versions. You have full control to edit, rewrite, or discard any suggestion before sending."
    },
    {
      q: "Does it work with Gmail and Outlook?",
      a: "Yes. MailFlow works with Gmail, Google Workspace, Microsoft 365, and Outlook. We're adding support for more providers soon."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No contracts, no cancellation fees. You can downgrade to our free plan or delete your account at any time."
    },
    {
      q: "How does auto-labeling work?",
      a: "Our AI analyzes email content and metadata to categorize messages into labels like 'Needs Reply', 'Newsletter', 'Receipts', etc. You can customize labels and rules."
    },
    {
      q: "Is my data safe?",
      a: "We use OAuth for authentication (we never see your password), encrypt all data in transit and at rest, and follow industry security best practices."
    },
    {
      q: "How accurate are the AI drafts?",
      a: "Very. Our AI learns from context and your writing style over time. Most users find they only need minor tweaks before sending."
    },
    {
      q: "Can I use it for multiple email accounts?",
      a: "Free users can connect 1 account. Pro supports 3 accounts, and Business offers unlimited accounts."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 px-6 border-t border-border/30" id="faq">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about MailFlow
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-border/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                data-testid={`faq-toggle-${i}`}
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

function FinalCTASection({ getStartedHref }: { getStartedHref: string }) {
  return (
    <section className="py-20 px-6 border-t border-border/30">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold mb-4">
          Ready to transform your inbox?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Join thousands of professionals who've reclaimed hours of their day. 
          Start free, upgrade when you're ready.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={getStartedHref}>
            <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="cta-getstarted">
              Start free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="w-full sm:w-auto" data-testid="cta-pricing">
              View pricing
            </Button>
          </Link>
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
              <Mail className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">MailFlow</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/product" className="hover:text-foreground transition-colors">Product</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Your inbox, reimagined with AI.
          </p>
        </div>
      </div>
    </footer>
  );
}
