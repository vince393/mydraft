import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingNav } from "@/components/marketing-nav";
import { useQuery } from "@tanstack/react-query";
import { 
  Shield, 
  Lock,
  Eye,
  Server,
  Key,
  CheckCircle,
  ArrowRight,
  Mail,
  FileCheck,
  Users,
  AlertTriangle
} from "lucide-react";

interface AuthResponse {
  user: { id: string; plan?: string; onboardingCompleted?: boolean; emailConnected?: boolean } | null;
}

export default function SecurityPage() {
  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const getStartedHref = () => {
    if (!authData?.user) return "/login";
    if (!authData.user.plan) return "/select-plan";
    if (!authData.user.onboardingCompleted) return "/onboarding";
    if (!authData.user.emailConnected) return "/connect-email";
    return "/inbox";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">Security</Badge>
          <h1 className="text-4xl md:text-5xl font-semibold mb-6">
            Your privacy is our priority
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We built MyDraft with security-first principles. Your emails are yours - 
            we're here to help you manage them better, not monetize your data.
          </p>
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
              q="How do I report a security issue?" 
              a="We take security reports seriously. Please email security@mailflow.com with any concerns or potential vulnerabilities. We respond within 24 hours." 
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-border/30">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">
            Questions about security?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            We're happy to discuss our security practices in more detail. 
            Enterprise customers can request a security review or SOC 2 report.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={getStartedHref()}>
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Contact security team
            </Button>
          </div>
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
    <footer className="py-12 px-6 border-t border-white/[0.04]">
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
          <p className="text-sm text-muted-foreground/50">© 2024 MyDraft. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <a href="mailto:support@mydraft.io" className="hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
            <a href="tel:+16197757982" className="hover:text-foreground transition-colors" data-testid="footer-phone">+1 (619) 775-7982</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
