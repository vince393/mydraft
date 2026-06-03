import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarketingNav } from "@/components/marketing-nav";
import { Seo } from "@/components/seo";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Shield,
  Lock,
  Eye,
  Server,
  Key,
  CheckCircle,
  Mail,
  FileCheck,
  Users,
  ShieldCheck,
  Award,
  Loader2,
  Send,
  Database,
  Fingerprint,
  Activity,
  FileWarning,
} from "lucide-react";

interface AuthResponse {
  user: { id: string; plan?: string; onboardingCompleted?: boolean; emailConnected?: boolean } | null;
}

export default function SecurityPage() {
  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  const { toast } = useToast();

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "Security Inquiry",
    message: "",
  });
  const [showContactForm, setShowContactForm] = useState(false);

  const contactMutation = useMutation({
    mutationFn: async (data: typeof contactForm) => {
      return apiRequest("POST", "/api/support/contact", data);
    },
    onSuccess: () => {
      toast({ title: "Message sent", description: "Our security team will get back to you within 24 hours." });
      setContactForm({ name: "", email: "", subject: "Security Inquiry", message: "" });
      setShowContactForm(false);
    },
    onError: () => {
      toast({ title: "Failed to send message", description: "Please try again or email support@mydraft.io directly.", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Security & Privacy — Encryption & CASA Compliant | MyDraft"
        description="MyDraft protects your email with AES-256 encryption, read-only access, audit logging, and Google CASA-approved security. Your data stays private."
        path="/security"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://mydraft.io/" },
            { "@type": "ListItem", position: 2, name: "Security", item: "https://mydraft.io/security" },
          ],
        }}
      />
      <MarketingNav />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6" data-testid="badge-security">Security</Badge>
          <h1 className="text-4xl md:text-5xl font-semibold mb-6">
            Your privacy is our priority
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We built MyDraft with security-first principles. Your emails are yours - 
            we're here to help you manage them better, not monetize your data.
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-green-500/20 bg-green-500/[0.04] p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Award className="w-8 h-8 text-green-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xl font-semibold" data-testid="text-casa-title">CASA Tier 2 Approved</h2>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid="badge-casa">Google Approved</Badge>
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  MyDraft has passed Google's Cloud Application Security Assessment (CASA) Tier 2 and received 
                  a Letter of Validation (LOV). This is the security standard required by Google for applications 
                  that access user data through OAuth scopes, covering data handling, authentication, encryption, 
                  and vulnerability management. Our assessment has been independently verified and approved by Google.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Database className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Data Classification</p>
                      <p className="text-xs text-muted-foreground">4-tier classification system (Restricted, Confidential, Internal, Public)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Lock className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Encryption at Rest</p>
                      <p className="text-xs text-muted-foreground">AES-256-GCM for email content, scrypt for passwords</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Fingerprint className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Authentication Security</p>
                      <p className="text-xs text-muted-foreground">Rate limiting, session management, OAuth state validation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Activity className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Audit Logging</p>
                      <p className="text-xs text-muted-foreground">Login attempts, data access, and security events tracked</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileWarning className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Malware Protection</p>
                      <p className="text-xs text-muted-foreground">File type blocking, SVG sanitization, attachment scanning</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">XSS Prevention</p>
                      <p className="text-xs text-muted-foreground">Input sanitization, DOMPurify, Content Security Policy</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SecurityCard
              icon={<Key className="w-6 h-6" />}
              title="OAuth-only authentication"
              description="We never see or store your email password. Authentication happens directly with your email provider using secure OAuth 2.0."
            />
            <SecurityCard
              icon={<Eye className="w-6 h-6" />}
              title="Minimal permissions"
              description="We only request the permissions needed to provide our service. Read, send, and organize - nothing more."
            />
            <SecurityCard
              icon={<Server className="w-6 h-6" />}
              title="No email storage"
              description="Your emails stay with your provider. We process content in real-time for AI features but don't retain copies."
            />
            <SecurityCard
              icon={<Lock className="w-6 h-6" />}
              title="Encryption everywhere"
              description="All data is encrypted in transit (TLS 1.3) and at rest (AES-256). API keys and tokens are stored in secure vaults."
            />
            <SecurityCard
              icon={<Users className="w-6 h-6" />}
              title="No data selling"
              description="Your data is never sold to advertisers or third parties. Ever. Our business model is subscriptions, not surveillance."
            />
            <SecurityCard
              icon={<FileCheck className="w-6 h-6" />}
              title="Regular audits"
              description="We conduct regular security assessments and penetration testing to identify and address vulnerabilities."
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-8 text-center">How we protect your data</h2>
          <div className="space-y-6">
            <DetailSection
              title="Authentication & Access"
              items={[
                "OAuth 2.0 authentication with Google and Microsoft - we never see your password",
                "Session tokens are short-lived and automatically refreshed",
                "All API requests require authentication and are rate-limited",
                "Failed login attempts are monitored and blocked after repeated failures"
              ]}
            />
            <DetailSection
              title="Data Processing"
              items={[
                "Email content is processed in memory for AI features and not persisted",
                "AI models run on isolated infrastructure with no data retention",
                "We don't use your emails to train AI models",
                "Metadata (sender, subject, timestamps) is cached briefly for performance"
              ]}
            />
            <DetailSection
              title="Infrastructure"
              items={[
                "Hosted on enterprise-grade cloud infrastructure with 99.9% uptime SLA",
                "All services run in isolated containers with strict network policies",
                "Database connections are encrypted and access-controlled",
                "Regular automated backups with point-in-time recovery"
              ]}
            />
            <DetailSection
              title="Compliance & Transparency"
              items={[
                "CASA Tier 2 approved by Google with Letter of Validation (LOV)",
                "GDPR compliant - request data export or deletion anytime",
                "Clear privacy policy with no hidden terms",
                "Transparent about what data we collect and why",
                "You can disconnect your account and delete all data at any time"
              ]}
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-8 text-center">Frequently asked security questions</h2>
          <div className="space-y-4">
            <FAQItem 
              q="Do you read my emails?" 
              a="Our AI processes your emails to generate summaries and draft replies, but this happens in real-time and content is not stored. We don't have human employees reading your emails, and we don't use your data for advertising." 
            />
            <FAQItem 
              q="Can MyDraft employees see my emails?" 
              a="No. Our systems are designed so that employee access to user data is extremely limited and fully audited. Customer support cannot view your email content." 
            />
            <FAQItem 
              q="What happens if I delete my account?" 
              a="All your data is permanently deleted within 30 days, including any cached metadata, preferences, and session data. Email content itself is never stored by us, so there's nothing to delete." 
            />
            <FAQItem 
              q="Is my data used to train AI?" 
              a="No. Your email content is never used to train or improve AI models. The AI features use pre-trained models that process your content in real-time without retention." 
            />
            <FAQItem 
              q="What is CASA Tier 2?" 
              a="CASA (Cloud Application Security Assessment) is Google's security framework for apps that access user data via OAuth. Tier 2 requires verified security controls including encryption, access management, vulnerability handling, and audit logging. MyDraft has been independently assessed, approved by Google, and issued a Letter of Validation (LOV) confirming our compliance." 
            />
            <FAQItem 
              q="How do I report a security issue?" 
              a="We take security reports seriously. Use the contact form below or email support@mydraft.io with any concerns or potential vulnerabilities. We respond within 24 hours." 
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-border/30" id="contact">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">
            Questions about security?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            We're happy to discuss our security practices in more detail. 
            Enterprise customers can request a security review.
          </p>

          {!showContactForm ? (
            <Button
              size="lg"
              className="gap-2"
              onClick={() => setShowContactForm(true)}
              data-testid="button-contact-security"
            >
              <Mail className="w-4 h-4" />
              Contact security team
            </Button>
          ) : (
            <div className="max-w-md mx-auto text-left">
              <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] backdrop-blur-sm p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your name</label>
                  <Input
                    placeholder="Jane Smith"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    data-testid="input-security-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your email</label>
                  <Input
                    type="email"
                    placeholder="jane@company.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    data-testid="input-security-email"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="Security question"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    data-testid="input-security-subject"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Describe your security question or concern..."
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    data-testid="input-security-message"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => contactMutation.mutate(contactForm)}
                    disabled={!contactForm.name || !contactForm.email || !contactForm.message || contactMutation.isPending}
                    data-testid="button-send-security-message"
                  >
                    {contactMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send message
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowContactForm(false)}
                    data-testid="button-cancel-security-contact"
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  We typically respond within 24 hours
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function SecurityCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="bg-card/30 border-border/50">
      <CardContent className="pt-6">
        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4 text-green-500">
          {icon}
        </div>
        <h3 className="font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function DetailSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-6 rounded-xl border border-border/50 bg-card/30">
      <h3 className="font-medium mb-4">{title}</h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="p-4 rounded-lg border border-border/50 bg-card/30">
      <h4 className="font-medium mb-2">{q}</h4>
      <p className="text-sm text-muted-foreground">{a}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-black/[0.04] dark:border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6">
          <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms</Link>
          <Link href="/cookies" className="hover:text-foreground transition-colors" data-testid="footer-link-cookies">Cookies</Link>
          <Link href="/acceptable-use" className="hover:text-foreground transition-colors" data-testid="footer-link-aup">Acceptable Use</Link>
          <Link href="/dpa" className="hover:text-foreground transition-colors" data-testid="footer-link-dpa">DPA</Link>
          <Link href="/ai-policy" className="hover:text-foreground transition-colors" data-testid="footer-link-ai">AI Policy</Link>
          <Link href="/refund-policy" className="hover:text-foreground transition-colors" data-testid="footer-link-refund">Refunds</Link>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground/50">&copy; 2026 MyDraft. All rights reserved.</p>
          <a href="mailto:support@mydraft.io" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
        </div>
      </div>
    </footer>
  );
}
