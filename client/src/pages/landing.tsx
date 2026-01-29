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
  Lock
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
    <section className="min-h-[90svh] sm:min-h-0 pt-20 sm:pt-28 md:pt-32 pb-8 sm:pb-20 md:pb-24 px-5 sm:px-6 relative overflow-hidden flex items-center justify-center sm:block">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[600px] bg-primary/[0.08] rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative w-full">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
          <div className="max-w-xl text-center lg:text-left mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm sm:text-sm font-medium mb-8 sm:mb-8">
              <Mail className="w-4 h-4" />
              Finally, email done right
            </div>
            <h1 className="text-[2.75rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.05] mb-6 sm:mb-6">
              The inbox you
              <br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                actually control.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 sm:mb-10 max-w-md mx-auto lg:mx-0">
              Works with your existing Gmail or Outlook account. Nothing to migrate. Just a faster, cleaner way to manage email.
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
              Free plan available. Connect in under 2 minutes.
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
                        <Zap className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-primary">Quick Reply</span>
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
  const [activeDemo, setActiveDemo] = useState<'unified' | 'speed' | 'organize'>('unified');

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Designed to get you to zero
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Less time managing email. More time for everything else.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-3">
            <DemoToggle 
              active={activeDemo === 'unified'}
              onClick={() => setActiveDemo('unified')}
              icon={<Inbox className="w-5 h-5" />}
              title="See what matters first"
              description="Important messages surface automatically. Everything else stays out of your way."
              testId="demo-toggle-unified"
            />
            <DemoToggle 
              active={activeDemo === 'speed'}
              onClick={() => setActiveDemo('speed')}
              icon={<Zap className="w-5 h-5" />}
              title="Move through email faster"
              description="Keyboard-first navigation. Instant actions. No waiting, no friction."
              testId="demo-toggle-speed"
            />
            <DemoToggle 
              active={activeDemo === 'organize'}
              onClick={() => setActiveDemo('organize')}
              icon={<Filter className="w-5 h-5" />}
              title="Find anything instantly"
              description="Search that actually works. Filters that stay organized without effort."
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
        <h4 className="font-medium text-base mb-1">Priority</h4>
        <p className="text-sm text-muted-foreground/60">3 messages need attention</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium">S</div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">Sarah Chen</span>
            <p className="text-xs text-muted-foreground/60 truncate">Q4 Report - Awaiting approval</p>
          </div>
          <span className="text-xs text-primary/80 font-medium">Now</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] transition-colors">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium">D</div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">David Park</span>
            <p className="text-xs text-muted-foreground/60 truncate">Contract review needed</p>
          </div>
          <span className="text-xs text-muted-foreground/40">15m</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] transition-colors">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium">L</div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">Legal Team</span>
            <p className="text-xs text-muted-foreground/60 truncate">Signature required by EOD</p>
          </div>
          <span className="text-xs text-muted-foreground/40">1h</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/50 mt-5">
        Important messages surface first. Everything else waits.
      </p>
    </div>
  );
}

function DemoSpeed() {
  return (
    <div className="p-6">
      <div className="mb-5 pb-5 border-b border-white/[0.06]">
        <h4 className="font-medium text-base mb-1">Keyboard-first</h4>
        <p className="text-sm text-muted-foreground/60">Everything has a shortcut</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06]">
          <span className="text-sm text-muted-foreground">Compose</span>
          <kbd className="px-2 py-1 rounded bg-white/[0.06] text-xs font-mono">C</kbd>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06]">
          <span className="text-sm text-muted-foreground">Reply</span>
          <kbd className="px-2 py-1 rounded bg-white/[0.06] text-xs font-mono">R</kbd>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06]">
          <span className="text-sm text-muted-foreground">Archive</span>
          <kbd className="px-2 py-1 rounded bg-white/[0.06] text-xs font-mono">E</kbd>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06]">
          <span className="text-sm text-muted-foreground">Search</span>
          <kbd className="px-2 py-1 rounded bg-white/[0.06] text-xs font-mono">/</kbd>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/50 mt-5">
        Navigate, act, and move on. No clicking required.
      </p>
    </div>
  );
}

function DemoOrganize() {
  return (
    <div className="p-6">
      <div className="mb-5 pb-5 border-b border-white/[0.06]">
        <h4 className="font-medium text-base mb-1">Smart filters</h4>
        <p className="text-sm text-muted-foreground/60">Automatically organized</p>
      </div>
      <div className="space-y-3">
        <MockCategoryEmail 
          from="HR Team" 
          subject="Benefits Enrollment Reminder"
          category={{ name: "Action", color: "bg-red-500/20 text-red-400 border-red-500/20" }}
        />
        <MockCategoryEmail 
          from="Newsletter" 
          subject="Weekly Tech Digest"
          category={{ name: "FYI", color: "bg-blue-500/20 text-blue-400 border-blue-500/20" }}
        />
        <MockCategoryEmail 
          from="Stripe" 
          subject="Payment received"
          category={{ name: "Receipt", color: "bg-green-500/20 text-green-400 border-green-500/20" }}
        />
      </div>
      <p className="text-xs text-muted-foreground/50 mt-5">
        Labels applied automatically. Search works instantly.
      </p>
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
      icon: <Inbox className="w-5 h-5" />,
      title: "Reach inbox zero daily",
      description: "A clear view of what needs attention. Archive, reply, or defer with a single keystroke."
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Reply in seconds, not minutes",
      description: "Intelligent suggestions help you respond faster. Edit or send as-is."
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: "Never miss what matters",
      description: "Priority signals surface urgent messages. Low-priority threads stay quiet."
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Schedule sends and follow-ups",
      description: "Send later. Get reminded if no reply. Stay on top without the mental overhead."
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "Private by default",
      description: "OAuth only. We never see your password. Your data stays encrypted and yours."
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Built for daily use",
      description: "Designed to be your primary inbox. Fast, reliable, and trusted by professionals."
    }
  ];

  return (
    <section className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Everything you need, nothing you don't
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            The tools to take control of your inbox, built into one simple interface.
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
            People who switched, stayed
          </h2>
          <p className="text-muted-foreground text-lg">
            Hear from users who made MyDraft their primary inbox.
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
          Take back your inbox
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Connect your account and see the difference in minutes.
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
