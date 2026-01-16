import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function DataProcessingAgreementPage() {
  useEffect(() => {
    document.title = "Data Processing Agreement | Draft";
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
          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p>
                This Data Processing Agreement ("DPA") forms part of the Terms of Service between Draft ("Processor") and you ("Controller") regarding the processing of personal data in connection with our email management service.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Definitions</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>"Personal Data":</strong> Any information relating to an identified or identifiable natural person</li>
                <li><strong>"Processing":</strong> Any operation performed on Personal Data</li>
                <li><strong>"Data Subject":</strong> An identified or identifiable natural person</li>
                <li><strong>"Sub-processor":</strong> Any third party engaged by the Processor to process Personal Data</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Scope of Processing</h2>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Categories of Data Subjects</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Users of the Draft service</li>
                <li>Email correspondents of users</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Types of Personal Data</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email addresses</li>
                <li>Email content (processed in real-time, not stored)</li>
                <li>Account information</li>
                <li>Usage data</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Purpose of Processing</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Providing email management services</li>
                <li>AI-powered email drafting and suggestions</li>
                <li>Account management and authentication</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Processor Obligations</h2>
              <p>The Processor shall:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Process Personal Data only on documented instructions from the Controller</li>
                <li>Ensure persons authorized to process data are bound by confidentiality</li>
                <li>Implement appropriate technical and organizational security measures</li>
                <li>Assist the Controller with Data Subject requests</li>
                <li>Delete or return all Personal Data upon termination</li>
                <li>Make available information necessary to demonstrate compliance</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Security Measures</h2>
              <p>We implement the following security measures:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Encryption of data in transit (TLS 1.3) and at rest (AES-256)</li>
                <li>Access controls and authentication requirements</li>
                <li>Regular security assessments</li>
                <li>Secure OAuth-based email account connections</li>
                <li>Secure storage of tokens and credentials</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Sub-processors</h2>
              <p>We use the following sub-processors:</p>
              <div className="overflow-x-auto">
                <table className="w-full mt-4 border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 pr-4 text-foreground">Sub-processor</th>
                      <th className="text-left py-2 pr-4 text-foreground">Purpose</th>
                      <th className="text-left py-2 text-foreground">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-4">OpenAI</td>
                      <td className="py-2 pr-4">AI processing for email drafting</td>
                      <td className="py-2">USA</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-4">Stripe</td>
                      <td className="py-2 pr-4">Payment processing</td>
                      <td className="py-2">USA</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-4">Nylas</td>
                      <td className="py-2 pr-4">Email API connectivity</td>
                      <td className="py-2">USA</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Transfers</h2>
              <p>
                Personal Data may be transferred to and processed in countries outside of the European Economic Area. We ensure appropriate safeguards are in place for such transfers, including Standard Contractual Clauses where applicable.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Data Subject Rights</h2>
              <p>
                We will assist you in responding to Data Subject requests for access, rectification, erasure, data portability, or objection to processing. Requests should be directed to privacy@draft.com.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Data Breach Notification</h2>
              <p>
                In the event of a personal data breach, we will notify you without undue delay (and in any event within 72 hours) after becoming aware of the breach, providing information about the nature and consequences of the breach.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Term and Termination</h2>
              <p>
                This DPA remains in effect for the duration of your use of the Service. Upon termination, we will delete or return all Personal Data as requested, subject to legal retention requirements.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact</h2>
              <p>
                For questions about this DPA or to exercise your rights, please contact us at privacy@draft.com.
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
          <div className="text-center">
            <p className="text-sm text-muted-foreground/50">© 2024 Draft. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
