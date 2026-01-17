import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Sparkles, 
  Clock, 
  Shield, 
  CheckCircle,
  ArrowRight,
  Brain,
  Mail,
  Star,
  ChevronDown,
  Tag,
  Inbox,
  Send,
  Archive
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
    if (!authData?.user) return "/login?mode=register";
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
      <FAQSection />
      <FinalCTASection getStartedHref={getStartedHref()} />
      <Footer />
    </div>
  );
}

function HeroSection({ getStartedHref }: { getStartedHref: string }) {
  return (
    <section className="min-h-[85vh] sm:min-h-0 pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-20 md:pb-24 px-5 sm:px-6 relative overflow-hidden flex items-center sm:block">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[600px] bg-primary/[0.08] rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative w-full">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
          <div className="max-w-xl text-center lg:text-left mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered Email Management
            </div>
            <h1 className="text-[2.5rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.1] mb-5 sm:mb-6">
              Reply faster.
              <br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Stress less.
              </span>
            </h1>
            <p className="text-lg sm:text-lg text-muted-foreground leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
              AI drafts replies in your voice and organizes your inbox. Save 2+ hours daily.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center lg:justify-start">
              <Link href={getStartedHref}>
                <Button size="lg" className="gap-2 w-full sm:w-auto h-14 sm:h-11 text-base shadow-lg shadow-primary/25" data-testid="hero-getstarted">
                  Start free
                  <ArrowRight className="w-5 h-5 sm:w-4 sm:h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 sm:h-11 text-base border-white/10" data-testid="hero-signin">
                  Sign in
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground/70 mt-6 sm:mt-5">
              14-day free trial. Cancel anytime.
            </p>
          </div>
          
          <div className="relative lg:ml-8">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-2xl blur-2xl opacity-60" />
            <div className="relative rounded-2xl border border-white/[0.08] bg-card/40 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40">
              <div className="bg-white/[0.02] px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <span className="text-xs text-muted-foreground/60">Draft</span>
                <div className="w-16" />
              </div>
              
              <div className="flex">
                <div className="w-12 border-r border-white/[0.04] py-3 flex flex-col items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Inbox className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="w-7 h-7 rounded-lg hover:bg-white/[0.03] flex items-center justify-center text-muted-foreground/50">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-7 h-7 rounded-lg hover:bg-white/[0.03] flex items-center justify-center text-muted-foreground/50">
                    <Archive className="w-3.5 h-3.5" />
                  </div>
                </div>
                
                <div className="flex-1 p-4 space-y-2">
                  <MockEmailItem 
                    from="Sarah Chen" 
                    subject="Q4 Report Review"
                    preview="Could you review the attached report and..."
                    time="2m"
                    unread
                    selected
                  />
                  <MockEmailItem 
                    from="James Wilson" 
                    subject="Meeting Tomorrow"
                    preview="Just confirming our 2pm call regarding..."
                    time="15m"
                  />
                  <MockEmailItem 
                    from="HR Team" 
                    subject="Benefits Enrollment"
                    preview="Open enrollment period starts next..."
                    time="1h"
                  />
                  
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-primary/30 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-primary">AI Draft Ready</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      "Hi Sarah, I've reviewed the Q4 report and it looks great. I have a few minor suggestions for the executive summary..."
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" className="h-7 text-xs px-3">
                        Send
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-3 text-muted-foreground">
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockEmailItem({ from, subject, preview, time, unread = false, selected = false }: { 
  from: string; 
  subject: string; 
  preview: string; 
  time: string;
  unread?: boolean;
  selected?: boolean;
}) {
  return (
    <div className={`p-3 rounded-xl transition-colors ${selected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-white/[0.02]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${selected ? 'bg-primary/30 text-primary ring-2 ring-primary/20' : 'bg-white/[0.06] text-muted-foreground'}`}>
            {from.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{from}</span>
              {unread && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </div>
            <p className={`text-sm truncate ${unread ? 'text-foreground/90' : 'text-muted-foreground/70'}`}>{subject}</p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground/50 flex-shrink-0">{time}</span>
      </div>
      <p className="text-xs text-muted-foreground/50 mt-1.5 pl-11 truncate">{preview}</p>
    </div>
  );
}

function DemoSection() {
  const [activeDemo, setActiveDemo] = useState<'summary' | 'draft' | 'label'>('summary');

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            See it in action
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Experience how Draft transforms your email workflow
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
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

          <div className="rounded-2xl border border-white/[0.08] bg-card/30 backdrop-blur-sm overflow-hidden shadow-xl shadow-black/20">
            {activeDemo === 'summary' && <DemoSummary />}
            {activeDemo === 'draft' && <DemoDraft />}
            {activeDemo === 'label' && <DemoLabels />}
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
      className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ${
        active 
          ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/5' 
          : 'border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.02]'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl transition-colors ${active ? 'bg-primary/20 text-primary' : 'bg-white/[0.04] text-muted-foreground'}`}>
          {icon}
        </div>
        <div>
          <h3 className={`font-medium text-base ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h3>
          <p className="text-sm text-muted-foreground/70 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  );
}

function DemoSummary() {
  return (
    <div className="p-6">
      <div className="mb-5 pb-5 border-b border-white/[0.06]">
        <h4 className="font-medium text-base mb-1">Re: Q4 Marketing Budget Review</h4>
        <p className="text-sm text-muted-foreground/60">15 messages in thread</p>
      </div>
      <div className="p-5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary/30 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-primary">Thread Summary</span>
        </div>
        <ul className="text-sm space-y-3 text-muted-foreground">
          <li className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Marketing team requests 15% budget increase for Q4 campaigns</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Finance approved 10% with condition on ROI metrics</span>
          </li>
          <li className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <span>Awaiting your approval on the revised proposal</span>
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
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-muted-foreground/60">Tone:</span>
        <div className="flex gap-2">
          {(['professional', 'friendly', 'concise'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              data-testid={`demo-tone-${t}`}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                tone === t 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' 
                  : 'bg-white/[0.04] text-muted-foreground hover:bg-white/[0.06]'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">AI Draft</span>
        </div>
        <p className="text-sm whitespace-pre-line text-muted-foreground leading-relaxed">
          {drafts[tone]}
        </p>
      </div>
      <p className="text-xs text-muted-foreground/50 mt-4">
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
        labels={[{ name: "Action Required", color: "bg-red-500/20 text-red-400 border-red-500/20" }]}
      />
      <MockLabeledEmail 
        from="Newsletter" 
        subject="Weekly Tech Digest"
        labels={[{ name: "Newsletter", color: "bg-blue-500/20 text-blue-400 border-blue-500/20" }]}
      />
      <MockLabeledEmail 
        from="Sarah Chen" 
        subject="Q4 Report Review"
        labels={[
          { name: "Work", color: "bg-purple-500/20 text-purple-400 border-purple-500/20" },
          { name: "Needs Reply", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20" }
        ]}
      />
      <MockLabeledEmail 
        from="Amazon" 
        subject="Your order has shipped"
        labels={[{ name: "Receipts", color: "bg-green-500/20 text-green-400 border-green-500/20" }]}
      />
      <p className="text-xs text-muted-foreground/50 pt-3">
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
    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium text-muted-foreground">
            {from.charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium">{from}</span>
            <p className="text-sm text-muted-foreground/70 truncate">{subject}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {labels.map((label, i) => (
            <span key={i} className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${label.color}`}>
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
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Why people love Draft
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Spend less time in your inbox, more time on what matters
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((benefit, i) => (
            <Card key={i} className="bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <CardContent className="p-6">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 text-primary">
                  {benefit.icon}
                </div>
                <h3 className="font-medium text-base mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const testimonials = [
    {
      quote: "I used to spend 3 hours on email every morning. Now it's under an hour. Draft's AI drafts are surprisingly good.",
      name: "Rachel Torres",
      role: "VP of Sales"
    },
    {
      quote: "The thread summaries alone are worth it. I can jump into any conversation and know exactly what's happening.",
      name: "David Park",
      role: "Product Manager"
    },
    {
      quote: "Finally, an email tool that doesn't try to do too much. It's fast, clean, and the AI actually helps.",
      name: "Maria Santos",
      role: "Founder & CEO"
    },
    {
      quote: "I was skeptical about AI writing my emails, but the tone customization is great. My replies still sound like me.",
      name: "James Chen",
      role: "Account Executive"
    },
    {
      quote: "The auto-labeling saved my sanity. No more digging through newsletters to find client emails.",
      name: "Emma Williams",
      role: "Customer Success"
    }
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-24 px-6 border-t border-white/[0.04] overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Trusted by thousands
          </h2>
          <p className="text-muted-foreground text-lg">
            Join thousands who've reclaimed their inbox
          </p>
        </div>
        
        <div className="relative">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((t, i) => (
                <div key={i} className="w-full flex-shrink-0 px-4">
                  <Card className="bg-white/[0.02] border-white/[0.06] max-w-2xl mx-auto">
                    <CardContent className="p-8 text-center">
                      <div className="flex justify-center gap-1 mb-6">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className="w-5 h-5 fill-primary text-primary" />
                        ))}
                      </div>
                      <p className="text-lg text-muted-foreground leading-relaxed mb-6">"{t.quote}"</p>
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-sm text-muted-foreground/60">{t.role}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={prevSlide}
              className="w-10 h-10 rounded-full border border-white/[0.1] flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/[0.2] transition-colors"
              data-testid="testimonial-prev"
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-primary' : 'bg-white/20 hover:bg-white/30'
                  }`}
                  data-testid={`testimonial-dot-${i}`}
                />
              ))}
            </div>
            <button
              onClick={nextSlide}
              className="w-10 h-10 rounded-full border border-white/[0.1] flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/[0.2] transition-colors"
              data-testid="testimonial-next"
            >
              <ChevronDown className="w-5 h-5 -rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </section>
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
      a: "Absolutely! AI drafts are just a starting point. Edit them however you like before sending, or regenerate with a different tone."
    },
    {
      q: "Which email providers do you support?",
      a: "Draft works with Gmail, Google Workspace, Outlook, and Microsoft 365. We use secure OAuth authentication for all providers."
    },
    {
      q: "Is there a free trial?",
      a: "Yes! Every paid plan includes a 14-day free trial. Add a card to start, and you won't be charged until day 15. Cancel anytime during the trial."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes, you can cancel your subscription at any time. No contracts, no cancellation fees. Your account will remain active until the end of your billing period."
    },
    {
      q: "What makes Draft different from other email apps?",
      a: "Draft is designed for anyone who wants to spend less time on email. Our AI understands context and tone, helping you reply faster while maintaining your voice."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about Draft
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-white/[0.06] rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                data-testid={`faq-toggle-${i}`}
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

function FinalCTASection({ getStartedHref }: { getStartedHref: string }) {
  return (
    <section className="py-24 px-6 border-t border-white/[0.04] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.05] via-transparent to-transparent pointer-events-none" />
      <div className="max-w-2xl mx-auto text-center relative">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-5">
          Ready to reclaim your inbox?
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          14-day free trial on Pro & Business. Cancel anytime.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={getStartedHref}>
            <Button size="lg" className="gap-2 h-12 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" data-testid="cta-getstarted">
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="h-12 px-8 text-base border-white/10 hover:bg-white/[0.03]" data-testid="cta-pricing">
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
    <footer className="py-12 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-pricing">Pricing</Link></li>
              <li><Link href="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-security">Security</Link></li>
              <li><Link href="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-help">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms of Service</Link></li>
              <li><Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-cookies">Cookie Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Policies</h4>
            <ul className="space-y-2">
              <li><Link href="/acceptable-use" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-aup">Acceptable Use</Link></li>
              <li><Link href="/dpa" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-dpa">DPA</Link></li>
              <li><Link href="/ai-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-ai">AI Use Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Billing</h4>
            <ul className="space-y-2">
              <li><Link href="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-refund">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/[0.04] text-center">
          <p className="text-sm text-muted-foreground/50">© 2024 Draft. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
