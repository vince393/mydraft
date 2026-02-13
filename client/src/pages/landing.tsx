import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useScrollAnimation, useParallax } from "@/hooks/use-scroll-animation";
import { 
  Clock, 
  Shield, 
  CheckCircle,
  ArrowRight,
  Mail,
  Star,
  ChevronDown,
  Inbox,
  Send,
  Archive,
  Zap,
  Filter,
  Lock,
  X,
  Sparkles,
  Brain,
  Globe,
  Languages,
  Link2,
  MousePointerClick,
  Rocket,
  Users,
  Timer,
  Check,
  Minus,
  FolderOpen
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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <MarketingNav />
      <HeroSection getStartedHref={getStartedHref()} />
      <SocialProofSection />
      <HowItWorksSection />
      <DemoSection />
      <BenefitsSection />
      <ComparisonSection />
      <PricingPreviewSection getStartedHref={getStartedHref()} />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTASection getStartedHref={getStartedHref()} />
      <Footer />
    </div>
  );
}

function HeroSection({ getStartedHref }: { getStartedHref: string }) {
  const [mounted, setMounted] = useState(false);
  const parallaxOffset = useParallax(0.15);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="min-h-[100dvh] flex items-center pt-20 pb-12 px-5 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent pointer-events-none" />
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/[0.08] rounded-full blur-[150px] pointer-events-none transition-opacity duration-1000"
        style={{ 
          opacity: mounted ? 1 : 0,
          transform: `translate(-50%, calc(-50% + ${parallaxOffset}px))`
        }}
      />
      
      <div className="max-w-6xl mx-auto relative w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div 
              className="transition-all duration-1000 ease-out"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(30px)' }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                <Sparkles className="w-3.5 h-3.5" />
                14-day free trial - no card required
              </div>
            </div>
            
            <h1 
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.08] mb-6 transition-all duration-1000 ease-out"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(40px)', transitionDelay: '150ms' }}
            >
              Stop writing emails.
              <br />
              <span className="text-primary">Start sending them.</span>
            </h1>
            
            <p 
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0 transition-all duration-1000 ease-out"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(40px)', transitionDelay: '300ms' }}
            >
              MyDraft connects to your Gmail or Outlook and writes your replies using AI.
              You review, hit send, and move on with your day.
            </p>
            
            <div 
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start transition-all duration-1000 ease-out"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(40px)', transitionDelay: '450ms' }}
            >
              <Link href={getStartedHref}>
                <Button size="lg" className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/25" data-testid="hero-getstarted">
                  Try free for 14 days
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-white/10" data-testid="hero-pricing">
                  See pricing
                </Button>
              </Link>
            </div>
            
            <div 
              className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-8 justify-center lg:justify-start transition-all duration-1000 ease-out"
              style={{ opacity: mounted ? 1 : 0, transitionDelay: '600ms' }}
            >
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Works with Gmail & Outlook</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Setup in 2 minutes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Cancel anytime</span>
              </div>
            </div>
          </div>
          
          <div 
            className="relative transition-all duration-1000 ease-out"
            style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)', transitionDelay: '400ms' }}
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/15 via-primary/5 to-primary/10 rounded-3xl blur-3xl opacity-60" />
            <div className="relative rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40">
              <div className="bg-white/[0.02] px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <span className="text-xs text-muted-foreground/50 font-medium">MyDraft</span>
                <div className="w-12" />
              </div>
              
              <div className="flex">
                <div className="w-12 border-r border-white/[0.04] py-3 hidden sm:flex flex-col items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Inbox className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40">
                    <Archive className="w-3.5 h-3.5" />
                  </div>
                </div>
                
                <div className="flex-1 p-4 space-y-2.5">
                  <HeroEmailItem from="Sarah Chen" subject="Re: Q4 budget approved" time="5m" unread selected />
                  <HeroEmailItem from="David Park" subject="Quick question about the proposal" time="12m" unread />
                  <HeroEmailItem from="Lisa Martinez" subject="Meeting rescheduled to Thursday" time="1h" />
                  
                  <div className="mt-3 p-3 rounded-xl bg-primary/8 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">AI Draft Ready</span>
                    </div>
                    <p className="text-sm text-foreground/80 mb-2.5">
                      "Thanks Sarah! Budget looks great. I'll loop in the team and we can kick off Monday."
                    </p>
                    <div className="flex gap-2">
                      <div className="px-3 py-1 rounded-md bg-primary text-xs font-medium text-primary-foreground">Send</div>
                      <div className="px-3 py-1 rounded-md bg-white/[0.06] text-xs text-muted-foreground">Edit</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden sm:block">
        <ChevronDown className="w-5 h-5 text-muted-foreground/30" />
      </div>
    </section>
  );
}

function HeroEmailItem({ from, subject, time, unread = false, selected = false }: { 
  from: string; subject: string; time: string; unread?: boolean; selected?: boolean;
}) {
  return (
    <div className={`p-2.5 rounded-xl transition-colors ${selected ? 'bg-primary/10 ring-1 ring-primary/25' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${selected ? 'bg-primary/30 text-primary' : 'bg-white/[0.06] text-muted-foreground'}`}>
          {from.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${unread ? 'font-semibold' : 'text-muted-foreground'}`}>{from}</span>
            {unread && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
          </div>
          <p className={`text-xs truncate ${unread ? 'text-foreground/70' : 'text-muted-foreground/50'}`}>{subject}</p>
        </div>
        <span className="text-[10px] text-muted-foreground/40 flex-shrink-0">{time}</span>
      </div>
    </div>
  );
}

function SocialProofSection() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.3 });

  return (
    <section className="py-16 px-6 border-y border-white/[0.04]" ref={ref}>
      <div 
        className="max-w-5xl mx-auto transition-all duration-1000 ease-out"
        style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(20px)' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1" data-testid="stat-hours-saved">5 hrs</div>
            <p className="text-sm text-muted-foreground">saved per week on average</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1" data-testid="stat-reply-time">30s</div>
            <p className="text-sm text-muted-foreground">average reply time with AI</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1" data-testid="stat-languages">50+</div>
            <p className="text-sm text-muted-foreground">languages supported</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1" data-testid="stat-encryption">256-bit</div>
            <p className="text-sm text-muted-foreground">AES encryption on all data</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.15 });

  const steps = [
    {
      step: "01",
      icon: <Link2 className="w-6 h-6" />,
      title: "Connect your email",
      description: "Sign in with Google or Microsoft. Your inbox appears instantly. No migration, no forwarding, no data moves.",
    },
    {
      step: "02",
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI writes your replies",
      description: "Open any email and get an instant AI-drafted reply that matches your tone and style. Edit if you want, or send as-is.",
    },
    {
      step: "03",
      icon: <Rocket className="w-6 h-6" />,
      title: "Clear your inbox faster",
      description: "Summaries, smart folders, and one-click actions help you get to inbox zero every day. Spend minutes, not hours.",
    },
  ];

  return (
    <section className="py-24 sm:py-32 px-6 relative">
      <div className="max-w-5xl mx-auto" ref={ref}>
        <div 
          className="text-center mb-16 transition-all duration-1000 ease-out"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)' }}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Up and running in 2 minutes
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No complicated setup. No learning curve. Just a better inbox.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div 
              key={i}
              className="transition-all duration-700 ease-out"
              style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)', transitionDelay: `${200 + i * 150}ms` }}
            >
              <div className="relative p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] h-full" data-testid={`step-card-${i}`}>
                <div className="text-6xl font-black text-white/[0.04] absolute top-4 right-6 select-none">{step.step}</div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 text-primary">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  const [activeDemo, setActiveDemo] = useState<'reply' | 'summary' | 'organize'>('reply');
  const [isPaused, setIsPaused] = useState(false);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.15 });

  useEffect(() => {
    if (!isVisible || isPaused) return;
    const demos: Array<'reply' | 'summary' | 'organize'> = ['reply', 'summary', 'organize'];
    const interval = setInterval(() => {
      setActiveDemo(current => {
        const currentIndex = demos.indexOf(current);
        return demos[(currentIndex + 1) % demos.length];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isVisible, isPaused]);

  return (
    <section className="py-24 sm:py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />
      
      <div className="max-w-5xl mx-auto w-full" ref={ref}>
        <div 
          className="text-center mb-14 transition-all duration-1000 ease-out"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)' }}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">See it in action</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Your inbox, supercharged
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            AI that actually helps you get through email faster.
          </p>
        </div>

        <div 
          className="flex flex-col items-center transition-all duration-1000 ease-out delay-200"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)' }}
        >
          <div 
            className="flex flex-col items-center gap-4 mb-8"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="flex items-center justify-center gap-1.5 p-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <DemoTab active={activeDemo === 'reply'} onClick={() => { setActiveDemo('reply'); setIsPaused(true); }} label="AI Reply" icon={Sparkles} testId="demo-toggle-reply" />
              <DemoTab active={activeDemo === 'summary'} onClick={() => { setActiveDemo('summary'); setIsPaused(true); }} label="Summaries" icon={Brain} testId="demo-toggle-summary" />
              <DemoTab active={activeDemo === 'organize'} onClick={() => { setActiveDemo('organize'); setIsPaused(true); }} label="Smart Folders" icon={FolderOpen} testId="demo-toggle-organize" />
            </div>
            <div className="flex items-center gap-2">
              {['reply', 'summary', 'organize'].map((demo) => (
                <div key={demo} className={`h-1 rounded-full transition-all duration-500 ${activeDemo === demo ? 'w-8 bg-primary' : 'w-2 bg-white/20'}`} />
              ))}
            </div>
          </div>

          <div 
            className="w-full max-w-4xl mx-auto"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-sm overflow-hidden shadow-xl shadow-black/20">
              <div className="transition-opacity duration-500" key={activeDemo}>
                {activeDemo === 'reply' && <DemoReply />}
                {activeDemo === 'summary' && <DemoSummary />}
                {activeDemo === 'organize' && <DemoOrganize />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoTab({ active, onClick, label, icon: Icon, testId }: {
  active: boolean; onClick: () => void; label: string; icon: React.ComponentType<{ className?: string }>; testId: string;
}) {
  return (
    <Button
      onClick={onClick}
      data-testid={testId}
      variant={active ? "default" : "ghost"}
      size="sm"
      className={`rounded-full gap-2 ${active ? '' : 'text-muted-foreground'}`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

function DemoReply() {
  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">L</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Lisa Martinez</p>
          <p className="text-xs text-muted-foreground">Re: Meeting reschedule</p>
        </div>
        <span className="text-xs text-muted-foreground/50 flex-shrink-0">2:14 PM</span>
      </div>
      
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-5">
        <p className="text-sm text-foreground/80 leading-relaxed">
          Hi, can we move our Wednesday meeting to Thursday? I have a client call that just came up. 
          Same time works for me, or we could do 30 minutes earlier if that's better for your schedule.
        </p>
      </div>

      <div className="p-5 rounded-xl bg-primary/8 border border-primary/25">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI Draft</span>
          <span className="text-[10px] text-muted-foreground/50 ml-auto">Generated in 1.2s</span>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed mb-4">
          Hi Lisa, Thursday works perfectly! Let's keep it at the same time. 
          I'll update the calendar invite. Good luck with the client call!
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5 text-xs" data-testid="demo-send">
            <Send className="w-3 h-3" /> Send reply
          </Button>
          <Button variant="outline" size="sm" className="text-xs border-white/10" data-testid="demo-edit">
            Edit draft
          </Button>
          <Button variant="outline" size="sm" className="text-xs border-white/10" data-testid="demo-regenerate">
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}

function DemoSummary() {
  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-medium">Q4 Marketing Campaign</p>
          <p className="text-xs text-muted-foreground">18 messages, 6 participants</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary">AI Summary</span>
        </div>
      </div>
      
      <div className="p-5 rounded-xl bg-primary/8 border border-primary/25 mb-5">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">Key takeaways</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/85">Budget of $45K approved for Q4 campaign</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/85">Launch date confirmed: November 15th</p>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/85">Waiting on vendor pricing by this Friday</p>
          </div>
          <div className="flex items-start gap-3">
            <Timer className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/85">Your action: Review creative brief and respond</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider mb-2">Latest messages</p>
        {[
          { name: "Mike R.", msg: "Sounds good, let's finalize the creative direction...", color: "from-blue-500 to-blue-600" },
          { name: "Anna K.", msg: "I'll send the updated docs by end of day today", color: "from-emerald-500 to-emerald-600" },
          { name: "James W.", msg: "Vendor confirmed the timeline works for them", color: "from-purple-500 to-purple-600" },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0`}>{m.name[0]}</div>
            <p className="text-xs text-muted-foreground truncate"><span className="text-foreground/70 font-medium">{m.name}</span> {m.msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoOrganize() {
  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-medium">Smart Folders</p>
          <p className="text-xs text-muted-foreground">AI sorts your emails automatically</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary">Auto-sorted</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        {[
          { name: "Clients", count: 8, icon: Users, color: "text-blue-400" },
          { name: "Receipts", count: 12, icon: Mail, color: "text-emerald-400" },
          { name: "Travel", count: 3, icon: Globe, color: "text-amber-400" },
          { name: "Newsletters", count: 24, icon: Filter, color: "text-purple-400" },
        ].map((folder, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className={`w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center ${folder.color}`}>
              <folder.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{folder.name}</p>
              <p className="text-xs text-muted-foreground">{folder.count} emails</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-primary/8 border border-primary/25">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">AI just sorted 5 new emails</span>
        </div>
        <p className="text-xs text-muted-foreground">
          2 moved to Clients, 1 to Receipts, 2 to Newsletters. You can create custom folders and AI will learn your sorting preferences.
        </p>
      </div>
    </div>
  );
}

function BenefitsSection() {
  const benefits = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "AI replies in your voice",
      description: "MyDraft learns your writing style. Replies sound like you, not a robot. Review, tweak if needed, and send."
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Works in 50+ languages",
      description: "Write in English, reply in Japanese with proper keigo. Cultural tone and formality are handled automatically."
    },
    {
      icon: <Brain className="w-5 h-5" />,
      title: "Thread summaries",
      description: "Long email chains? Get the key points, decisions, and action items in seconds instead of scrolling through dozens of messages."
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Instant performance",
      description: "No loading spinners. No waiting. Your inbox loads instantly with cached data while fresh emails sync in the background."
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "Bank-level security",
      description: "AES-256 encryption, OAuth-only access, CASA Tier 2 compliant. We never see your password and your data stays encrypted."
    },
    {
      icon: <FolderOpen className="w-5 h-5" />,
      title: "AI-powered folders",
      description: "Create folders and let AI automatically sort incoming emails. Receipts, clients, newsletters - all organized without lifting a finger."
    },
  ];

  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section className="py-24 sm:py-32 px-6 relative">
      <div className="max-w-5xl mx-auto" ref={ref}>
        <div 
          className="text-center mb-16 transition-all duration-1000 ease-out"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)' }}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Why MyDraft</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Everything your inbox should do
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Not a plugin. Not a wrapper. A complete email experience rebuilt from scratch.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((benefit, i) => (
            <div 
              key={i}
              className="transition-all duration-700 ease-out"
              style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(30px)', transitionDelay: `${150 + i * 80}ms` }}
            >
              <Card className="bg-white/[0.02] border-white/[0.06] h-full hover-elevate" data-testid={`benefit-card-${i}`}>
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    {benefit.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const rows = [
    { feature: "AI-drafted replies", them: false, us: true, detail: "One-click reply to any email" },
    { feature: "Thread summaries", them: false, us: true, detail: "Key points from long chains" },
    { feature: "Smart folders with AI sorting", them: false, us: true, detail: "Auto-organized inbox" },
    { feature: "50+ language translations", them: false, us: true, detail: "Culturally-aware tone" },
    { feature: "Voice-to-email", them: false, us: true, detail: "Dictate, AI drafts" },
    { feature: "Encrypted email storage", them: false, us: true, detail: "AES-256-GCM at rest" },
    { feature: "Works with Gmail & Outlook", them: true, us: true, detail: "" },
    { feature: "Calendar integration", them: true, us: false, detail: "Coming soon" },
  ];

  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section className="py-24 sm:py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />
      
      <div className="max-w-4xl mx-auto" ref={ref}>
        <div 
          className="text-center mb-14 transition-all duration-1000 ease-out"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)' }}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">The difference</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            MyDraft vs. traditional email
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Gmail and Outlook are built to receive email. MyDraft is built to get through it.
          </p>
        </div>
        
        <div 
          className="transition-all duration-1000 ease-out delay-200"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(30px)' }}
        >
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_120px_120px] bg-white/[0.02] border-b border-white/[0.06]">
              <div className="p-4 text-sm font-semibold text-muted-foreground">Feature</div>
              <div className="p-4 text-sm font-semibold text-muted-foreground text-center">Others</div>
              <div className="p-4 text-sm font-semibold text-primary text-center">MyDraft</div>
            </div>
            {rows.map((row, i) => (
              <div key={i} className={`grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_120px_120px] ${i < rows.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                <div className="p-4 flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{row.feature}</span>
                  {row.detail && <span className="text-xs text-muted-foreground/60">{row.detail}</span>}
                </div>
                <div className="p-4 flex items-center justify-center">
                  {row.them ? (
                    <Check className="w-4 h-4 text-muted-foreground/40" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted-foreground/20" />
                  )}
                </div>
                <div className="p-4 flex items-center justify-center">
                  {row.us ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <span className="text-xs text-muted-foreground/50">Soon</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingPreviewSection({ getStartedHref }: { getStartedHref: string }) {
  const [annual, setAnnual] = useState(true);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "",
      description: "For trying it out",
      features: ["5 AI replies per day", "Basic inbox", "1 email account", "Standard support"],
      cta: "Start free",
      popular: false,
    },
    {
      name: "Pro",
      price: annual ? "$8" : "$10",
      period: "/mo",
      description: "For professionals",
      features: ["Unlimited AI replies", "Thread summaries", "Smart folders", "50+ language translations", "Voice-to-email", "Priority support"],
      cta: "Try free for 14 days",
      popular: true,
      savings: annual ? "Save $24/year" : null,
    },
    {
      name: "Business",
      price: annual ? "$24" : "$29",
      period: "/mo",
      description: "For power users & teams",
      features: ["Everything in Pro", "Style learning", "Bulk email responses", "Custom AI instructions", "Campaign tools", "Dedicated support"],
      cta: "Try free for 14 days",
      popular: false,
      savings: annual ? "Save $60/year" : null,
    },
  ];

  return (
    <section className="py-24 sm:py-32 px-6 relative">
      <div className="max-w-5xl mx-auto" ref={ref}>
        <div 
          className="text-center mb-12 transition-all duration-1000 ease-out"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)' }}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Simple pricing</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Start free, upgrade when ready
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            All paid plans include a 14-day free trial. No credit card required.
          </p>
          
          <div className="inline-flex items-center gap-3 p-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <button 
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              data-testid="pricing-monthly"
            >
              Monthly
            </button>
            <button 
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${annual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              data-testid="pricing-annual"
            >
              Annual
            </button>
          </div>
        </div>

        <div 
          className="grid md:grid-cols-3 gap-5 transition-all duration-1000 ease-out delay-200"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(30px)' }}
        >
          {plans.map((plan, i) => (
            <Card key={i} className={`relative bg-white/[0.02] h-full ${plan.popular ? 'border-primary/40 ring-1 ring-primary/20' : 'border-white/[0.06]'}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold" data-testid="badge-most-popular">
                    Most popular
                  </span>
                </div>
              )}
              <CardContent className="p-6 sm:p-8 flex flex-col h-full">
                <div className="mb-6">
                  <p className="text-sm font-semibold text-muted-foreground mb-2" data-testid={`plan-name-${plan.name.toLowerCase()}`}>{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold" data-testid={`plan-price-${plan.name.toLowerCase()}`}>{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  {plan.savings && <p className="text-xs font-medium text-green-400 mt-1">{plan.savings}</p>}
                </div>
                
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href={plan.name === "Free" ? getStartedHref : "/pricing"}>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    data-testid={`pricing-cta-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

interface Testimonial {
  id: number;
  userName: string;
  content: string;
  rating: number;
}

function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });
  
  const { data: testimonialsSetting } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/site-settings/show_testimonials"],
  });

  const { data: apiTestimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
    enabled: testimonialsSetting?.enabled === true,
  });

  const testimonials = apiTestimonials || [];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  if (!testimonialsSetting?.enabled || testimonials.length === 0) {
    return null;
  }

  return (
    <section className="py-24 sm:py-32 px-6 relative overflow-hidden">
      <div className="max-w-4xl mx-auto w-full" ref={ref}>
        <div 
          className="text-center mb-14 transition-all duration-1000 ease-out"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)' }}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            People who made the switch
          </h2>
        </div>
        
        <div 
          className="relative transition-all duration-1000 ease-out delay-200"
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((t, i) => (
                <div key={t.id || i} className="w-full flex-shrink-0 px-4">
                  <Card className="bg-white/[0.02] border-white/[0.06] max-w-2xl mx-auto">
                    <CardContent className="p-8 sm:p-10 text-center">
                      <div className="flex justify-center gap-1 mb-6">
                        {[...Array(t.rating)].map((_, j) => (
                          <Star key={j} className="w-5 h-5 fill-primary text-primary" />
                        ))}
                      </div>
                      <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-6">"{t.content}"</p>
                      <p className="font-semibold">{t.userName}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          
          {testimonials.length > 1 && (
            <div className="flex justify-center items-center gap-6 mt-8">
              <Button onClick={prevSlide} variant="outline" size="icon" className="border-white/[0.1]" data-testid="testimonial-prev">
                <ChevronDown className="w-5 h-5 rotate-90" />
              </Button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <Button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    variant="ghost"
                    size="sm"
                    className={`rounded-full min-h-0 min-w-0 p-1 ${i === currentIndex ? 'bg-primary' : 'bg-white/20'}`}
                    data-testid={`testimonial-dot-${i}`}
                  >
                    <span className="sr-only">Go to slide {i + 1}</span>
                  </Button>
                ))}
              </div>
              <Button onClick={nextSlide} variant="outline" size="icon" className="border-white/[0.1]" data-testid="testimonial-next">
                <ChevronDown className="w-5 h-5 -rotate-90" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "Does MyDraft replace Gmail or Outlook?",
      a: "Yes. You connect your existing Gmail or Outlook account, and MyDraft becomes your primary inbox. Your email address stays the same. Your contacts stay the same. Nothing to migrate."
    },
    {
      q: "How does the AI know what to write?",
      a: "MyDraft reads the email you received and drafts a contextual reply. Over time, it learns your writing style, preferred phrases, and tone. You always review and approve before anything gets sent."
    },
    {
      q: "Is my email data safe?",
      a: "Absolutely. We use OAuth so we never see your password. All stored email content is encrypted with AES-256-GCM. We're CASA Tier 2 compliant, which is the same security standard required for apps that handle sensitive business data."
    },
    {
      q: "What's included in the free plan?",
      a: "You get full inbox access with up to 5 AI-drafted replies per day. Enough to try it and see the difference. Upgrade to Pro for unlimited AI replies, thread summaries, smart folders, and 50+ language support."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No contracts, no cancellation fees. You can downgrade to the free plan or cancel entirely with one click in Settings."
    },
    {
      q: "Do paid plans have a free trial?",
      a: "Yes. Both Pro and Business plans include a 14-day free trial with full access. No credit card required to start. You'll only be charged if you decide to continue after the trial."
    },
    {
      q: "How does multilingual translation work?",
      a: "MyDraft uses AI that understands cultural context, not just words. It adapts tone, formality, and etiquette based on the sender's region. A Japanese business email gets properly formal treatment, while an Australian reply stays appropriately casual."
    },
    {
      q: "What if I don't like the AI draft?",
      a: "You can edit it, regenerate a new version, or write your own reply. The AI draft is a starting point - you're always in control. Many users find they send drafts as-is about 70% of the time."
    }
  ];

  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section className="py-24 sm:py-32 px-6 relative">
      <div className="max-w-3xl mx-auto" ref={ref}>
        <div 
          className="text-center mb-14 transition-all duration-1000 ease-out"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)' }}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Common questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <div 
              key={i}
              className="transition-all duration-700 ease-out"
              style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(20px)', transitionDelay: `${150 + i * 60}ms` }}
            >
              <AccordionItem value={`faq-${i}`} className="border border-white/[0.06] rounded-xl overflow-hidden px-5" data-testid={`faq-toggle-${i}`}>
                <AccordionTrigger className="text-base font-medium hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            </div>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTASection({ getStartedHref }: { getStartedHref: string }) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.3 });
  const parallaxOffset = useParallax(0.1);

  return (
    <section className="py-24 sm:py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.08] via-primary/[0.03] to-transparent pointer-events-none" />
      <div 
        className="absolute bottom-0 left-1/2 w-[1000px] h-[500px] bg-primary/[0.1] rounded-full blur-[150px] pointer-events-none"
        style={{ transform: `translate(-50%, ${parallaxOffset * 0.5}px)` }}
      />
      
      <div className="max-w-3xl mx-auto text-center relative" ref={ref}>
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 transition-all duration-1000 ease-out"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)' }}
        >
          Your inbox is waiting
        </h2>
        <p 
          className="text-lg sm:text-xl text-muted-foreground mb-4 transition-all duration-1000 ease-out delay-150"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(30px)' }}
        >
          Same email address. Same contacts. AI that handles the rest.
        </p>
        <p 
          className="text-sm text-muted-foreground/60 mb-10 transition-all duration-1000 ease-out delay-200"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(30px)' }}
        >
          Join professionals who save 5+ hours every week with MyDraft.
        </p>
        <div 
          className="flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 ease-out delay-300"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(30px)' }}
        >
          <Link href={getStartedHref}>
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/25 w-full sm:w-auto" data-testid="cta-getstarted">
              Try free for 14 days
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="border-white/10 w-full sm:w-auto" data-testid="cta-pricing">
              Compare plans
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-14 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-pricing">Pricing</Link></li>
              <li><Link href="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-security">Security</Link></li>
              <li><Link href="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-help">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms of Service</Link></li>
              <li><Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-cookies">Cookie Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Policies</h4>
            <ul className="space-y-2.5">
              <li><Link href="/acceptable-use" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-aup">Acceptable Use</Link></li>
              <li><Link href="/dpa" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-dpa">DPA</Link></li>
              <li><Link href="/ai-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-ai">AI Use Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Billing</h4>
            <ul className="space-y-2.5">
              <li><Link href="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-refund">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground/50">&copy; 2026 MyDraft. All rights reserved.</p>
          <a href="mailto:support@mydraft.io" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
        </div>
      </div>
    </footer>
  );
}
