import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { 
  ArrowRight,
  Mail,
  Star,
  ChevronDown,
  Inbox,
  Send,
  Archive,
  Sparkles,
  Globe,
  Zap,
  Languages,
  Shield,
  Undo2,
  FolderKanban,
  Clock,
  Check,
  RotateCcw,
  Plus,
  FolderPlus,
  FileText,
  X,
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
      <FeatureShowcase />
      <ComparisonSection getStartedHref={getStartedHref()} />
      <HowItWorksSection getStartedHref={getStartedHref()} />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTASection getStartedHref={getStartedHref()} />
      <Footer />
    </div>
  );
}

function HeroSection({ getStartedHref }: { getStartedHref: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="min-h-screen flex items-center pt-20 pb-16 px-5 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <div className="text-center lg:text-left">
            <div 
              className="transition-all duration-1000 ease-out"
              style={{ 
                opacity: mounted ? 1 : 0, 
                transform: mounted ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] text-muted-foreground text-sm mb-8">
                <Globe className="w-3.5 h-3.5" />
                Works with Gmail & Outlook
              </div>
            </div>
            
            <h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] mb-6 transition-all duration-1000 ease-out"
              style={{ 
                opacity: mounted ? 1 : 0, 
                transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                transitionDelay: '150ms'
              }}
            >
              The inbox
              <br />
              that works
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">for you.</span>
            </h1>
            
            <p 
              className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-md mx-auto lg:mx-0 transition-all duration-1000 ease-out"
              style={{ 
                opacity: mounted ? 1 : 0, 
                transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                transitionDelay: '300ms'
              }}
            >
              AI drafts your replies, summarizes threads, and translates across 50+ languages.
            </p>
            
            <div 
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start transition-all duration-1000 ease-out"
              style={{ 
                opacity: mounted ? 1 : 0, 
                transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                transitionDelay: '450ms'
              }}
            >
              <Link href={getStartedHref}>
                <Button size="lg" className="gap-2 w-full sm:w-auto rounded-md" data-testid="hero-getstarted">
                  Try it free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-md border-black/[0.12] dark:border-white/[0.12]" data-testid="hero-signin">
                  Sign in
                </Button>
              </Link>
            </div>
            
            <p 
              className="text-sm text-muted-foreground/50 mt-6 transition-all duration-1000 ease-out"
              style={{ 
                opacity: mounted ? 1 : 0,
                transitionDelay: '600ms'
              }}
            >
              No credit card needed. Connect in under 2 minutes.
            </p>
          </div>
          
          <div 
            className="relative hidden lg:block transition-all duration-1000 ease-out"
            style={{ 
              opacity: mounted ? 1 : 0, 
              transform: mounted ? 'translateX(0)' : 'translateX(40px)',
              transitionDelay: '400ms'
            }}
          >
            <div className="relative rounded-lg border border-black/[0.10] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden shadow-xl">
              <div className="px-4 py-2.5 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-black/[0.08] dark:bg-white/[0.08]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-black/[0.08] dark:bg-white/[0.08]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-black/[0.08] dark:bg-white/[0.08]" />
                </div>
                <span className="text-[11px] text-muted-foreground/40 font-medium tracking-wide uppercase">MyDraft</span>
                <div className="w-14" />
              </div>
              
              <div className="flex">
                <div className="w-12 border-r border-black/[0.06] dark:border-white/[0.06] py-4 flex flex-col items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center">
                    <Inbox className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/30">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/30">
                    <Archive className="w-3.5 h-3.5" />
                  </div>
                </div>
                
                <div className="flex-1 p-4 space-y-0.5">
                  <HeroEmailItem 
                    from="David Park" 
                    subject="Quick question about the proposal"
                    time="8m"
                    unread
                  />
                  <HeroEmailItem 
                    from="Sarah Chen" 
                    subject="Re: Q4 budget discussion"
                    time="23m"
                    unread
                    selected
                  />
                  <HeroEmailItem 
                    from="James Wilson" 
                    subject="Meeting notes from today"
                    time="1h"
                  />
                  <HeroEmailItem 
                    from="Lisa Martinez" 
                    subject="Can you review this?"
                    time="3h"
                  />
                  
                  <div className="mt-3 ml-10 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
                      <Sparkles className="w-3 h-3 text-blue-400/70" />
                      <span>Suggested: "Thanks Sarah, morning works."</span>
                      <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-medium ml-1">Use</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-5 h-5 text-muted-foreground/30" />
      </div>
    </section>
  );
}

function HeroEmailItem({ from, subject, time, unread = false, selected = false }: { 
  from: string; 
  subject: string; 
  time: string;
  unread?: boolean;
  selected?: boolean;
}) {
  return (
    <div className={`px-3 py-2.5 rounded-md transition-colors ${selected ? 'bg-primary/[0.08] border border-primary/20' : 'border border-transparent'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold ${selected ? 'bg-primary/20 text-primary' : 'bg-black/[0.05] dark:bg-white/[0.05] text-muted-foreground/60'}`}>
          {from.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${unread ? 'font-semibold' : 'text-muted-foreground/70'}`}>{from}</span>
            {unread && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </div>
          <p className={`text-[13px] truncate ${unread ? 'text-foreground/60' : 'text-muted-foreground/40'}`}>{subject}</p>
        </div>
        <span className="text-[11px] text-muted-foreground/30">{time}</span>
      </div>
    </div>
  );
}

function FeatureShowcase() {
  return (
    <div>
      <FeatureSection
        badge="AI Replies"
        title="Your reply, already written."
        description="Open any email and a draft is waiting. Written in your voice, matching your tone and style. Review it, tweak a word, and hit send. What used to take 5 minutes now takes 5 seconds."
        mockup={<MockupAIReply />}
        direction="left"
        accentColor="blue"
        data-testid="feature-section-ai-replies"
      />
      <FeatureSection
        badge="Thread Summary"
        title="Catch up in seconds, not minutes."
        description="Long email threads with 20+ messages? AI reads them all and gives you the key decisions, action items, and what's still pending. Never scroll through an entire chain again."
        mockup={<MockupThreadSummary />}
        direction="right"
        accentColor="purple"
        data-testid="feature-section-summaries"
      />
      <FeatureSection
        badge="50+ Languages"
        title="Email anyone, anywhere."
        description="Receive an email in Japanese and reply in perfect keigo. Get a message in Portuguese and respond with the right formality. AI adapts tone, culture, and etiquette automatically."
        mockup={<MockupTranslation />}
        direction="left"
        accentColor="emerald"
        data-testid="feature-section-multilingual"
      />
      <FeatureSection
        badge="Undo Send"
        title="Send with confidence."
        description="Every email has an undo window. Catch a typo, forgot an attachment, wrong recipient? Pull it back before it's delivered. Schedule emails for later with one click."
        mockup={<MockupUndoSend />}
        direction="right"
        accentColor="amber"
        data-testid="feature-section-undo-send"
      />
      <FeatureSection
        badge="Smart Folders"
        title="Your inbox, organized by AI."
        description="AI automatically sorts incoming emails into folders that make sense. Important messages rise to the top. Newsletters, updates, and noise get tucked away. Zero manual rules needed."
        mockup={<MockupSmartFolders />}
        direction="left"
        accentColor="rose"
        data-testid="feature-section-smart-folders"
      />
    </div>
  );
}

const ACCENT_GRADIENTS: Record<string, string> = {
  blue: 'from-blue-400 to-cyan-400',
  purple: 'from-purple-400 to-fuchsia-400',
  emerald: 'from-emerald-400 to-teal-400',
  amber: 'from-amber-400 to-orange-400',
  rose: 'from-rose-400 to-pink-400',
};

function FeatureSection({ badge, title, description, mockup, direction, accentColor = 'blue' }: {
  badge: string;
  title: string;
  description: string;
  mockup: React.ReactNode;
  direction: 'left' | 'right';
  accentColor?: string;
  'data-testid'?: string;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.15 });
  const gradient = ACCENT_GRADIENTS[accentColor] || ACCENT_GRADIENTS.blue;

  return (
    <section className="py-20 sm:py-28 lg:py-36 px-5 sm:px-6 relative" ref={ref}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className={`flex flex-col ${direction === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
          <div 
            className="flex-1 text-center lg:text-left max-w-xl"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
              transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span className={`text-xs font-semibold tracking-widest uppercase mb-4 block bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              {badge}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.1] mb-5">
              {title}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground/70 leading-relaxed">
              {description}
            </p>
          </div>

          <div 
            className="flex-1 w-full max-w-lg lg:max-w-none"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible 
                ? 'translateY(0)' 
                : 'translateY(30px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
            }}
          >
            {mockup}
          </div>
        </div>
      </div>
    </section>
  );
}

function MockupAIReply() {
  const [showDraft, setShowDraft] = useState(false);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.3 });

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowDraft(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <div ref={ref} className="rounded-lg border border-black/[0.10] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden shadow-lg">
      <div className="px-5 py-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-black/[0.06] dark:bg-white/[0.06] flex items-center justify-center text-[11px] font-semibold text-foreground/70">LM</div>
          <div>
            <p className="text-sm font-medium">Lisa Martinez</p>
            <p className="text-[11px] text-muted-foreground/50">Re: Meeting reschedule</p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground/30">2 min ago</span>
      </div>
      <div className="p-5">
        <div className="p-4 rounded-md bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] mb-5">
          <p className="text-sm text-foreground/60 leading-relaxed">
            Hi, can we reschedule our meeting to Thursday? I have a conflict on Wednesday afternoon. Same time works for me if that's okay with you.
          </p>
        </div>

        <div 
          className="transition-all duration-700 ease-out overflow-hidden"
          style={{ 
            opacity: showDraft ? 1 : 0, 
            maxHeight: showDraft ? '300px' : '0px',
            transform: showDraft ? 'translateY(0)' : 'translateY(16px)',
          }}
        >
          <div className="relative rounded-md p-[1px] bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-purple-500/30">
            <div className="rounded-[5px] bg-blue-500/[0.05] p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-semibold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">AI Draft</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                Hi Lisa, Thursday works perfectly for me. Same time is great. See you then!
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" className="rounded-md text-xs gap-1.5" data-testid="mockup-send">
                  <Send className="w-3 h-3" />
                  Send
                </Button>
                <Button size="sm" variant="ghost" className="rounded-md text-xs" data-testid="mockup-edit">
                  Edit
                </Button>
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground/30">
                  <RotateCcw className="w-3 h-3" />
                  Regenerate
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupThreadSummary() {
  const [phase, setPhase] = useState(0);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.3 });

  const summaryText = "The team agreed on the Q4 marketing budget of $45K. Launch date is set for November 15. Vendor pricing is still pending and needs follow-up by Friday.";
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setPhase(0);
      setTypedChars(0);
      return;
    }
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 2400);
    const t4 = setTimeout(() => setPhase(4), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [isVisible]);

  useEffect(() => {
    if (phase < 2) { setTypedChars(0); return; }
    if (typedChars >= summaryText.length) return;
    const speed = 8;
    const timer = setTimeout(() => setTypedChars(prev => Math.min(prev + 1, summaryText.length)), speed);
    return () => clearTimeout(timer);
  }, [phase, typedChars]);

  const keyPoints = [
    "Budget approved at $45K for Q4 campaign",
    "Launch date confirmed: November 15",
    "Creative assets due by October 28",
  ];
  const actionItems = [
    "Follow up on vendor pricing by Friday",
    "Sarah to send revised timeline Monday",
  ];

  return (
    <div ref={ref} className="rounded-2xl border border-black/[0.10] dark:border-white/[0.10] bg-gradient-to-br from-background/90 via-background/70 to-muted/50 overflow-hidden shadow-xl shadow-black/10 backdrop-blur-md">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-foreground/10 to-foreground/5 border border-foreground/10 flex items-center justify-center shadow-inner">
            <FileText className="w-3.5 h-3.5 text-foreground/60" />
          </div>
          <span className="text-sm font-medium text-foreground/90">Summary</span>
          {phase >= 1 && phase < 3 && (
            <span className="flex items-center gap-1 ml-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </span>
          )}
        </div>
        <div className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-foreground/10 cursor-pointer transition-colors">
          <X className="w-3.5 h-3.5 text-foreground/40" />
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="space-y-3">
          <p className="text-sm text-foreground/85 leading-relaxed" style={{ minHeight: '3.2em' }}>
            {phase >= 2 ? summaryText.slice(0, typedChars) : ''}
            {phase >= 2 && typedChars < summaryText.length && (
              <span className="inline-block w-0.5 h-4 bg-foreground/50 ml-0.5 animate-pulse align-text-bottom" />
            )}
          </p>

          {phase >= 3 && (
            <div className="pt-2">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Key Points</p>
              <ul className="space-y-1.5">
                {keyPoints.map((point, i) => (
                  <li 
                    key={i} 
                    className="text-sm text-foreground/75 flex items-start gap-2 transition-all duration-300 ease-out"
                    style={{ 
                      opacity: phase >= 3 ? 1 : 0,
                      transform: phase >= 3 ? 'translateX(0)' : 'translateX(-8px)',
                      transitionDelay: `${i * 80}ms`,
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 mt-2 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phase >= 4 && (
            <div className="pt-2">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Action Items</p>
              <ul className="space-y-1.5">
                {actionItems.map((item, i) => (
                  <li 
                    key={i} 
                    className="text-sm text-foreground/75 flex items-start gap-2 transition-all duration-300 ease-out"
                    style={{
                      opacity: phase >= 4 ? 1 : 0,
                      transform: phase >= 4 ? 'translateX(0)' : 'translateX(-8px)',
                      transitionDelay: `${i * 80}ms`,
                    }}
                  >
                    <ArrowRight className="w-3 h-3 text-foreground/40 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MockupTranslation() {
  const [showTranslation, setShowTranslation] = useState(false);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.3 });

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowTranslation(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <div ref={ref} className="rounded-lg border border-black/[0.10] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden shadow-lg">
      <div className="px-5 py-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-black/[0.06] dark:bg-white/[0.06] flex items-center justify-center">
            <Languages className="w-3.5 h-3.5 text-foreground/60" />
          </div>
          <div>
            <p className="text-sm font-medium">Instant Translation</p>
            <p className="text-[11px] text-muted-foreground/50">Japanese &rarr; English</p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground/30">Auto-detected</span>
      </div>
      <div className="p-5 space-y-3">
        <div className="p-4 rounded-md bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
          <span className="text-[10px] text-muted-foreground/40 mb-2 block uppercase tracking-wider">Original</span>
          <p className="text-sm text-foreground/50 leading-relaxed" style={{ fontFamily: 'sans-serif' }}>
            山田様、お忙しいところ恐れ入りますが、来週の会議の件についてご確認いただけますでしょうか。何卒よろしくお願いいたします。
          </p>
        </div>

        <div 
          className="transition-all duration-700 ease-out"
          style={{ 
            opacity: showTranslation ? 1 : 0,
            transform: showTranslation ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          <div className="relative rounded-md p-[1px] bg-gradient-to-r from-emerald-500/25 via-transparent to-teal-500/25">
            <div className="rounded-[5px] bg-black/[0.03] dark:bg-white/[0.03] p-4">
              <span className="text-[10px] font-semibold mb-2 block uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Translated</span>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Mr. Yamada, I apologize for the intrusion on your busy schedule. Could you please confirm the details regarding next week's meeting? Thank you very much for your consideration.
              </p>
            </div>
          </div>
        </div>

        <div 
          className="transition-all duration-500 delay-300"
          style={{ 
            opacity: showTranslation ? 1 : 0,
            transform: showTranslation ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          <div className="relative rounded-md p-[1px] bg-gradient-to-r from-emerald-500/40 via-teal-500/30 to-cyan-500/40">
            <div className="rounded-[5px] bg-emerald-500/[0.06] backdrop-blur-sm px-3.5 py-3 flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-emerald-300/90 mb-0.5">Cultural context</p>
                <p className="text-[11px] text-foreground/60">Formal keigo style detected. Use respectful honorifics and humble language in your reply.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupUndoSend() {
  const [phase, setPhase] = useState<'sending' | 'countdown' | 'undone'>('sending');
  const [countdown, setCountdown] = useState(5);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.3 });

  useEffect(() => {
    if (!isVisible) return;
    
    const t1 = setTimeout(() => setPhase('countdown'), 500);
    const t2 = setTimeout(() => setCountdown(4), 1500);
    const t3 = setTimeout(() => setCountdown(3), 2500);
    const t4 = setTimeout(() => setCountdown(2), 3500);
    const t5 = setTimeout(() => setPhase('undone'), 4200);
    
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [isVisible]);

  return (
    <div ref={ref} className="rounded-lg border border-black/[0.10] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden shadow-lg">
      <div className="px-5 py-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-black/[0.06] dark:bg-white/[0.06] flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-foreground/60" />
          </div>
          <p className="text-sm font-medium">Undo Send</p>
        </div>
      </div>
      <div className="p-5">
        <div className="p-4 rounded-md bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground/50">To: david.park@company.com</span>
            <span className="text-[10px] text-muted-foreground/30">Just now</span>
          </div>
          <p className="text-sm font-medium mb-1">Re: Q4 Proposal</p>
          <p className="text-sm text-foreground/60">Looks great, let's move forward with Option B. I'll loop in the team tomorrow.</p>
        </div>

        {phase === 'countdown' && (
          <div className="p-4 rounded-md border border-black/[0.12] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.03] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9">
                  <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/[0.06]" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground/60" strokeDasharray="94.2" strokeDashoffset={94.2 - (94.2 * countdown / 5)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground/70">{countdown}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Sending...</p>
                  <p className="text-[11px] text-muted-foreground/50">You can undo this</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="rounded-md border-black/[0.15] dark:border-white/[0.15] gap-1.5" data-testid="mockup-undo">
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </Button>
            </div>
          </div>
        )}

        {phase === 'undone' && (
          <div className="relative rounded-md p-[1px] bg-gradient-to-r from-green-500/30 via-emerald-500/20 to-green-500/30 transition-all duration-500">
            <div className="rounded-[5px] bg-green-500/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-green-500/15 to-emerald-500/15 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-300/90">Message recalled</p>
                  <p className="text-[11px] text-muted-foreground/50">Moved back to drafts.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'sending' && (
          <div className="p-4 rounded-md bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-black/[0.10] dark:border-white/[0.10] border-t-foreground/50 rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground/50">Preparing to send...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MockupSmartFolders() {
  const [phase, setPhase] = useState<'idle' | 'dialog' | 'typing' | 'ai' | 'sorting' | 'done'>('idle');
  const [typedChars, setTypedChars] = useState(0);
  const [aiChars, setAiChars] = useState(0);
  const [sortedEmails, setSortedEmails] = useState(0);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.3 });

  const folderName = "Client Projects";
  const aiDescription = "Emails from clients about active projects, proposals, and deliverables";
  const matchedEmails = [
    { from: "S", name: "Sarah Chen", subject: "Updated proposal for Q4 campaign" },
    { from: "D", name: "David Park", subject: "Deliverables timeline review" },
    { from: "L", name: "Lisa Martinez", subject: "Project kickoff next Monday" },
    { from: "J", name: "James Wilson", subject: "Budget approval for Phase 2" },
  ];

  const existingFolders = [
    { name: 'Important', count: 3, icon: Star },
    { name: 'Updates', count: 8, icon: Mail },
    { name: 'Newsletters', count: 12, icon: Archive },
  ];

  useEffect(() => {
    if (!isVisible) {
      setPhase('idle');
      setTypedChars(0);
      setAiChars(0);
      setSortedEmails(0);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase('dialog'), 600));
    timers.push(setTimeout(() => setPhase('typing'), 1200));

    for (let i = 1; i <= folderName.length; i++) {
      timers.push(setTimeout(() => setTypedChars(i), 1200 + i * 70));
    }

    const afterTyping = 1200 + folderName.length * 70 + 400;
    timers.push(setTimeout(() => setPhase('ai'), afterTyping));

    for (let i = 1; i <= aiDescription.length; i++) {
      timers.push(setTimeout(() => setAiChars(i), afterTyping + 200 + i * 18));
    }

    const afterAi = afterTyping + 200 + aiDescription.length * 18 + 500;
    timers.push(setTimeout(() => setPhase('sorting'), afterAi));

    for (let i = 1; i <= matchedEmails.length; i++) {
      timers.push(setTimeout(() => setSortedEmails(i), afterAi + i * 400));
    }

    timers.push(setTimeout(() => setPhase('done'), afterAi + matchedEmails.length * 400 + 600));

    return () => timers.forEach(clearTimeout);
  }, [isVisible]);

  const showDialog = phase !== 'idle';
  const showNewFolder = phase === 'sorting' || phase === 'done';

  return (
    <div ref={ref} className="rounded-lg border border-black/[0.10] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden shadow-lg">
      <div className="px-5 py-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-black/[0.06] dark:bg-white/[0.06] flex items-center justify-center">
            <FolderKanban className="w-3.5 h-3.5 text-foreground/60" />
          </div>
          <div>
            <p className="text-sm font-medium">Smart Folders</p>
            <p className="text-[11px] text-muted-foreground/50">AI-sorted automatically</p>
          </div>
        </div>
        <div 
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 px-2 py-1 rounded-md border border-black/[0.08] dark:border-white/[0.08] transition-all duration-300"
          style={{ opacity: phase === 'idle' ? 1 : 0.3 }}
        >
          <Plus className="w-3 h-3" />
          New folder
        </div>
      </div>

      <div className="flex">
        <div className="w-40 border-r border-black/[0.06] dark:border-white/[0.06] p-2.5 space-y-0.5">
          {existingFolders.map((folder, i) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-transparent">
              <folder.icon className="w-3.5 h-3.5 text-muted-foreground/30" />
              <span className="text-xs text-muted-foreground/60 flex-1">{folder.name}</span>
              <span className="text-[10px] text-muted-foreground/25">{folder.count}</span>
            </div>
          ))}

          <div 
            className="transition-all duration-500 ease-out overflow-hidden"
            style={{ 
              maxHeight: showNewFolder ? '40px' : '0px',
              opacity: showNewFolder ? 1 : 0,
            }}
          >
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-rose-500/[0.08] border border-rose-500/20">
              <FolderPlus className="w-3.5 h-3.5 text-rose-400/70" />
              <span className="text-xs font-medium text-foreground flex-1 truncate">Client Projects</span>
              <span className="text-[10px] text-rose-400/70">{sortedEmails}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 min-h-[220px] relative">
          {!showDialog && (
            <div className="flex items-center justify-center h-full text-muted-foreground/20">
              <div className="text-center">
                <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Select a folder</p>
              </div>
            </div>
          )}

          {showDialog && !showNewFolder && (
            <div 
              className="transition-all duration-400 ease-out"
              style={{ 
                opacity: showDialog ? 1 : 0,
                transform: showDialog ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              <div className="relative rounded-md p-[1px] bg-gradient-to-r from-rose-500/30 via-pink-500/20 to-rose-500/30">
                <div className="rounded-[5px] bg-background p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FolderPlus className="w-4 h-4 text-rose-400" />
                    <span className="text-sm font-semibold bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">New Smart Folder</span>
                  </div>

                  <div className="mb-3">
                    <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider block mb-1.5">Folder name</span>
                    <div className="px-3 py-2 rounded-md border border-black/[0.10] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.02] min-h-[32px] flex items-center">
                      <span className="text-sm text-foreground/80">
                        {phase === 'dialog' ? '' : folderName.slice(0, typedChars)}
                      </span>
                      {(phase === 'typing' || phase === 'dialog') && (
                        <span className="w-[2px] h-4 bg-foreground/60 ml-[1px] animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div 
                    className="transition-all duration-500 ease-out overflow-hidden"
                    style={{ 
                      maxHeight: phase === 'ai' ? '100px' : '0px',
                      opacity: phase === 'ai' ? 1 : 0,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-3 h-3 text-rose-400/70" />
                      <span className="text-[10px] text-rose-400/70 font-medium">AI description</span>
                    </div>
                    <div className="px-3 py-2 rounded-md border border-rose-500/15 bg-rose-500/[0.03]">
                      <p className="text-xs text-foreground/60 leading-relaxed">
                        {aiDescription.slice(0, aiChars)}
                        {aiChars < aiDescription.length && (
                          <span className="w-[2px] h-3 bg-rose-400/60 ml-[1px] inline-block animate-pulse" />
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showNewFolder && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground/40">
                  {phase === 'done' ? `${matchedEmails.length} emails sorted` : 'Sorting emails...'}
                </span>
                {phase === 'sorting' && (
                  <div className="w-3 h-3 border-2 border-black/[0.10] dark:border-white/[0.10] border-t-rose-400/60 rounded-full animate-spin" />
                )}
                {phase === 'done' && (
                  <Check className="w-3 h-3 text-green-400" />
                )}
              </div>
              {matchedEmails.map((email, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] transition-all duration-400 ease-out"
                  style={{
                    opacity: sortedEmails > i ? 1 : 0,
                    transform: sortedEmails > i ? 'translateY(0)' : 'translateY(12px)',
                  }}
                >
                  <div className="w-6 h-6 rounded-md bg-black/[0.06] dark:bg-white/[0.06] flex items-center justify-center text-[10px] font-semibold text-foreground/50">
                    {email.from}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground/70">{email.name}</p>
                    <p className="text-[11px] text-muted-foreground/40 truncate">{email.subject}</p>
                  </div>
                  {sortedEmails > i && (
                    <div className="w-4 h-4 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-rose-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComparisonSection({ getStartedHref }: { getStartedHref: string }) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });

  const rows: { label: string; superhuman: boolean | string; hey: boolean | string; mydraft: boolean | string }[] = [
    { label: "Starting price", superhuman: "$30/mo", hey: "$99/yr", mydraft: "Free" },
    { label: "AI-powered replies", superhuman: true, hey: false, mydraft: true },
    { label: "50+ language support", superhuman: false, hey: false, mydraft: true },
    { label: "Works with Gmail + Outlook", superhuman: true, hey: false, mydraft: true },
    { label: "AI auto-sort folders", superhuman: true, hey: false, mydraft: true },
    { label: "Free plan available", superhuman: false, hey: false, mydraft: true },
  ];

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-6 relative" ref={ref}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-3xl mx-auto">
        <div
          className="text-center mb-14 transition-all duration-1000 ease-out"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
          }}
        >
          <span className="text-xs font-semibold tracking-widest uppercase mb-4 block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Compare
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            See how we stack up
          </h2>
        </div>

        <div
          className="rounded-2xl overflow-hidden transition-all duration-1000 ease-out delay-200"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            background: "rgba(var(--overlay-rgb), 0.02)",
            border: "1px solid rgba(var(--overlay-rgb), 0.08)",
          }}
          data-testid="comparison-table"
        >
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="px-5 py-4" />
            <div className="px-3 py-4 text-center">
              <p className="text-sm font-medium text-muted-foreground/60">Superhuman</p>
            </div>
            <div className="px-3 py-4 text-center">
              <p className="text-sm font-medium text-muted-foreground/60">Hey</p>
            </div>
            <div className="px-3 py-4 text-center relative">
              <div className="absolute inset-x-1 -top-0 bottom-0 rounded-t-2xl" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderBottom: "none" }} />
              <p className="relative text-sm font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">MyDraft</p>
            </div>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-[1.4fr_1fr_1fr_1fr] transition-all duration-500 ease-out"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                transitionDelay: `${350 + i * 60}ms`,
                borderTop: "1px solid rgba(var(--overlay-rgb), 0.05)",
              }}
            >
              <div className="px-5 py-3.5 flex items-center">
                <span className="text-sm text-foreground/60">{row.label}</span>
              </div>
              <div className="px-3 py-3.5 flex items-center justify-center">
                <ComparisonBubble value={row.superhuman} />
              </div>
              <div className="px-3 py-3.5 flex items-center justify-center">
                <ComparisonBubble value={row.hey} />
              </div>
              <div className="px-3 py-3.5 flex items-center justify-center relative">
                <div className="absolute inset-x-1 inset-y-0" style={{ background: "rgba(59,130,246,0.05)", borderLeft: "1px solid rgba(59,130,246,0.2)", borderRight: "1px solid rgba(59,130,246,0.2)" }} />
                <span className="relative"><ComparisonBubble value={row.mydraft} highlight /></span>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr]" style={{ borderTop: "1px solid rgba(var(--overlay-rgb), 0.05)" }}>
            <div className="px-5 py-4" />
            <div className="px-3 py-4" />
            <div className="px-3 py-4" />
            <div className="px-3 py-4 relative">
              <div className="absolute inset-x-1 inset-y-0 rounded-b-2xl" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderTop: "none" }} />
              <div className="relative flex justify-center">
                <Link href={getStartedHref}>
                  <Button size="sm" className="rounded-full text-xs gap-1.5 px-5" data-testid="comparison-cta">
                    Try free
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonBubble({ value, highlight = false }: { value: boolean | string; highlight?: boolean }) {
  if (typeof value === "string") {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${highlight ? 'text-blue-400' : 'text-foreground/60'}`}
        style={{
          background: highlight ? "rgba(59,130,246,0.12)" : "rgba(var(--overlay-rgb), 0.05)",
          border: highlight ? "1px solid rgba(59,130,246,0.2)" : "1px solid rgba(var(--overlay-rgb), 0.08)",
        }}
      >
        {value}
      </span>
    );
  }
  if (value) {
    return (
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-full"
        style={{
          background: highlight ? "rgba(59,130,246,0.12)" : "rgba(var(--overlay-rgb), 0.05)",
          border: highlight ? "1px solid rgba(59,130,246,0.2)" : "1px solid rgba(var(--overlay-rgb), 0.08)",
        }}
      >
        <Check className={`w-4 h-4 ${highlight ? 'text-blue-400' : 'text-foreground/40'}`} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full" style={{ background: "rgba(var(--overlay-rgb), 0.02)" }}>
      <X className="w-3.5 h-3.5 text-foreground/15" />
    </span>
  );
}

function HowItWorksSection({ getStartedHref }: { getStartedHref: string }) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });

  const steps = [
    { icon: Mail, number: "1", title: "Sign up free", description: "Create your account in seconds." },
    { icon: Globe, number: "2", title: "Connect your email", description: "Link Gmail or Outlook with one click." },
    { icon: Zap, number: "3", title: "Set your style", description: "Tell the AI how you write." },
    { icon: Shield, number: "4", title: "You're ready", description: "Your inbox, now smarter." },
  ];

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-6 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="max-w-4xl mx-auto w-full" ref={ref}>
        <div 
          className="text-center mb-16 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)'
          }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Get started in minutes
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div 
              key={i}
              className="text-center transition-all duration-700 ease-out"
              style={{ 
                opacity: isVisible ? 1 : 0, 
                transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                transitionDelay: `${300 + i * 150}ms`
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.10] dark:border-white/[0.10] flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-5 h-5 text-foreground/60" />
              </div>
              <div className="text-[11px] font-medium text-muted-foreground/40 uppercase tracking-widest mb-2">Step {step.number}</div>
              <h3 className="text-base font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground/60">{step.description}</p>
            </div>
          ))}
        </div>

        <div 
          className="text-center mt-14 transition-all duration-700 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '900ms'
          }}
        >
          <Link href={getStartedHref}>
            <Button size="lg" className="rounded-md px-8 gap-2" data-testid="button-simple-start-cta">
              Start free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
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
    <section className="py-24 sm:py-32 px-5 sm:px-6 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="max-w-4xl mx-auto w-full" ref={ref}>
        <div 
          className="text-center mb-16 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)'
          }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            What our users are saying
          </h2>
        </div>
        
        <div 
          className="relative transition-all duration-1000 ease-out delay-200"
          style={{ 
            opacity: isVisible ? 1 : 0
          }}
        >
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((t, i) => (
                <div key={t.id || i} className="w-full flex-shrink-0 px-4">
                  <Card className="bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.08] dark:border-white/[0.08] rounded-lg max-w-2xl mx-auto">
                    <CardContent className="p-10 text-center">
                      <div className="flex justify-center gap-1 mb-8">
                        {[...Array(t.rating)].map((_, j) => (
                          <Star key={j} className="w-5 h-5 fill-foreground/60 text-foreground/60" />
                        ))}
                      </div>
                      <p className="text-lg text-muted-foreground/80 leading-relaxed mb-8">"{t.content}"</p>
                      <div>
                        <p className="font-medium">{t.userName}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          
          {testimonials.length > 1 && (
            <div className="flex justify-center items-center gap-6 mt-10">
              <Button
                onClick={prevSlide}
                variant="outline"
                size="icon"
                className="border-black/[0.1] dark:border-white/[0.1]"
                data-testid="testimonial-prev"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </Button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <Button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    variant="ghost"
                    size="sm"
                    className={`rounded-full min-h-0 min-w-0 p-1 ${
                      i === currentIndex ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'
                    }`}
                    data-testid={`testimonial-dot-${i}`}
                  >
                    <span className="sr-only">Go to slide {i + 1}</span>
                  </Button>
                ))}
              </div>
              <Button
                onClick={nextSlide}
                variant="outline"
                size="icon"
                className="border-black/[0.1] dark:border-white/[0.1]"
                data-testid="testimonial-next"
              >
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
      q: "Will I need a new email address?",
      a: "No. MyDraft connects to your existing Gmail or Outlook account. Your email address, contacts, and history all stay exactly where they are."
    },
    {
      q: "How does AI know what I'd say?",
      a: "During setup, you tell the AI about your writing style, tone, and preferences. It learns how you communicate and drafts replies that sound like you, not a robot."
    },
    {
      q: "Is my email data safe?",
      a: "We use OAuth, so we never see your password. Your emails are encrypted in transit and at rest. We don't use your data to train AI models."
    },
    {
      q: "Can I try it before paying?",
      a: "Yes. The free plan gives you basic inbox access. Pro and Business plans include a 14-day trial with full access, no restrictions."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No contracts. No cancellation fees. You can downgrade or cancel whenever you want."
    },
    {
      q: "What about emails in other languages?",
      a: "MyDraft handles 50+ languages with cultural context. It adapts tone, formality, and etiquette based on the sender's region automatically."
    }
  ];

  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.15 });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-6 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="max-w-3xl mx-auto" ref={ref}>
        <div 
          className="text-center mb-16 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)'
          }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <div 
              key={i}
              className="duration-700 ease-out"
              style={{ 
                opacity: isVisible ? 1 : 0, 
                transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
                transitionProperty: 'opacity, transform',
                transitionDelay: `${200 + i * 80}ms`
              }}
            >
              <AccordionItem value={`faq-${i}`} className="border border-black/[0.08] dark:border-white/[0.08] rounded-lg overflow-hidden px-6" data-testid={`faq-toggle-${i}`}>
                <AccordionTrigger className="text-base font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground/60 leading-relaxed text-sm">
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

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-6 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      
      <div className="max-w-3xl mx-auto text-center w-full" ref={ref}>
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)'
          }}
        >
          Ready to upgrade
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">your inbox?</span>
        </h2>
        <p 
          className="text-lg text-muted-foreground/60 mb-10 transition-all duration-1000 ease-out delay-150"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)'
          }}
        >
          Same email address. Same contacts. Better everything else.
        </p>
        <div 
          className="flex flex-col sm:flex-row gap-3 justify-center transition-all duration-1000 ease-out delay-300"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)'
          }}
        >
          <Link href={getStartedHref}>
            <Button size="lg" className="gap-2 rounded-md" data-testid="cta-getstarted">
              Try it free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="rounded-md border-black/[0.12] dark:border-white/[0.12]" data-testid="cta-pricing">
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
    <footer className="py-16 px-5 sm:px-6 border-t border-black/[0.06] dark:border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/40 mb-5">Product</h4>
            <ul className="space-y-3">
              <li><Link href="/pricing" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors" data-testid="footer-link-pricing">Pricing</Link></li>
              <li><Link href="/security" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors" data-testid="footer-link-security">Security</Link></li>
              <li><Link href="/help" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors" data-testid="footer-link-help">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/40 mb-5">Legal</h4>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms of Service</Link></li>
              <li><Link href="/cookies" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors" data-testid="footer-link-cookies">Cookie Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/40 mb-5">Policies</h4>
            <ul className="space-y-3">
              <li><Link href="/acceptable-use" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors" data-testid="footer-link-aup">Acceptable Use</Link></li>
              <li><Link href="/dpa" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors" data-testid="footer-link-dpa">DPA</Link></li>
              <li><Link href="/ai-policy" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors" data-testid="footer-link-ai">AI Use Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/40 mb-5">Billing</h4>
            <ul className="space-y-3">
              <li><Link href="/refund-policy" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors" data-testid="footer-link-refund">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground/30">&copy; 2026 MyDraft</p>
          <a href="mailto:support@mydraft.io" className="text-sm text-muted-foreground/50 hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
        </div>
      </div>
    </footer>
  );
}
