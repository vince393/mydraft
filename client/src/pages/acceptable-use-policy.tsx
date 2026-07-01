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
          <p className="text-muted-foreground mb-8">Effective Date: January 16, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Purpose</h2>
              <p>
                This Acceptable Use Policy ("AUP") establishes rules and guidelines governing the use of MyDraft's email management platform. This policy is designed to protect our users, our service, and the broader internet community. By using MyDraft, you agree to comply with this policy.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Prohibited Activities</h2>
              <p>The following activities are strictly prohibited when using MyDraft:</p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Spam and Unsolicited Communications</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Sending bulk unsolicited commercial or promotional emails</li>
                <li>Distributing messages to purchased, rented, or harvested email lists</li>
                <li>Using deceptive subject lines, falsified headers, or misleading sender information</li>
                <li>Engaging in any activity that violates the CAN-SPAM Act or similar regulations</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Illegal and Fraudulent Activities</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Conducting any activity that violates applicable laws or regulations</li>
                <li>Engaging in fraud, phishing, social engineering, or identity theft</li>
                <li>Distributing malware, ransomware, viruses, or other malicious code</li>
                <li>Infringing upon intellectual property rights, including copyrights and trademarks</li>
                <li>Facilitating money laundering or other financial crimes</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Harmful and Abusive Content</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Sending threatening, harassing, defamatory, or abusive communications</li>
                <li>Distributing content that promotes violence, discrimination, or hatred</li>
                <li>Sharing illegal, obscene, or exploitative material</li>
                <li>Impersonating individuals, organizations, or entities</li>
                <li>Engaging in stalking, bullying, or intimidation</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">System and Security Violations</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Attempting to circumvent authentication, security measures, or access controls</li>
                <li>Overwhelming our systems through excessive requests or denial-of-service attacks</li>
                <li>Accessing accounts, systems, or data without proper authorization</li>
                <li>Reverse engineering, decompiling, or attempting to extract source code</li>
                <li>Exploiting vulnerabilities or security flaws in our systems</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. AI Feature Guidelines</h2>
              <p>When utilizing AI-powered features, you must:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Review and take full responsibility for all AI-generated content before sending</li>
                <li>Refrain from using AI to generate harmful, deceptive, discriminatory, or illegal content</li>
                <li>Not attempt to manipulate, jailbreak, or circumvent AI safety measures</li>
                <li>Respect rate limits and fair usage guidelines for AI features</li>
                <li>Not use AI features to automate mass communications without proper consent</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Account Security Responsibilities</h2>
              <p>You are responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities conducted through your account, whether authorized or not</li>
                <li>Ensuring any authorized users of your account comply with this policy</li>
                <li>Promptly reporting any suspected security breaches or unauthorized access</li>
                <li>Using strong, unique passwords and enabling additional security measures when available</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Enforcement and Consequences</h2>
              <p>
                Violations of this policy may result in one or more of the following actions, at our sole discretion:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Written warning and request for immediate corrective action</li>
                <li>Temporary suspension of account access</li>
                <li>Permanent termination of your account without refund</li>
                <li>Reporting to relevant law enforcement authorities</li>
                <li>Civil or legal action to recover damages</li>
              </ul>
              <p className="mt-4">
                We reserve the right to determine what constitutes a violation of this policy and to take appropriate action without prior notice when necessary to protect our service and users.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Reporting Violations</h2>
              <p>
                If you become aware of any violations of this policy or suspect abuse of our platform, please report it immediately to support@mydraft.io. We take all reports seriously, investigate promptly, and maintain confidentiality to the extent possible.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Policy Updates</h2>
              <p>
                We may update this Acceptable Use Policy from time to time to address new threats, clarify guidelines, or reflect changes in our service. Material changes will be communicated through our platform. Your continued use of the Service after such updates constitutes acceptance of the revised policy.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact Information</h2>
              <p>
                For questions regarding this policy or to report violations, please contact us:
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
            <Link href="/dmca" className="hover:text-foreground transition-colors" data-testid="footer-link-dmca">Copyright / DMCA</Link>
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
