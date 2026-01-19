import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function AcceptableUsePolicyPage() {
  useEffect(() => {
    document.title = "Acceptable Use Policy | MyDraft";
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
          
          <h1 className="text-3xl font-semibold mb-2">Acceptable Use Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 16, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Purpose</h2>
              <p>
                This Acceptable Use Policy ("AUP") outlines the rules and guidelines for using MyDraft's email management service. By using our Service, you agree to comply with this policy.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Prohibited Activities</h2>
              <p>You may not use MyDraft to:</p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Spam and Unsolicited Messages</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Send bulk unsolicited emails (spam)</li>
                <li>Send messages to purchased or harvested email lists</li>
                <li>Use deceptive subject lines or false header information</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Illegal Activities</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Engage in any activity that violates applicable laws</li>
                <li>Facilitate fraud, phishing, or identity theft</li>
                <li>Distribute malware, viruses, or harmful code</li>
                <li>Infringe on intellectual property rights</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Harmful Content</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Send threatening, harassing, or abusive messages</li>
                <li>Distribute content that promotes violence or discrimination</li>
                <li>Share illegal or harmful content</li>
                <li>Impersonate others or misrepresent your identity</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">System Abuse</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Attempt to circumvent security measures</li>
                <li>Overload or interfere with our systems</li>
                <li>Access accounts or data without authorization</li>
                <li>Reverse engineer or exploit the Service</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. AI Feature Usage</h2>
              <p>When using AI-powered features, you must:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Review and take responsibility for AI-generated content before sending</li>
                <li>Not use AI to generate harmful, deceptive, or illegal content</li>
                <li>Not attempt to jailbreak or misuse AI capabilities</li>
                <li>Respect rate limits and fair usage guidelines</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Account Responsibilities</h2>
              <p>You are responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Maintaining the security of your account</li>
                <li>All activities that occur under your account</li>
                <li>Ensuring authorized users comply with this policy</li>
                <li>Promptly reporting any security breaches</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Enforcement</h2>
              <p>
                Violations of this policy may result in:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Warning and request for corrective action</li>
                <li>Temporary suspension of your account</li>
                <li>Permanent termination of your account</li>
                <li>Legal action if warranted</li>
              </ul>
              <p className="mt-4">
                We reserve the right to determine what constitutes a violation and take appropriate action at our discretion.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Reporting Violations</h2>
              <p>
                If you become aware of any violations of this policy, please report them to abuse@draft.com. We take all reports seriously and will investigate promptly.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Changes to This Policy</h2>
              <p>
                We may update this Acceptable Use Policy from time to time. Continued use of the Service after changes constitutes acceptance of the updated policy.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact</h2>
              <p>
                For questions about this policy, please contact us at legal@draft.com.
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
            <p className="text-sm text-muted-foreground/50">© 2024 MyDraft. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
