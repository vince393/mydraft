import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Send, 
  CheckCircle2, 
  Loader2,
  BookOpen,
  Inbox,
  Sparkles,
  CreditCard,
  Shield,
  HelpCircle,
  Mail
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: <BookOpen className="w-5 h-5" />,
    items: [
      {
        question: "How do I create an account?",
        answer: "Click 'Get Started' on the homepage, enter your email and create a password. You'll then choose a plan and complete a quick onboarding to set up your AI preferences."
      },
      {
        question: "How do I connect my email account?",
        answer: "After completing onboarding, you'll be prompted to connect your email. We support Gmail and Microsoft Outlook. Click the provider you use and authorize MyDraft to access your inbox securely via OAuth."
      },
      {
        question: "Is there a free trial?",
        answer: "Yes! Pro and Business plans include a 14-day free trial. Add a card to start your trial - you won't be charged until day 15. Cancel anytime."
      },
      {
        question: "What email providers do you support?",
        answer: "We currently support Gmail (Google Workspace) and Microsoft Outlook (Office 365 and personal accounts). More providers will be added in the future."
      }
    ]
  },
  {
    id: "inbox",
    title: "Inbox & Email",
    icon: <Inbox className="w-5 h-5" />,
    items: [
      {
        question: "How do I organize my emails?",
        answer: "Use the sidebar to navigate between Inbox, Starred, Sent, Archive, and Trash. You can star important emails, archive ones you want to keep but remove from your inbox, and delete unwanted messages."
      },
      {
        question: "Can I compose new emails?",
        answer: "Yes! Click the 'Compose' button in the sidebar to write a new email. You can add recipients, subject, and format your message with the rich text editor."
      },
      {
        question: "How do Reply, Reply All, and Forward work?",
        answer: "When viewing an email, use the action buttons to Reply (respond to sender only), Reply All (respond to all recipients), or Forward (send to a new recipient). The original message is included for context."
      },
      {
        question: "How do I select multiple emails?",
        answer: "Press and hold on an email to enter selection mode, then tap additional emails to select them. You can then archive or delete multiple emails at once using the action buttons."
      }
    ]
  },
  {
    id: "ai",
    title: "AI Features",
    icon: <Sparkles className="w-5 h-5" />,
    items: [
      {
        question: "How does AI reply generation work?",
        answer: "When viewing an email, click the AI button to generate a reply draft. Our AI analyzes the email context and your preferences to craft a professional response in your voice."
      },
      {
        question: "Can I customize my AI writing style?",
        answer: "Yes! During onboarding, you set your preferred tone (professional, casual, or friendly) and communication style. You can update these preferences anytime in Settings."
      },
      {
        question: "How accurate are AI-generated replies?",
        answer: "AI drafts are designed as starting points. We recommend reviewing and editing before sending. The AI learns from your preferences to improve suggestions over time."
      },
      {
        question: "What AI model do you use?",
        answer: "We use advanced language models from OpenAI to power our AI features. Your email content is processed securely and never used to train AI models."
      }
    ]
  },
  {
    id: "billing",
    title: "Billing & Plans",
    icon: <CreditCard className="w-5 h-5" />,
    items: [
      {
        question: "What plans are available?",
        answer: "We offer three plans: Free (basic features, limited AI replies), Pro ($12/month for unlimited AI and priority support), and Business ($29/month for teams with advanced features)."
      },
      {
        question: "How do I upgrade my plan?",
        answer: "Go to Settings or click your profile menu and select 'Manage Subscription'. Choose your new plan and complete the payment process."
      },
      {
        question: "Can I cancel anytime?",
        answer: "Yes, you can cancel your subscription at any time. You'll continue to have access to your current plan until the end of your billing period."
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. All payments are processed securely through Stripe."
      }
    ]
  },
  {
    id: "security",
    title: "Security & Privacy",
    icon: <Shield className="w-5 h-5" />,
    items: [
      {
        question: "Is my email data secure?",
        answer: "Absolutely. We use bank-level encryption (AES-256) for data at rest and TLS 1.3 for data in transit. We never store your email passwords - only secure OAuth tokens."
      },
      {
        question: "Do you read or store my emails?",
        answer: "We access emails only to display them in MyDraft and to power AI features. Email content is processed in memory and not permanently stored beyond caching for performance."
      },
      {
        question: "Can I disconnect my email account?",
        answer: "Yes. Go to Settings > Connected Accounts and click 'Disconnect'. This revokes our access to your email and deletes all cached data."
      },
      {
        question: "How do I delete my account?",
        answer: "Go to Profile > Danger Zone and click 'Delete Account'. This permanently removes your account, preferences, and all associated data."
      }
    ]
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const contactMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; message: string }) => {
      await apiRequest("POST", "/api/support/contact", data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return faqSections;

    const query = searchQuery.toLowerCase();
    return faqSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.question.toLowerCase().includes(query) ||
            item.answer.toLowerCase().includes(query)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery]);

  const totalResults = filteredSections.reduce((acc, section) => acc + section.items.length, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    contactMutation.mutate({
      name: contactName,
      email: contactEmail,
      message: contactMessage,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      
      <main className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <HelpCircle className="w-3.5 h-3.5" />
              Help Center
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              How can we help you?
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Search our knowledge base or browse topics below to find answers to your questions.
            </p>
          </div>

          <div className="relative max-w-xl mx-auto mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-12 text-base bg-card/50 border-white/10 focus:border-primary/50"
              data-testid="input-search-help"
            />
            {searchQuery && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {totalResults} result{totalResults !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {filteredSections.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try different keywords or contact support below.
              </p>
            </div>
          ) : (
            <div className="space-y-6 mb-16">
              {filteredSections.map((section) => (
                <Card key={section.id} className="bg-card/30 border-white/[0.08]">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {section.icon}
                      </div>
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {section.items.map((item, index) => (
                        <AccordionItem 
                          key={index} 
                          value={`${section.id}-${index}`}
                          className="border-white/[0.06]"
                        >
                          <AccordionTrigger 
                            className="text-left hover:no-underline py-4 text-sm font-medium"
                            data-testid={`faq-${section.id}-${index}`}
                          >
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="bg-gradient-to-br from-card/50 to-card/30 border-white/[0.08]">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-xl">Still need help?</CardTitle>
              <p className="text-muted-foreground text-sm mt-2">
                Our support team is here to assist you. Send us a message and we'll get back to you as soon as possible.
              </p>
            </CardHeader>
            <CardContent className="max-w-md mx-auto pt-4">
              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Message sent!</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    We've received your message and will respond within 24 hours.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsSubmitted(false)}
                    data-testid="button-send-another"
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your name"
                      className="bg-background/50 border-white/10"
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="bg-background/50 border-white/10"
                      data-testid="input-contact-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="How can we help you?"
                      rows={4}
                      className="bg-background/50 border-white/10 resize-none"
                      data-testid="input-contact-message"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full gap-2"
                    disabled={contactMutation.isPending}
                    data-testid="button-submit-contact"
                  >
                    {contactMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-white/[0.06] py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors" data-testid="footer-link-cookies">Cookies</Link>
            <Link href="/acceptable-use" className="hover:text-foreground transition-colors" data-testid="footer-link-aup">Acceptable Use</Link>
            <Link href="/dpa" className="hover:text-foreground transition-colors" data-testid="footer-link-dpa">DPA</Link>
            <Link href="/ai-policy" className="hover:text-foreground transition-colors" data-testid="footer-link-ai">AI Policy</Link>
            <Link href="/refund-policy" className="hover:text-foreground transition-colors" data-testid="footer-link-refund">Refunds</Link>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} MyDraft. All rights reserved.</p>
            <a href="mailto:support@mydraft.io" className="hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
