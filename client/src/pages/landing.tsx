import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
  Languages,
  Shield,
  Check,
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
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">
      <MarketingNav />
      <HeroSection getStartedHref={getStartedHref()} />
      <ProductPreview />
      <FeaturesSection />
      <GlobalSection />
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
    <section className="pt-32 sm:pt-40 pb-16 sm:pb-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div 
          className="transition-all duration-700 ease-out"
          style={{ 
            opacity: mounted ? 1 : 0, 
            transform: mounted ? 'translateY(0)' : 'translateY(20px)'
          }}
        >
          <p className="text-sm font-medium text-primary mb-6 tracking-wide uppercase" data-testid="text-hero-badge">
            Works with Gmail & Outlook
          </p>
        </div>
        
        <h1 
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-8 transition-all duration-700 ease-out"
          style={{ 
            opacity: mounted ? 1 : 0, 
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '100ms'
          }}
        >
          Email deserves
          <br />
          a fresh start
        </h1>
        
        <p 
          className="text-xl text-gray-500 leading-relaxed mb-10 max-w-xl mx-auto transition-all duration-700 ease-out"
          style={{ 
            opacity: mounted ? 1 : 0, 
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '200ms'
          }}
        >
          AI drafts your replies, summarizes threads, and translates across 50+ languages. Your inbox, finally under control.
        </p>
        
        <div 
          className="flex flex-col sm:flex-row gap-3 justify-center transition-all duration-700 ease-out"
          style={{ 
            opacity: mounted ? 1 : 0, 
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '300ms'
          }}
        >
          <Link href={getStartedHref}>
            <Button size="lg" className="gap-2 w-full sm:w-auto text-base px-8" data-testid="hero-getstarted">
              Try it free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8" data-testid="hero-signin">
              Sign in
            </Button>
          </Link>
        </div>
        
        <p 
          className="text-sm text-gray-400 mt-5 transition-all duration-700 ease-out"
          style={{ 
            opacity: mounted ? 1 : 0,
            transitionDelay: '400ms'
          }}
        >
          Free plan available. No credit card required.
        </p>
      </div>
    </section>
  );
}

function ProductPreview() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="px-6 pb-24 sm:pb-32">
      <div 
        className="max-w-5xl mx-auto transition-all duration-1000 ease-out"
        style={{ 
          opacity: mounted ? 1 : 0, 
          transform: mounted ? 'translateY(0)' : 'translateY(40px)',
        }}
      >
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xl">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <div className="flex-1 flex justify-center">
              <span className="text-xs text-gray-400 font-medium">MyDraft</span>
            </div>
            <div className="w-14" />
          </div>
          
          <div className="flex min-h-[420px]">
            <div className="w-56 border-r border-gray-100 py-4 px-3 hidden sm:block">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium mb-1">
                <Inbox className="w-4 h-4" />
                Inbox
                <span className="ml-auto text-xs bg-primary text-white rounded-full px-1.5 py-0.5">4</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 text-sm">
                <Send className="w-4 h-4" />
                Sent
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 text-sm">
                <Archive className="w-4 h-4" />
                Archive
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 text-sm">
                <Star className="w-4 h-4" />
                Starred
              </div>
            </div>
            
            <div className="w-72 border-r border-gray-100 hidden md:block">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Today</p>
              </div>
              <PreviewEmailItem 
                from="David Park" 
                subject="Quick question about the proposal"
                preview="Hey, I was looking at the numbers and..."
                time="8m"
                unread
              />
              <PreviewEmailItem 
                from="Sarah Chen" 
                subject="Re: Q4 budget discussion"
                preview="Sounds good, let's finalize by Friday"
                time="23m"
                selected
              />
              <PreviewEmailItem 
                from="James Wilson" 
                subject="Meeting notes from today"
                preview="Here's a summary of what we discussed"
                time="1h"
              />
              <PreviewEmailItem 
                from="Lisa Martinez" 
                subject="Can you review this?"
                preview="I've attached the latest version for..."
                time="3h"
              />
            </div>

            <div className="flex-1 p-6">
              <div className="mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-medium">S</div>
                  <div>
                    <p className="text-sm font-semibold">Sarah Chen</p>
                    <p className="text-xs text-gray-400">to me, 23 minutes ago</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 leading-relaxed pl-12">
                  <p className="mb-2">Hi there,</p>
                  <p className="mb-2">Sounds good on the Q4 budget. Let's plan to finalize everything by Friday so we can get approvals next week.</p>
                  <p>Can you send over the revised numbers when you get a chance?</p>
                </div>
              </div>
              
              <div className="ml-12 p-4 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">AI Draft</span>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  Hi Sarah, I'll get the revised numbers over to you by end of day tomorrow. Friday deadline works well for me. Thanks for keeping this on track!
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="text-xs h-7">Send</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7">Edit</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewEmailItem({ from, subject, preview, time, unread = false, selected = false }: { 
  from: string; 
  subject: string;
  preview: string;
  time: string;
  unread?: boolean;
  selected?: boolean;
}) {
  return (
    <div className={`px-4 py-3 border-b border-gray-50 cursor-pointer ${selected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className={`text-sm ${unread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{from}</span>
        <span className="text-[11px] text-gray-400">{time}</span>
      </div>
      <p className={`text-sm truncate ${unread ? 'font-medium text-gray-800' : 'text-gray-500'}`}>{subject}</p>
      <p className="text-xs text-gray-400 truncate mt-0.5">{preview}</p>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="py-24 sm:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            And there's so much more
          </h2>
          <p className="text-lg text-gray-500 max-w-lg mx-auto">
            When you put it all together, it feels like magic.
          </p>
        </div>

        <div className="space-y-32">
          <FeatureBlock
            title="AI-drafted replies"
            description="Replies written in your tone, ready to review and send with one click. The AI learns your style so every draft sounds like you, not a robot."
            testId="text-feature-ai-replies"
            align="left"
          >
            <FeatureMockupReply />
          </FeatureBlock>

          <FeatureBlock
            title="Thread summaries"
            description="Long email threads? Get key decisions, action items, and what's pending in seconds. No more scrolling through 30 messages."
            testId="text-feature-summaries"
            align="right"
          >
            <FeatureMockupSummary />
          </FeatureBlock>

          <FeatureBlock
            title="Translate anything"
            description="Read and reply in 50+ languages. Cultural context included: the AI knows the difference between formal Japanese keigo and casual Australian English."
            testId="text-feature-multilingual"
            align="left"
          >
            <FeatureMockupGlobal />
          </FeatureBlock>
        </div>
      </div>
    </section>
  );
}

function FeatureBlock({ title, description, testId, children, align }: {
  title: string;
  description: string;
  testId: string;
  children: React.ReactNode;
  align: 'left' | 'right';
}) {
  return (
    <div className={`flex flex-col ${align === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
      <div className="flex-1 max-w-md">
        <h3 className="text-2xl sm:text-3xl font-bold mb-4" data-testid={testId}>{title}</h3>
        <p className="text-lg text-gray-500 leading-relaxed">
          {description}
        </p>
      </div>
      <div className="flex-1 w-full max-w-md lg:max-w-none">
        {children}
      </div>
    </div>
  );
}

function FeatureMockupReply() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-lg">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-gray-500">AI Draft</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">L</div>
          <div className="flex-1 p-3 rounded-lg bg-gray-50">
            <p className="text-[11px] text-gray-400 mb-1">Lisa Martinez</p>
            <p className="text-sm text-gray-600">Can we reschedule our meeting to Thursday? I have a conflict on Wednesday afternoon.</p>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-medium text-primary">Suggested reply</span>
          </div>
          <p className="text-sm text-gray-700 mb-3">
            Hi Lisa, Thursday works perfectly for me. Same time? Let me know if you need to adjust. Thanks!
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs h-7" data-testid="mockup-send">Send</Button>
            <Button size="sm" variant="ghost" className="text-xs h-7" data-testid="mockup-edit">Edit</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureMockupSummary() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-lg">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-gray-500">Thread Summary</span>
        </div>
        <span className="text-[10px] text-gray-400">18 messages</span>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-start gap-2.5">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">Budget approved for Q4 marketing campaign</p>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-4 h-4 rounded-full border-2 border-orange-300 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500">Waiting on vendor pricing by Friday</p>
        </div>
        <div className="flex items-start gap-2.5">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500">Team agreed on launch date: Nov 15</p>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-4 h-4 rounded-full border-2 border-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-400">Sarah to send revised timeline Monday</p>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">2 action items pending</p>
        </div>
      </div>
    </div>
  );
}

function FeatureMockupGlobal() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-lg">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
        <Languages className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-gray-500">Translation</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="p-3 rounded-lg bg-gray-50">
          <p className="text-[10px] text-gray-400 mb-2">Original (Japanese)</p>
          <p className="text-sm text-gray-500" style={{ fontFamily: 'sans-serif' }}>
            山田様、お忙しいところ恐れ入りますが、来週の会議の件についてご確認いただけますでしょうか。
          </p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-[10px] text-primary mb-2">Translated to English</p>
          <p className="text-sm text-gray-700">
            Mr. Yamada, I apologize for the intrusion on your busy schedule. Could you please confirm the details regarding next week's meeting?
          </p>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">Cultural note: Formal keigo style — use respectful tone in reply</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalSection() {
  return (
    <section className="py-24 sm:py-32 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Global inbox,
              <br />
              local tone.
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Translate and reply across languages with cultural awareness built in. The AI adapts formality, etiquette, and tone for every region.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-white border border-gray-200">
                <p className="text-2xl font-bold mb-1">50+</p>
                <p className="text-xs text-gray-500">languages</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-white border border-gray-200">
                <p className="text-2xl font-bold mb-1">20+</p>
                <p className="text-xs text-gray-500">cultures</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-white border border-gray-200">
                <p className="text-2xl font-bold mb-1">Auto</p>
                <p className="text-xs text-gray-500">formality</p>
              </div>
            </div>
          </div>

          <div>
            <FeatureMockupGlobal />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection({ getStartedHref }: { getStartedHref: string }) {
  const steps = [
    { number: "1", title: "Sign up free", description: "Create your account in seconds." },
    { number: "2", title: "Connect your email", description: "Link Gmail or Outlook with one click." },
    { number: "3", title: "Set your style", description: "Tell the AI how you write." },
    { number: "4", title: "You're ready", description: "Your inbox, now smarter." },
  ];

  return (
    <section className="py-24 sm:py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Get started in minutes
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-gray-500">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <Link href={getStartedHref}>
            <Button size="lg" className="gap-2 text-base px-8" data-testid="button-simple-start-cta">
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
    <section className="py-24 sm:py-32 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            What people are saying
          </h2>
        </div>
        
        <div className="relative">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((t, i) => (
                <div key={t.id || i} className="w-full flex-shrink-0 px-4">
                  <Card className="bg-white border-gray-200 shadow-md max-w-2xl mx-auto">
                    <CardContent className="p-10 text-center">
                      <div className="flex justify-center gap-1 mb-8">
                        {[...Array(t.rating)].map((_, j) => (
                          <Star key={j} className="w-5 h-5 fill-primary text-primary" />
                        ))}
                      </div>
                      <p className="text-xl text-gray-600 leading-relaxed mb-8">"{t.content}"</p>
                      <p className="font-semibold text-lg">{t.userName}</p>
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
                data-testid="testimonial-prev"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </Button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentIndex ? 'bg-primary w-6' : 'bg-gray-300'
                    }`}
                    data-testid={`testimonial-dot-${i}`}
                  />
                ))}
              </div>
              <Button
                onClick={nextSlide}
                variant="outline"
                size="icon"
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

  return (
    <section className="py-24 sm:py-32 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Questions & answers
          </h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-gray-200 rounded-lg overflow-hidden px-5" data-testid={`faq-toggle-${i}`}>
              <AccordionTrigger className="text-base font-medium hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-gray-500 leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTASection({ getStartedHref }: { getStartedHref: string }) {
  return (
    <section className="py-24 sm:py-32 px-6 bg-gray-50">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
          Ready to upgrade
          <br />
          your inbox?
        </h2>
        <p className="text-lg text-gray-500 mb-10">
          Same email address. Same contacts. Better everything else.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={getStartedHref}>
            <Button size="lg" className="gap-2 text-base px-8" data-testid="cta-getstarted">
              Try it free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="text-base px-8" data-testid="cta-pricing">
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
    <footer className="py-16 px-6 border-t border-gray-200">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div>
            <h4 className="text-sm font-semibold mb-5">Product</h4>
            <ul className="space-y-3">
              <li><Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" data-testid="footer-link-pricing">Pricing</Link></li>
              <li><Link href="/security" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" data-testid="footer-link-security">Security</Link></li>
              <li><Link href="/help" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" data-testid="footer-link-help">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-5">Legal</h4>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" data-testid="footer-link-privacy">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" data-testid="footer-link-terms">Terms of Service</Link></li>
              <li><Link href="/cookies" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" data-testid="footer-link-cookies">Cookie Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-5">Policies</h4>
            <ul className="space-y-3">
              <li><Link href="/acceptable-use" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" data-testid="footer-link-aup">Acceptable Use</Link></li>
              <li><Link href="/dpa" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" data-testid="footer-link-dpa">DPA</Link></li>
              <li><Link href="/ai-policy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" data-testid="footer-link-ai">AI Use Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-5">Billing</h4>
            <ul className="space-y-3">
              <li><Link href="/refund-policy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" data-testid="footer-link-refund">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">&copy; 2026 MyDraft</p>
          <a href="mailto:support@mydraft.io" className="text-sm text-gray-400 hover:text-gray-600 transition-colors" data-testid="footer-email">support@mydraft.io</a>
        </div>
      </div>
    </footer>
  );
}
