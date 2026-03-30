import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function DataProcessingAgreementPage() {
  useEffect(() => {
    document.title = "Data Processing Agreement | MyDraft";
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
          
          <h1 className="text-3xl font-semibold mb-2">Data Processing Agreement</h1>
          <p className="text-muted-foreground mb-8">Effective Date: January 16, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p>
                This Data Processing Agreement ("DPA") is incorporated into and forms part of the Terms of Service between MyDraft ("Processor" or "we") and you ("Controller" or "you"). This DPA sets forth the parties' obligations regarding the processing of personal data in connection with the provision of our email management services.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Definitions</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>"Personal Data":</strong> Any information relating to an identified or identifiable natural person</li>
                <li><strong>"Processing":</strong> Any operation performed on Personal Data, including collection, storage, use, disclosure, or deletion</li>
                <li><strong>"Data Subject":</strong> An identified or identifiable natural person whose Personal Data is processed</li>
                <li><strong>"Sub-processor":</strong> Any third party engaged by the Processor to process Personal Data on behalf of the Controller</li>
                <li><strong>"Applicable Data Protection Laws":</strong> All laws and regulations applicable to the processing of Personal Data, including GDPR, CCPA, and other relevant privacy legislation</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Scope of Processing</h2>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Categories of Data Subjects</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Users of the MyDraft service (Controller's employees or authorized users)</li>
                <li>Email correspondents of users (senders and recipients of emails processed through the Service)</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Types of Personal Data Processed</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Account information (email addresses, hashed passwords)</li>
                <li>Email metadata (sender, recipient, subject lines, timestamps)</li>
                <li>Email content (processed in real-time for service delivery and AI features)</li>
                <li>Usage data (feature interactions, session information)</li>
                <li>OAuth tokens (for email account connectivity)</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Purpose and Nature of Processing</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Providing email management and organization services</li>
                <li>Enabling AI-powered email drafting and assistance features</li>
                <li>Account authentication and session management</li>
                <li>Processing subscription payments</li>
                <li>Providing customer support</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Processor Obligations</h2>
              <p>The Processor agrees to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Process Personal Data only on documented instructions from the Controller, unless required by law</li>
                <li>Ensure that persons authorized to process Personal Data are bound by confidentiality obligations</li>
                <li>Implement appropriate technical and organizational security measures</li>
                <li>Assist the Controller in responding to Data Subject requests</li>
                <li>Assist the Controller in ensuring compliance with security, breach notification, and impact assessment obligations</li>
                <li>Delete or return all Personal Data upon termination, at the Controller's choice</li>
                <li>Make available all information necessary to demonstrate compliance with this DPA</li>
                <li>Allow for and contribute to audits conducted by the Controller or an authorized auditor</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Security Measures</h2>
              <p>We implement the following technical and organizational measures:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Encryption:</strong> TLS 1.3 for data in transit; AES-256 for sensitive data at rest</li>
                <li><strong>Access Controls:</strong> Role-based access, multi-factor authentication for administrative access</li>
                <li><strong>Authentication:</strong> Secure OAuth 2.0 for email account connections</li>
                <li><strong>Credential Security:</strong> Secure storage of tokens and credentials using industry-standard practices</li>
                <li><strong>Monitoring:</strong> Security event logging and monitoring</li>
                <li><strong>Incident Response:</strong> Documented procedures for security incident handling</li>
                <li><strong>Personnel Security:</strong> Background checks and security training for personnel with data access</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Sub-processors</h2>
              <p>
                The Controller authorizes the Processor to engage the following sub-processors. We will notify the Controller of any intended changes to sub-processors, providing an opportunity to object.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full mt-4 border-collapse">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/10">
                      <th className="text-left py-2 pr-4 text-foreground">Sub-processor</th>
                      <th className="text-left py-2 pr-4 text-foreground">Purpose</th>
                      <th className="text-left py-2 text-foreground">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/5 dark:border-white/5">
                      <td className="py-2 pr-4">OpenAI</td>
                      <td className="py-2 pr-4">AI processing for email drafting and assistance features</td>
                      <td className="py-2">United States</td>
                    </tr>
                    <tr className="border-b border-black/5 dark:border-white/5">
                      <td className="py-2 pr-4">Stripe</td>
                      <td className="py-2 pr-4">Payment processing and subscription management</td>
                      <td className="py-2">United States</td>
                    </tr>
                    <tr className="border-b border-black/5 dark:border-white/5">
                      <td className="py-2 pr-4">Google (Gmail API)</td>
                      <td className="py-2 pr-4">Email API connectivity and synchronization</td>
                      <td className="py-2">United States</td>
                    </tr>
                    <tr className="border-b border-black/5 dark:border-white/5">
                      <td className="py-2 pr-4">Microsoft (Graph API)</td>
                      <td className="py-2 pr-4">Email API connectivity and synchronization</td>
                      <td className="py-2">United States</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. International Data Transfers</h2>
              <p>
                Personal Data may be transferred to and processed in countries outside the European Economic Area or the Controller's jurisdiction. For such transfers, we ensure appropriate safeguards are in place, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Standard Contractual Clauses approved by the European Commission</li>
                <li>Data processing agreements with sub-processors containing equivalent protections</li>
                <li>Compliance with applicable adequacy decisions</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Data Subject Rights</h2>
              <p>
                We will assist the Controller in fulfilling Data Subject requests regarding:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Access to Personal Data</li>
                <li>Rectification of inaccurate data</li>
                <li>Erasure of Personal Data</li>
                <li>Restriction of processing</li>
                <li>Data portability</li>
                <li>Objection to processing</li>
              </ul>
              <p className="mt-4">
                Requests from Data Subjects should be directed to support@mydraft.io for prompt handling.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Data Breach Notification</h2>
              <p>
                In the event of a Personal Data breach, we will:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Notify the Controller without undue delay, and in any event within 72 hours of becoming aware of the breach</li>
                <li>Provide information about the nature of the breach, categories and approximate number of Data Subjects affected, likely consequences, and measures taken or proposed to address the breach</li>
                <li>Cooperate with the Controller in investigating and remediating the breach</li>
                <li>Document all Personal Data breaches, including facts, effects, and remedial actions</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Term and Termination</h2>
              <p>
                This DPA remains in effect for the duration of the Controller's use of the Service. Upon termination:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>We will delete or return all Personal Data within 30 days, at the Controller's election</li>
                <li>We will provide certification of deletion upon request</li>
                <li>We may retain Personal Data only as required by applicable law, with continued confidentiality obligations</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Information</h2>
              <p>
                For questions regarding this DPA or to exercise data protection rights, please contact:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> support@mydraft.io
              </p>
            </section>
          </div>
        </div>
      </div>
      
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
            <p className="text-sm text-muted-foreground/50">© 2026 MyDraft. All rights reserved.</p>
            <a href="mailto:support@mydraft.io" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
