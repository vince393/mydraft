import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = "Privacy Policy | MyDraft";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Button>
          </Link>
          
          <h1 className="text-3xl font-semibold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Effective Date: January 16, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p>
                MyDraft ("we," "our," or "us") operates an AI-powered email management platform designed for professionals and businesses. This Privacy Policy describes how we collect, use, protect, and share information when you use our services. By using MyDraft, you consent to the practices described in this policy.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Process</h2>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Account Information</h3>
              <p>
                When you create an account, we collect your email address and store a securely hashed version of your password. We never store passwords in plain text.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Email Access</h3>
              <p>
                When you connect your email account through OAuth, we receive authorized access to display your emails within our interface and to power AI-assisted features. Email content is processed in real-time to provide our services and is not permanently stored on our servers beyond what is necessary for service delivery.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Usage Analytics</h3>
              <p>
                We collect anonymized data about how you interact with our platform, including feature usage patterns and session information. This data helps us improve our services and user experience.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Payment Information</h3>
              <p>
                All payment processing is handled by Stripe, a PCI-compliant payment processor. We do not receive, store, or have access to your complete credit card number, CVV, or other sensitive payment credentials.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
              <p>We use the information we process to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Provide, maintain, and improve our email management services</li>
                <li>Power AI-assisted features such as draft generation and email organization</li>
                <li>Process subscription payments and manage your account</li>
                <li>Send transactional communications related to your account and service</li>
                <li>Ensure the security and integrity of our platform</li>
                <li>Respond to support inquiries and resolve issues</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Sharing and Disclosure</h2>
              <p>
                We do not sell, rent, or trade your personal information to third parties. We may share data only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Service Providers:</strong> We work with trusted third-party providers who assist in delivering our services, including Stripe for payment processing, OpenAI for AI features, and Nylas for email connectivity. These providers are contractually bound to protect your data.</li>
                <li><strong>Legal Compliance:</strong> We may disclose information when required by law, court order, or government request, or when necessary to protect our rights, safety, or property.</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Encryption of data in transit using TLS 1.3</li>
                <li>Encryption of sensitive data at rest using AES-256</li>
                <li>Secure OAuth-based authentication for email account connections</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication requirements for our systems</li>
              </ul>
              <p className="mt-4">
                While we strive to protect your information, no method of electronic transmission or storage is completely secure. We cannot guarantee absolute security but are committed to maintaining the highest standards of data protection.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Retention</h2>
              <p>
                We retain your account information for as long as your account remains active. Email content is processed in real-time and is not permanently stored beyond what is necessary for service delivery. Upon account deletion, we will remove your personal data from our systems within 30 days, except where retention is required by law.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Rights</h2>
              <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                <li><strong>Disconnection:</strong> Revoke email account access at any time through your account settings</li>
                <li><strong>Objection:</strong> Object to certain types of data processing</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, please contact us at support@mydraft.io.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Age Requirement</h2>
              <p>
                MyDraft is a professional email management tool designed for business use. Our service is intended for users who are at least 18 years of age. We do not market to, target, or knowingly accept registrations from individuals under 18. If we become aware that an account has been created by someone under 18, we will take steps to terminate that account.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. International Data Transfers</h2>
              <p>
                Your information may be processed in countries other than your country of residence, including the United States. We ensure that appropriate safeguards are in place for such transfers, including Standard Contractual Clauses where applicable under GDPR.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Updates to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes by posting the updated policy on our website with a new effective date. Your continued use of our services after such changes constitutes acceptance of the updated policy.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
              <p>
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> support@mydraft.io
              </p>
            </section>
          </div>
        </div>
      </div>
      
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
            <p className="text-sm text-muted-foreground/50">© 2026 MyDraft. All rights reserved.</p>
            <a href="mailto:support@mydraft.io" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
