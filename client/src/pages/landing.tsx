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
  Layers,
  Zap,
  Eye,
  Filter,
  Lock,
  X,
  Sparkles,
  Brain,
  Search,
  RefreshCw
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
      <DemoSection />
      <BenefitsSection />
      <ComparisonSection />
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
                <Mail className="w-3.5 h-3.5" />
                Works with Gmail & Outlook
              </div>
            </div>
            
            <h1 
              className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] mb-6 transition-all duration-1000 ease-out"
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
              AI drafts your replies. Summarizes long threads. Keeps your focus on what matters.
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
                  Start free
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
              Connect Gmail or Outlook in under 2 minutes
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
                      <Zap className="w-3 h-3 text-primary/60" />
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

function DemoSection() {
  const [activeDemo, setActiveDemo] = useState<'unified' | 'speed' | 'organize'>('unified');
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="min-h-screen flex items-center py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto w-full" ref={ref}>
        <div 
          className="text-center mb-20 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6">
            See the difference
          </h2>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            A real inbox, rebuilt from scratch.
          </p>
        </div>

        <div 
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center transition-all duration-1000 ease-out delay-200"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          <div className="space-y-4">
            <DemoToggle 
              active={activeDemo === 'unified'}
              onClick={() => setActiveDemo('unified')}
              icon={<Inbox className="w-6 h-6" />}
              title="Clean, focused inbox"
              description="No tabs. No clutter. Just the emails that matter."
              testId="demo-toggle-unified"
            />
            <DemoToggle 
              active={activeDemo === 'speed'}
              onClick={() => setActiveDemo('speed')}
              icon={<Sparkles className="w-6 h-6" />}
              title="Instant reply drafts"
              description="See a suggested reply the moment you open an email."
              testId="demo-toggle-speed"
            />
            <DemoToggle 
              active={activeDemo === 'organize'}
              onClick={() => setActiveDemo('organize')}
              icon={<Brain className="w-6 h-6" />}
              title="Thread summaries"
              description="Long email chains condensed to key points."
              testId="demo-toggle-organize"
            />
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-3xl blur-3xl opacity-40" />
            <div className="relative rounded-2xl border border-white/[0.08] bg-card/40 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/30">
              {activeDemo === 'unified' && <DemoUnified />}
              {activeDemo === 'speed' && <DemoSpeed />}
              {activeDemo === 'organize' && <DemoOrganize />}
            </div>
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
      className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 hover-elevate ${
        active 
          ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/10' 
          : 'border-white/[0.06]'
      }`}
    >
      <div className="flex items-start gap-5">
        <div className={`p-3 rounded-xl transition-colors ${active ? 'bg-primary/20 text-primary' : 'bg-white/[0.04] text-muted-foreground'}`}>
          {icon}
        </div>
        <div>
          <h3 className={`font-medium text-lg mb-1 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h3>
          <p className="text-muted-foreground/70">{description}</p>
        </div>
      </div>
    </button>
  );
}

function DemoUnified() {
  return (
    <div className="bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
        <div className="flex items-center gap-3">
          <Inbox className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Inbox</span>
          <span className="text-xs text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded">12</span>
        </div>
        <Search className="w-4 h-4 text-muted-foreground/40" />
      </div>
      <div>
        <div className="flex items-start gap-3 px-4 py-3 bg-primary/5 border-l-2 border-primary">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">MT</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-sm font-medium truncate">Michael Torres</span>
              <span className="text-[11px] text-muted-foreground/50 flex-shrink-0">5m</span>
            </div>
            <p className="text-sm text-foreground/80 truncate mb-0.5">Following up on our call</p>
            <p className="text-xs text-muted-foreground/50 truncate">Thanks for taking the time to chat yesterday...</p>
          </div>
          <Star className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-start gap-3 px-4 py-3 border-b border-border/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">JC</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">John Chen</span>
                <span className="text-[10px] text-muted-foreground/40 bg-muted/20 px-1 rounded">3</span>
              </div>
              <span className="text-[11px] text-muted-foreground/50 flex-shrink-0">28m</span>
            </div>
            <p className="text-sm text-foreground/80 truncate mb-0.5">Re: lunch tomorrow?</p>
            <p className="text-xs text-muted-foreground/50 truncate">Sounds good, let's meet at noon</p>
          </div>
          <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-start gap-3 px-4 py-3 border-b border-border/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">ER</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-sm text-muted-foreground truncate">Emily Rodriguez</span>
              <span className="text-[11px] text-muted-foreground/50 flex-shrink-0">2h</span>
            </div>
            <p className="text-sm text-muted-foreground/70 truncate mb-0.5">Thanks for sending that over</p>
            <p className="text-xs text-muted-foreground/40 truncate">I'll review and get back to you by EOD</p>
          </div>
          <Star className="w-4 h-4 text-muted-foreground/20 flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">AL</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-sm text-muted-foreground truncate">Alex Lin</span>
              <span className="text-[11px] text-muted-foreground/50 flex-shrink-0">Yesterday</span>
            </div>
            <p className="text-sm text-muted-foreground/70 truncate mb-0.5">Project update</p>
            <p className="text-xs text-muted-foreground/40 truncate">Here's where we are on the Q1 deliverables</p>
          </div>
          <Star className="w-4 h-4 text-muted-foreground/20 flex-shrink-0 mt-1" />
        </div>
      </div>
    </div>
  );
}

function DemoSpeed() {
  return (
    <div className="bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Button>
        <div className="flex-1">
          <p className="text-sm font-medium">Re: Meeting reschedule</p>
          <p className="text-xs text-muted-foreground/60">Sarah Chen</p>
        </div>
        <Star className="w-4 h-4 text-muted-foreground/30" />
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">SC</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Sarah Chen</span>
              <span className="text-[11px] text-muted-foreground/50">10:32 AM</span>
            </div>
            <p className="text-sm text-muted-foreground/80">Can we move the meeting to 3pm instead? I have a conflict at 2.</p>
          </div>
        </div>
        <div className="ml-11 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Draft reply</span>
          </div>
          <p className="text-sm text-foreground/90 mb-4">Hi Sarah,</p>
          <p className="text-sm text-foreground/90 mb-4">3pm works perfectly for me. I'll update the calendar invite.</p>
          <p className="text-sm text-foreground/90 mb-4">See you then!</p>
          <div className="flex gap-2 pt-2 border-t border-primary/10">
            <Button size="sm">Send</Button>
            <Button size="sm" variant="ghost">Edit</Button>
            <Button size="sm" variant="ghost">Regenerate</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoOrganize() {
  return (
    <div className="bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Project Launch Planning</p>
            <span className="text-[10px] text-muted-foreground/40 bg-muted/20 px-1 rounded">47</span>
          </div>
          <p className="text-xs text-muted-foreground/60">Marketing Team</p>
        </div>
        <Archive className="w-4 h-4 text-muted-foreground/30" />
      </div>
      <div className="p-4">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Thread summary</span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">47 messages</span>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-foreground/80">Launch date confirmed: March 15th</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-foreground/80">Marketing assets due by March 10th</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-foreground/80">Awaiting legal approval on terms</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-foreground/80">Budget approved by finance</span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0">JD</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">James Dean</span>
                <span className="text-[10px] text-muted-foreground/40">Mar 5</span>
              </div>
              <p className="text-xs text-muted-foreground/60">Sounds good, I'll get the assets ready...</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0">LM</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Lisa Martinez</span>
                <span className="text-[10px] text-muted-foreground/40">Mar 5</span>
              </div>
              <p className="text-xs text-muted-foreground/60">Legal is reviewing the final draft now...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitsSection() {
  const benefits = [
    {
      icon: <RefreshCw className="w-6 h-6" />,
      title: "Keep your email address",
      description: "Connect Gmail or Outlook in seconds. Nothing to migrate."
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Replies written for you",
      description: "Open an email, see a draft reply. Respond in seconds."
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Threads summarized",
      description: "Skip scrolling through 50-message threads."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Actually fast",
      description: "Instant load. Built to match your pace."
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Private by design",
      description: "OAuth only. Your emails stay yours."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Works the way you expect",
      description: "Star, archive, search. No bloat."
    }
  ];

  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const positions = [
    { x: '15%', y: '20%', delay: 0 },
    { x: '75%', y: '15%', delay: 100 },
    { x: '5%', y: '55%', delay: 200 },
    { x: '85%', y: '50%', delay: 300 },
    { x: '25%', y: '80%', delay: 400 },
    { x: '65%', y: '85%', delay: 500 },
  ];

  return (
    <section className="min-h-screen flex items-center py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-7xl mx-auto w-full" ref={ref}>
        <div 
          className="text-center mb-16 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6">
            Built to be your only inbox
          </h2>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Not a plugin. Not a wrapper. A complete email experience.
          </p>
        </div>
        
        <div className="relative h-[600px] md:h-[700px] hidden md:block">
          {benefits.map((benefit, i) => (
            <div 
              key={i}
              className="absolute transition-all duration-1000 ease-out cursor-pointer"
              style={{ 
                left: positions[i].x,
                top: positions[i].y,
                opacity: isVisible ? 1 : 0,
                transform: `translate(-50%, -50%) ${isVisible ? 'scale(1)' : 'scale(0.8)'}`,
                transitionDelay: `${positions[i].delay}ms`,
                zIndex: hoveredIndex === i ? 10 : 1
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div 
                className={`relative p-8 rounded-3xl border transition-all duration-500 ${
                  hoveredIndex === i 
                    ? 'bg-primary/10 border-primary/30 scale-110 shadow-2xl shadow-primary/20' 
                    : 'bg-white/[0.03] border-white/[0.08] hover-elevate'
                }`}
                style={{ maxWidth: '280px' }}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-300 ${
                  hoveredIndex === i ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
                }`}>
                  {benefit.icon}
                </div>
                <h3 className="font-medium text-lg mb-2">{benefit.title}</h3>
                <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                  hoveredIndex === i ? 'text-muted-foreground' : 'text-muted-foreground/60'
                }`}>
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <line x1="15%" y1="20%" x2="75%" y2="15%" stroke="url(#lineGradient)" strokeWidth="1" className={`transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '600ms' }} />
            <line x1="15%" y1="20%" x2="5%" y2="55%" stroke="url(#lineGradient)" strokeWidth="1" className={`transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '700ms' }} />
            <line x1="75%" y1="15%" x2="85%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1" className={`transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '800ms' }} />
            <line x1="5%" y1="55%" x2="25%" y2="80%" stroke="url(#lineGradient)" strokeWidth="1" className={`transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '900ms' }} />
            <line x1="85%" y1="50%" x2="65%" y2="85%" stroke="url(#lineGradient)" strokeWidth="1" className={`transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '1000ms' }} />
            <line x1="25%" y1="80%" x2="65%" y2="85%" stroke="url(#lineGradient)" strokeWidth="1" className={`transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '1100ms' }} />
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:hidden">
          {benefits.map((benefit, i) => (
            <div 
              key={i}
              className="transition-all duration-700 ease-out"
              style={{ 
                opacity: isVisible ? 1 : 0, 
                transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                transitionDelay: `${200 + i * 100}ms`
              }}
            >
              <Card className="bg-white/[0.02] border-white/[0.06] transition-all duration-300 h-full hover-elevate">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    {benefit.icon}
                  </div>
                  <h3 className="font-medium mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed">{benefit.description}</p>
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
  const comparisons = [
    {
      feature: "Reply assistance",
      theirs: "None. You write every word.",
      ours: "AI drafts replies based on context."
    },
    {
      feature: "Thread summaries",
      theirs: "Scroll through 47 messages yourself.",
      ours: "Get the key points in seconds."
    },
    {
      feature: "Inbox focus",
      theirs: "Promotions, social, forums, updates.",
      ours: "One clean inbox. Priority signals."
    },
    {
      feature: "Speed",
      theirs: "Loads slow. Clicks everywhere.",
      ours: "Instant. Zero lag."
    },
    {
      feature: "Privacy",
      theirs: "Your emails train their AI.",
      ours: "Your data stays yours."
    }
  ];

  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.15 });

  return (
    <section className="min-h-screen flex items-center py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />
      
      <div className="max-w-5xl mx-auto w-full" ref={ref}>
        <div 
          className="text-center mb-20 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6">
            What they're missing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Gmail and Outlook haven't changed in years.
          </p>
        </div>
        
        <div className="space-y-4">
          {comparisons.map((item, i) => (
            <div 
              key={i}
              className="transition-all duration-700 ease-out"
              style={{ 
                opacity: isVisible ? 1 : 0, 
                transform: isVisible ? 'translateX(0)' : 'translateX(-30px)',
                transitionDelay: `${200 + i * 100}ms`
              }}
            >
              <div className="grid md:grid-cols-3 gap-6 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover-elevate transition-colors">
                <div className="font-medium text-lg">{item.feature}</div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-400/80 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground/70">{item.theirs}</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400/80 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/90">{item.ours}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div 
          className="mt-12 p-8 rounded-2xl bg-primary/5 border border-primary/20 text-center transition-all duration-1000 ease-out delay-700"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)'
          }}
        >
          <p className="text-lg text-muted-foreground">
            <span className="text-foreground font-medium">Same email address. Same contacts.</span> Just better.
          </p>
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
  isFounder: boolean;
}

function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });
  
  const { data: apiTestimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
  });

  const founderTestimonial = {
    id: 0,
    userName: "Founder",
    content: "We built MyDraft for ourselves first. An inbox that loads instantly, clears quickly, and never gets in the way. Now we use it every day.",
    rating: 5,
    isFounder: true,
  };

  const testimonials = [founderTestimonial, ...(apiTestimonials || [])];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="min-h-[70vh] flex items-center py-32 px-6 relative overflow-hidden">
      <div className="max-w-4xl mx-auto w-full" ref={ref}>
        <div 
          className="text-center mb-16 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6">
            Made the switch
          </h2>
          <p className="text-xl text-muted-foreground">
            People who left Gmail and Outlook behind.
          </p>
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
                        {t.isFounder && (
                          <p className="text-primary/80">Founder of MyDraft</p>
                        )}
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
      q: "Does this replace Gmail or Outlook?",
      a: "Yes. MyDraft connects to your existing account and becomes your primary inbox. Your emails stay where they are. Nothing to migrate."
    },
    {
      q: "Which providers are supported?",
      a: "Gmail, Google Workspace, Outlook, and Microsoft 365. Connect in under two minutes."
    },
    {
      q: "How is my data protected?",
      a: "We use OAuth, so we never see your password. Your emails are encrypted in transit and at rest."
    },
    {
      q: "What does the free plan include?",
      a: "Basic inbox access with core features. Upgrade to Pro for intelligent suggestions and priority support."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No contracts. No cancellation fees."
    },
    {
      q: "Is there a trial for paid plans?",
      a: "Pro and Business plans include a 14-day trial. Full access, no restrictions."
    }
  ];

  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.15 });

  return (
    <section className="py-32 px-6 relative">
      <div className="max-w-3xl mx-auto" ref={ref}>
        <div 
          className="text-center mb-20 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6">
            Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about MyDraft
          </p>
        </div>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i}
              className="transition-all duration-700 ease-out"
              style={{ 
                opacity: isVisible ? 1 : 0, 
                transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
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
    <section className="min-h-[70vh] flex items-center py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.08] via-primary/[0.02] to-transparent pointer-events-none" />
      <div 
        className="absolute bottom-0 left-1/2 w-[1000px] h-[500px] bg-primary/[0.1] rounded-full blur-[150px] pointer-events-none"
        style={{ transform: `translate(-50%, ${parallaxOffset * 0.5}px)` }}
      />
      
      <div className="max-w-3xl mx-auto text-center relative w-full" ref={ref}>
        <h2 
          className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-8 transition-all duration-1000 ease-out"
          style={{ 
            opacity: isVisible ? 1 : 0, 
            transform: isVisible ? 'translateY(0)' : 'translateY(50px)'
          }}
        >
          Ready to upgrade?
        </h2>
        <p 
          className="text-xl text-muted-foreground mb-14 transition-all duration-1000 ease-out delay-150"
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
              Start free
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
          <p className="text-sm text-muted-foreground/50">© 2026 MyDraft</p>
          <a href="mailto:support@mydraft.io" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
        </div>
      </div>
    </footer>
  );
}
