import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useScrollAnimation, useParallax } from "@/hooks/use-scroll-animation";
import { 
  ArrowRight,
  Mail,
  Star,
  ChevronDown,
  Inbox,
  Send,
  Archive,
  Sparkles,
  Brain,
  Globe,
  Zap,
  Languages,
  Shield,
  Undo2,
  FolderKanban,
  Clock,
  Check,
  RotateCcw,
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
  const parallaxOffset = useParallax(0.15);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="min-h-screen flex items-center pt-20 pb-16 px-5 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/[0.08] rounded-full blur-[150px] pointer-events-none transition-opacity duration-1000"
        style={{ 
          opacity: mounted ? 1 : 0,
          transform: `translate(-50%, calc(-50% + ${parallaxOffset}px))`
        }}
      />
      
      <div className="max-w-6xl mx-auto relative w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <div className="text-center lg:text-left">
            <div 
              className="transition-all duration-1000 ease-out"
              style={{ 
                opacity: mounted ? 1 : 0, 
                transform: mounted ? 'translateY(0)' : 'translateY(30px)'
              }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-muted-foreground text-sm mb-8">
                <Globe className="w-3.5 h-3.5" />
                Works with Gmail & Outlook
              </div>
            </div>
            
            <h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-6 transition-all duration-1000 ease-out"
              style={{ 
                opacity: mounted ? 1 : 0, 
                transform: mounted ? 'translateY(0)' : 'translateY(40px)',
                transitionDelay: '150ms'
              }}
            >
              The inbox
              <br />
              that works
              <br />
              <span className="text-primary">for you.</span>
            </h1>
            
            <p 
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-md mx-auto lg:mx-0 transition-all duration-1000 ease-out"
              style={{ 
                opacity: mounted ? 1 : 0, 
                transform: mounted ? 'translateY(0)' : 'translateY(40px)',
                transitionDelay: '300ms'
              }}
            >
              AI drafts your replies, summarizes threads, and translates across 50+ languages.
            </p>
            
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start transition-all duration-1000 ease-out"
              style={{ 
                opacity: mounted ? 1 : 0, 
                transform: mounted ? 'translateY(0)' : 'translateY(40px)',
                transitionDelay: '450ms'
              }}
            >
              <Link href={getStartedHref}>
                <Button size="lg" className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/25" data-testid="hero-getstarted">
                  Try it free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-white/10" data-testid="hero-signin">
                  Sign in
                </Button>
              </Link>
            </div>
            
            <p 
              className="text-sm text-muted-foreground/60 mt-6 transition-all duration-1000 ease-out"
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
              transform: mounted ? 'translateX(0)' : 'translateX(60px)',
              transitionDelay: '400ms'
            }}
          >
            <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-3xl blur-3xl opacity-50" />
            <div className="relative rounded-2xl border border-white/[0.08] bg-card/40 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40">
              <div className="bg-white/[0.02] px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <span className="text-xs text-muted-foreground/60">MyDraft</span>
                <div className="w-16" />
              </div>
              
              <div className="flex">
                <div className="w-14 border-r border-white/[0.04] py-4 flex flex-col items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Inbox className="w-4 h-4 text-primary" />
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50">
                    <Send className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50">
                    <Archive className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="flex-1 p-5 space-y-3">
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
                  
                  <div className="mt-4 pl-11">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                      <Sparkles className="w-3 h-3 text-primary/60" />
                      <span className="italic">Suggested: "Thanks Sarah, morning works."</span>
                      <span className="text-primary/70">Use</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-6 h-6 text-muted-foreground/40" />
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
    <div className={`p-3 rounded-xl transition-colors ${selected ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${selected ? 'bg-primary/30 text-primary' : 'bg-white/[0.06] text-muted-foreground'}`}>
          {from.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${unread ? 'font-semibold' : 'text-muted-foreground'}`}>{from}</span>
            {unread && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </div>
          <p className={`text-sm truncate ${unread ? 'text-foreground/80' : 'text-muted-foreground/60'}`}>{subject}</p>
        </div>
        <span className="text-[11px] text-muted-foreground/50">{time}</span>
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

function FeatureSection({ badge, title, description, mockup, direction, accentColor }: {
  badge: string;
  title: string;
  description: string;
  mockup: React.ReactNode;
  direction: 'left' | 'right';
  accentColor: string;
  'data-testid'?: string;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.15 });
  
  const colorMap: Record<string, { badge: string; glow: string }> = {
    blue: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', glow: 'from-blue-500/20' },
    purple: { badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', glow: 'from-purple-500/20' },
    emerald: { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', glow: 'from-emerald-500/20' },
    amber: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', glow: 'from-amber-500/20' },
    rose: { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', glow: 'from-rose-500/20' },
  };
  const colors = colorMap[accentColor] || colorMap.blue;

  return (
    <section className="py-24 sm:py-32 lg:py-40 px-5 sm:px-6 relative overflow-hidden" ref={ref}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      <div 
        className={`absolute top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[200px] pointer-events-none bg-gradient-to-br ${colors.glow} to-transparent ${direction === 'left' ? 'right-0 translate-x-1/3' : 'left-0 -translate-x-1/3'}`}
        style={{ opacity: isVisible ? 0.4 : 0, transition: 'opacity 2s ease' }}
      />

      <div className="max-w-6xl mx-auto relative">
        <div className={`flex flex-col ${direction === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
          <div 
            className="flex-1 text-center lg:text-left max-w-xl"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(50px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border mb-6 ${colors.badge}`}>
              {badge}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight leading-[1.15] mb-5">
              {title}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          <div 
            className="flex-1 w-full max-w-lg lg:max-w-none"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible 
                ? 'translateY(0) translateX(0)' 
                : `translateY(30px) translateX(${direction === 'left' ? '40px' : '-40px'})`,
              transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
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
    <div ref={ref} className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
      <div className="bg-white/[0.02] px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xs font-semibold">LM</div>
          <div>
            <p className="text-sm font-medium">Lisa Martinez</p>
            <p className="text-[11px] text-muted-foreground">Re: Meeting reschedule</p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground/50">2 min ago</span>
      </div>
      <div className="p-5">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-5">
          <p className="text-sm text-foreground/70 leading-relaxed">
            Hi, can we reschedule our meeting to Thursday? I have a conflict on Wednesday afternoon. Same time works for me if that's okay with you.
          </p>
        </div>

        <div 
          className="transition-all duration-700 ease-out overflow-hidden"
          style={{ 
            opacity: showDraft ? 1 : 0, 
            maxHeight: showDraft ? '300px' : '0px',
            transform: showDraft ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <div className="p-4 rounded-xl bg-primary/[0.06] border border-primary/20 relative">
            <div className="absolute -top-3 left-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/30">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary">AI Draft</span>
              </div>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed mt-2 mb-4">
              Hi Lisa, Thursday works perfectly for me. Same time is great. See you then!
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" className="rounded-lg text-xs gap-1.5 shadow-sm" data-testid="mockup-send">
                <Send className="w-3 h-3" />
                Send
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg text-xs" data-testid="mockup-edit">
                Edit
              </Button>
              <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
                <RotateCcw className="w-3 h-3" />
                Regenerate
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupThreadSummary() {
  const [visibleItems, setVisibleItems] = useState(0);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.3 });

  useEffect(() => {
    if (isVisible) {
      const timers: ReturnType<typeof setTimeout>[] = [];
      const items = [600, 900, 1200, 1500];
      items.forEach((delay, i) => {
        timers.push(setTimeout(() => setVisibleItems(i + 1), delay));
      });
      return () => timers.forEach(clearTimeout);
    }
  }, [isVisible]);

  const summaryItems = [
    { color: 'bg-green-500', text: 'Budget approved for Q4 marketing campaign', tag: 'Decision' },
    { color: 'bg-amber-500', text: 'Waiting on vendor pricing by end of week', tag: 'Pending' },
    { color: 'bg-blue-500', text: 'Launch date confirmed: November 15', tag: 'Confirmed' },
    { color: 'bg-purple-500', text: 'Sarah to send revised timeline on Monday', tag: 'Action' },
  ];

  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
      <div className="bg-white/[0.02] px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Thread Summary</p>
            <p className="text-[11px] text-muted-foreground">Q4 Budget Discussion</p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[10px] text-muted-foreground">18 messages</span>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {summaryItems.map((item, i) => (
          <div 
            key={i} 
            className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-all duration-500 ease-out"
            style={{ 
              opacity: visibleItems > i ? 1 : 0,
              transform: visibleItems > i ? 'translateX(0)' : 'translateX(-20px)',
            }}
          >
            <div className={`w-2 h-2 rounded-full ${item.color} flex-shrink-0 mt-1.5`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/80">{item.text}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-white/[0.04] flex-shrink-0">{item.tag}</span>
          </div>
        ))}
        <div 
          className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.04] transition-all duration-500"
          style={{ opacity: visibleItems >= 4 ? 1 : 0 }}
        >
          <span className="text-[11px] text-muted-foreground/50">2 action items pending</span>
          <span className="text-[11px] text-primary/70 cursor-pointer">View full thread</span>
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
    <div ref={ref} className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
      <div className="bg-white/[0.02] px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Languages className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Instant Translation</p>
            <p className="text-[11px] text-muted-foreground">Japanese &rarr; English</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🇯🇵</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-lg">🇺🇸</span>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[10px] text-muted-foreground/50 mb-2 block">Original</span>
          <p className="text-sm text-foreground/60 leading-relaxed" style={{ fontFamily: 'sans-serif' }}>
            山田様、お忙しいところ恐れ入りますが、来週の会議の件についてご確認いただけますでしょうか。何卒よろしくお願いいたします。
          </p>
        </div>

        <div 
          className="transition-all duration-700 ease-out"
          style={{ 
            opacity: showTranslation ? 1 : 0,
            transform: showTranslation ? 'translateY(0)' : 'translateY(15px)',
          }}
        >
          <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <span className="text-[10px] text-emerald-400/70 mb-2 block">Translated</span>
            <p className="text-sm text-foreground/85 leading-relaxed">
              Mr. Yamada, I apologize for the intrusion on your busy schedule. Could you please confirm the details regarding next week's meeting? Thank you very much for your consideration.
            </p>
          </div>
        </div>

        <div 
          className="transition-all duration-500 delay-300"
          style={{ 
            opacity: showTranslation ? 1 : 0,
            transform: showTranslation ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-amber-400/70 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-medium text-amber-400/80 mb-0.5">Cultural context</p>
              <p className="text-[11px] text-amber-300/60">Formal keigo style detected. Use respectful honorifics and humble language in your reply.</p>
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
    <div ref={ref} className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
      <div className="bg-white/[0.02] px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Undo2 className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Send with safety net</p>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">To: david.park@company.com</span>
            <span className="text-[10px] text-muted-foreground/50">Just now</span>
          </div>
          <p className="text-sm font-medium mb-1">Re: Q4 Proposal</p>
          <p className="text-sm text-foreground/70">Looks great, let's move forward with Option B. I'll loop in the team tomorrow.</p>
        </div>

        {phase === 'countdown' && (
          <div className="p-4 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/[0.06]" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-400" strokeDasharray="94.2" strokeDashoffset={94.2 - (94.2 * countdown / 5)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-amber-400">{countdown}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Message sending...</p>
                  <p className="text-[11px] text-muted-foreground">You can undo this</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1.5" data-testid="mockup-undo">
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </Button>
            </div>
          </div>
        )}

        {phase === 'undone' && (
          <div className="p-4 rounded-xl bg-green-500/[0.08] border border-green-500/20 transition-all duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-400">Message recalled</p>
                <p className="text-[11px] text-muted-foreground">Moved back to drafts. Crisis averted.</p>
              </div>
            </div>
          </div>
        )}

        {phase === 'sending' && (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Preparing to send...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MockupSmartFolders() {
  const [activeFolder, setActiveFolder] = useState(0);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.3 });

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setActiveFolder(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const folders = [
    { name: 'Important', count: 3, color: 'text-red-400 bg-red-500/15', icon: Star, emails: ['David Park - Q4 Proposal', 'CEO - Company update', 'HR - Benefits enrollment'] },
    { name: 'Updates', count: 8, color: 'text-blue-400 bg-blue-500/15', icon: Mail, emails: ['GitHub - PR merged', 'Slack - New message', 'Jira - Sprint started'] },
    { name: 'Newsletters', count: 12, color: 'text-emerald-400 bg-emerald-500/15', icon: Archive, emails: ['TechCrunch - Daily digest', 'Morning Brew', 'Product Hunt - Top 5'] },
    { name: 'Promotions', count: 24, color: 'text-amber-400 bg-amber-500/15', icon: Zap, emails: ['Amazon - Sale alert', 'Figma - New features', 'Notion - Templates'] },
  ];

  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
      <div className="bg-white/[0.02] px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
            <FolderKanban className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Smart Folders</p>
            <p className="text-[11px] text-muted-foreground">AI-sorted automatically</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
          <Sparkles className="w-3 h-3" />
          Auto-organized
        </div>
      </div>
      <div className="flex">
        <div className="w-44 border-r border-white/[0.04] p-3 space-y-1">
          {folders.map((folder, i) => (
            <div 
              key={i}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-300 ${
                activeFolder === i ? 'bg-white/[0.06] border border-white/[0.08]' : 'hover:bg-white/[0.02]'
              }`}
              onClick={() => setActiveFolder(i)}
            >
              <folder.icon className={`w-3.5 h-3.5 ${folder.color.split(' ')[0]}`} />
              <span className={`text-xs flex-1 ${activeFolder === i ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{folder.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFolder === i ? folder.color : 'text-muted-foreground/40'}`}>{folder.count}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 p-3 space-y-1.5 min-h-[180px]">
          {folders[activeFolder].emails.map((email, i) => (
            <div 
              key={`${activeFolder}-${i}`}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03] transition-all duration-300"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(10px)',
                transitionDelay: `${i * 100}ms`,
              }}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium ${folders[activeFolder].color}`}>
                {email.charAt(0)}
              </div>
              <span className="text-xs text-foreground/70 truncate">{email}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
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
    <section className="py-24 sm:py-32 px-6 relative">
      <div className="max-w-4xl mx-auto w-full" ref={ref}>
        <div 
          className="text-center mb-16 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
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
                transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                transitionDelay: `${300 + i * 150}ms`
              }}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-xs font-medium text-primary mb-2">Step {step.number}</div>
              <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        <div 
          className="text-center mt-14 transition-all duration-700 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transitionDelay: '900ms'
          }}
        >
          <Link href={getStartedHref}>
            <Button size="lg" className="rounded-full px-8 gap-2" data-testid="button-simple-start-cta">
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
    <section className="py-24 sm:py-32 px-6 relative overflow-hidden">
      <div className="max-w-4xl mx-auto w-full" ref={ref}>
        <div 
          className="text-center mb-16 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
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
                  <Card className="bg-white/[0.02] border-white/[0.06] max-w-2xl mx-auto">
                    <CardContent className="p-10 text-center">
                      <div className="flex justify-center gap-1 mb-8">
                        {[...Array(t.rating)].map((_, j) => (
                          <Star key={j} className="w-6 h-6 fill-primary text-primary" />
                        ))}
                      </div>
                      <p className="text-xl text-muted-foreground leading-relaxed mb-8">"{t.content}"</p>
                      <div>
                        <p className="font-medium text-lg">{t.userName}</p>
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
                className="border-white/[0.1]"
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
                      i === currentIndex ? 'bg-primary' : 'bg-white/20'
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
                className="border-white/[0.1]"
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
    <section className="py-24 sm:py-32 px-6 relative">
      <div className="max-w-3xl mx-auto" ref={ref}>
        <div 
          className="text-center mb-16 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i}
              className="duration-700 ease-out"
              style={{ 
                opacity: isVisible ? 1 : 0, 
                transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                transitionProperty: 'opacity, transform',
                transitionDelay: `${200 + i * 80}ms`
              }}
            >
              <AccordionItem value={`faq-${i}`} className="border border-white/[0.06] rounded-2xl overflow-hidden px-6" data-testid={`faq-toggle-${i}`}>
                <AccordionTrigger className="text-lg font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground/70 leading-relaxed">
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
    <section className="min-h-[60vh] flex items-center py-24 sm:py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.08] via-primary/[0.02] to-transparent pointer-events-none" />
      <div 
        className="absolute bottom-0 left-1/2 w-[1000px] h-[500px] bg-primary/[0.1] rounded-full blur-[150px] pointer-events-none"
        style={{ transform: `translate(-50%, ${parallaxOffset * 0.5}px)` }}
      />
      
      <div className="max-w-3xl mx-auto text-center relative w-full" ref={ref}>
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-6 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          Ready to upgrade
          <br />
          <span className="text-primary">your inbox?</span>
        </h2>
        <p 
          className="text-lg text-muted-foreground mb-10 transition-all duration-1000 ease-out delay-150"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)'
          }}
        >
          Same email address. Same contacts. Better everything else.
        </p>
        <div 
          className="flex flex-col sm:flex-row gap-5 justify-center transition-all duration-1000 ease-out delay-300"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)'
          }}
        >
          <Link href={getStartedHref}>
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/25" data-testid="cta-getstarted">
              Try it free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="border-white/10" data-testid="cta-pricing">
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
    <footer className="py-16 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-5">Product</h4>
            <ul className="space-y-3">
              <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-pricing">Pricing</Link></li>
              <li><Link href="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-security">Security</Link></li>
              <li><Link href="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-help">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-5">Legal</h4>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms of Service</Link></li>
              <li><Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-cookies">Cookie Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-5">Policies</h4>
            <ul className="space-y-3">
              <li><Link href="/acceptable-use" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-aup">Acceptable Use</Link></li>
              <li><Link href="/dpa" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-dpa">DPA</Link></li>
              <li><Link href="/ai-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-ai">AI Use Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-5">Billing</h4>
            <ul className="space-y-3">
              <li><Link href="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-refund">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground/50">&copy; 2026 MyDraft</p>
          <a href="mailto:support@mydraft.io" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
        </div>
      </div>
    </footer>
  );
}
