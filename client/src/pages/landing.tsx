import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <HeroSection getStartedHref={getStartedHref()} />
      <ComparisonSection />
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
    <section className="min-h-[90svh] sm:min-h-0 pt-20 sm:pt-28 md:pt-32 pb-8 sm:pb-20 md:pb-24 px-5 sm:px-6 relative overflow-hidden flex items-center justify-center sm:block">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[600px] bg-primary/[0.08] rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative w-full">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
          <div className="max-w-xl text-center lg:text-left mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm sm:text-sm font-medium mb-8 sm:mb-8">
              <RefreshCw className="w-4 h-4" />
              Replace your inbox
            </div>
            <h1 className="text-[2.75rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.05] mb-6 sm:mb-6">
              Your new
              <br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                primary inbox.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 sm:mb-10 max-w-md mx-auto lg:mx-0">
              Same emails, smarter inbox. Replies drafted for you, threads summarized, clutter gone.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4 justify-center lg:justify-start">
              <Link href={getStartedHref}>
                <Button size="lg" className="gap-2 w-full sm:w-auto h-14 sm:h-11 text-base font-medium shadow-lg shadow-primary/25" data-testid="hero-getstarted">
                  Start free
                  <ArrowRight className="w-5 h-5 sm:w-4 sm:h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 sm:h-11 text-base font-medium border-white/10" data-testid="hero-signin">
                  Sign in
                </Button>
              </Link>
            </div>
            <p className="text-base sm:text-sm text-muted-foreground/70 mt-8 sm:mt-5">
              Connect your Gmail or Outlook. Keep your address. Get a better inbox.
            </p>
          </div>
          
          <div className="relative lg:ml-8 hidden sm:block">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-2xl blur-2xl opacity-60" />
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
                    from="David Park" 
                    subject="Quick question about the proposal"
                    preview="Hey, just wanted to check if you had a chance..."
                    time="8m"
                    unread
                  />
                  <MockEmailItem 
                    from="Sarah Chen" 
                    subject="Re: Q4 budget discussion"
                    preview="Sounds good, let's sync tomorrow morning..."
                    time="23m"
                    unread
                    selected
                  />
                  <MockEmailItem 
                    from="James Wilson" 
                    subject="Meeting notes from today"
                    preview="Hi team, here are the notes from our call..."
                    time="1h"
                  />
                  <MockEmailItem 
                    from="Lisa Martinez" 
                    subject="Can you review this before Friday?"
                    preview="I've attached the updated version..."
                    time="3h"
                  />
                  
                  <div className="mt-3 pl-11">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                      <Zap className="w-3 h-3 text-primary/60" />
                      <span className="italic">Suggested: "Thanks Sarah, morning works for me."</span>
                      <button className="text-primary/70 hover:text-primary ml-1">Use</button>
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

function ComparisonSection() {
  const comparisons = [
    {
      feature: "Reply assistance",
      theirs: "None. You write every word.",
      ours: "AI drafts replies based on context. Edit or send."
    },
    {
      feature: "Thread summaries",
      theirs: "Scroll through 47 messages yourself.",
      ours: "Get the key points in seconds."
    },
    {
      feature: "Inbox focus",
      theirs: "Promotions, social, forums, updates—endless tabs.",
      ours: "One clean inbox. Priority signals what matters."
    },
    {
      feature: "Speed",
      theirs: "Loads slow. Clicks everywhere.",
      ours: "Instant load. Built for keyboard-first workflows."
    },
    {
      feature: "Privacy",
      theirs: "Your emails train their AI models.",
      ours: "Your data stays yours. Period."
    }
  ];

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            What Gmail and Outlook are missing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The big inboxes haven't changed in years. Here's what they still don't do.
          </p>
        </div>
        
        <div className="space-y-4">
          {comparisons.map((item, i) => (
            <div key={i} className="grid md:grid-cols-3 gap-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.01]">
              <div className="font-medium text-foreground">{item.feature}</div>
              <div className="flex items-start gap-3">
                <X className="w-4 h-4 text-red-400/80 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground/70">{item.theirs}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400/80 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground/90">{item.ours}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-10 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">Same email address. Same contacts.</span> Just a smarter way to manage it all.
          </p>
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  const [activeDemo, setActiveDemo] = useState<'unified' | 'speed' | 'organize'>('unified');

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            See the difference
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A real inbox, rebuilt from scratch. Here's how it works.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-3">
            <DemoToggle 
              active={activeDemo === 'unified'}
              onClick={() => setActiveDemo('unified')}
              icon={<Inbox className="w-5 h-5" />}
              title="Clean, focused inbox"
              description="No tabs. No clutter. Just the emails that matter, front and center."
              testId="demo-toggle-unified"
            />
            <DemoToggle 
              active={activeDemo === 'speed'}
              onClick={() => setActiveDemo('speed')}
              icon={<Sparkles className="w-5 h-5" />}
              title="Instant reply drafts"
              description="See a suggested reply the moment you open an email. Edit or send."
              testId="demo-toggle-speed"
            />
            <DemoToggle 
              active={activeDemo === 'organize'}
              onClick={() => setActiveDemo('organize')}
              icon={<Brain className="w-5 h-5" />}
              title="Thread summaries"
              description="Long email chains condensed to key points. Get up to speed instantly."
              testId="demo-toggle-organize"
            />
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-card/30 backdrop-blur-sm overflow-hidden shadow-xl shadow-black/20">
            {activeDemo === 'unified' && <DemoUnified />}
            {activeDemo === 'speed' && <DemoSpeed />}
            {activeDemo === 'organize' && <DemoOrganize />}
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

function DemoUnified() {
  return (
    <div className="p-6">
      <div className="mb-5 pb-5 border-b border-white/[0.06]">
        <h4 className="font-medium text-base mb-1">Inbox</h4>
        <p className="text-sm text-muted-foreground/60">12 unread</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium">M</div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">Michael Torres</span>
            <p className="text-xs text-muted-foreground/60 truncate">Following up on our call</p>
          </div>
          <span className="text-xs text-muted-foreground/40">5m</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] transition-colors">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium">J</div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">John (3)</span>
            <p className="text-xs text-muted-foreground/60 truncate">Re: Re: lunch tomorrow?</p>
          </div>
          <span className="text-xs text-muted-foreground/40">28m</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] transition-colors">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium">E</div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">Emily Rodriguez</span>
            <p className="text-xs text-muted-foreground/60 truncate">Thanks for sending that over</p>
          </div>
          <span className="text-xs text-muted-foreground/40">2h</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/50 mt-5">
        Your inbox, organized the way you'd expect.
      </p>
    </div>
  );
}

function DemoSpeed() {
  return (
    <div className="p-6">
      <div className="mb-5 pb-5 border-b border-white/[0.06]">
        <h4 className="font-medium text-base mb-1">AI Replies</h4>
        <p className="text-sm text-muted-foreground/60">Draft responses instantly</p>
      </div>
      <div className="space-y-4">
        <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <p className="text-xs text-muted-foreground/60 mb-2">From: Sarah Chen</p>
          <p className="text-sm text-muted-foreground">"Can we move the meeting to 3pm instead?"</p>
        </div>
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
          <p className="text-xs text-primary/70 mb-2">Suggested reply</p>
          <p className="text-sm text-foreground/80">"Sure, 3pm works for me. See you then!"</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="h-7 text-xs">Send</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs">Edit</Button>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/50 mt-5">
        Review, edit, or send. You're always in control.
      </p>
    </div>
  );
}

function DemoOrganize() {
  return (
    <div className="p-6">
      <div className="mb-5 pb-5 border-b border-white/[0.06]">
        <h4 className="font-medium text-base mb-1">Thread Summary</h4>
        <p className="text-sm text-muted-foreground/60">47 messages condensed</p>
      </div>
      <div className="space-y-4">
        <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px]">M</div>
            <span className="text-sm font-medium">Project launch thread</span>
            <span className="text-xs text-muted-foreground/40 ml-auto">47 messages</span>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground/80">
            <p className="flex items-start gap-2">
              <span className="text-primary/60">•</span>
              Launch date confirmed for March 15th
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary/60">•</span>
              Marketing assets due by March 10th
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary/60">•</span>
              Waiting on final approval from legal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <Brain className="w-3 h-3" />
          <span>Summarized from 47 messages spanning 2 weeks</span>
        </div>
      </div>
    </div>
  );
}

function MockCategoryEmail({ from, subject, category }: { 
  from: string; 
  subject: string;
  category: { name: string; color: string };
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
        <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex-shrink-0 ${category.color}`}>
          {category.name}
        </span>
      </div>
    </div>
  );
}

function BenefitsSection() {
  const benefits = [
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Keep your email address",
      description: "Connect Gmail or Outlook in seconds. Nothing to migrate. Your contacts stay the same."
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Replies written for you",
      description: "Open an email, see a draft reply. Edit it or send it. Respond in seconds, not minutes."
    },
    {
      icon: <Brain className="w-5 h-5" />,
      title: "Threads summarized",
      description: "Skip scrolling through 50-message threads. Get the key points instantly."
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Actually fast",
      description: "Instant load. No waiting. Built to handle how fast you actually work."
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "Private by design",
      description: "OAuth only—we never see your password. Your emails aren't used to train anything."
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Works the way you expect",
      description: "Star, archive, search. The actions you know, without the bloat you don't."
    }
  ];

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Built to be your only inbox
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Not a plugin. Not a wrapper. A complete email experience, rebuilt from scratch.
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

interface Testimonial {
  id: number;
  userName: string;
  content: string;
  rating: number;
  isFounder: boolean;
}

function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Fetch approved testimonials from API
  const { data: apiTestimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
  });

  // Founder testimonial - always shown first
  const founderTestimonial = {
    id: 0,
    userName: "Founder",
    content: "We built MyDraft for ourselves first. An inbox that loads instantly, clears quickly, and never gets in the way. Now we use it every day.",
    rating: 5,
    isFounder: true,
  };

  // Combine founder testimonial with approved user testimonials
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
    <section className="py-24 px-6 border-t border-white/[0.04] overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Made the switch
          </h2>
          <p className="text-muted-foreground text-lg">
            People who left Gmail and Outlook behind.
          </p>
        </div>
        
        <div className="relative">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((t, i) => (
                <div key={t.id || i} className="w-full flex-shrink-0 px-4">
                  <Card className="bg-white/[0.02] border-white/[0.06] max-w-2xl mx-auto">
                    <CardContent className="p-8 text-center">
                      <div className="flex justify-center gap-1 mb-6">
                        {[...Array(t.rating)].map((_, j) => (
                          <Star key={j} className="w-5 h-5 fill-primary text-primary" />
                        ))}
                      </div>
                      <p className="text-lg text-muted-foreground leading-relaxed mb-6">"{t.content}"</p>
                      <div>
                        <p className="font-medium">{t.userName}</p>
                        {t.isFounder && (
                          <p className="text-sm text-primary/80">Founder of MyDraft</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          
          {testimonials.length > 1 && (
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
      a: "We use OAuth, so we never see your password. Your emails are encrypted in transit and at rest. We don't sell data or use it for training."
    },
    {
      q: "What does the free plan include?",
      a: "Basic inbox access with core features. Upgrade to Pro for intelligent suggestions, scheduled sends, and priority support."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No contracts. No cancellation fees. Your subscription runs until the end of your billing period."
    },
    {
      q: "Is there a trial for paid plans?",
      a: "Pro and Business plans include a 14-day trial. Full access, no restrictions."
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
            Everything you need to know about MyDraft
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
          Ready to upgrade your inbox?
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Same email address. Same contacts. Better everything else. Connect in 2 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={getStartedHref}>
            <Button size="lg" className="gap-2 h-12 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" data-testid="cta-getstarted">
              Start free
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
        <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground/50">© 2024 MyDraft. All rights reserved.</p>
          <a href="mailto:support@mydraft.io" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
        </div>
      </div>
    </footer>
  );
}
