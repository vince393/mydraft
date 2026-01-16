import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function CookiePolicyPage() {
  useEffect(() => {
    document.title = "Cookie Policy | Draft";
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
          
          <h1 className="text-3xl font-semibold mb-2">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. What Are Cookies</h2>
              <p>
                Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to the site owners.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Cookies</h2>
              <p>Draft uses cookies for the following purposes:</p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Essential Cookies</h3>
              <p>These cookies are necessary for the Service to function properly. They include:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Session cookies:</strong> To keep you logged in during your session</li>
                <li><strong>Security cookies:</strong> To protect against fraudulent activity</li>
                <li><strong>Preference cookies:</strong> To remember your settings and preferences</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Analytics Cookies</h3>
              <p>We may use analytics cookies to understand how visitors interact with our Service. This helps us improve our Service.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Types of Cookies We Use</h2>
              <div className="overflow-x-auto">
                <table className="w-full mt-4 border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 pr-4 text-foreground">Cookie Name</th>
                      <th className="text-left py-2 pr-4 text-foreground">Purpose</th>
                      <th className="text-left py-2 text-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-4">connect.sid</td>
                      <td className="py-2 pr-4">Session management</td>
                      <td className="py-2">7 days</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-4">theme</td>
                      <td className="py-2 pr-4">Remembers dark/light mode preference</td>
                      <td className="py-2">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Third-Party Cookies</h2>
              <p>
                We use Stripe for payment processing, which may set its own cookies. These cookies are governed by Stripe's privacy policy. We do not use advertising or tracking cookies from third parties.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Managing Cookies</h2>
              <p>
                Most web browsers allow you to control cookies through their settings. You can usually find these settings in your browser's "Options" or "Preferences" menu. Note that disabling essential cookies may prevent the Service from functioning properly.
              </p>
              <p className="mt-2">You can manage cookies in:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Chrome: Settings → Privacy and security → Cookies</li>
                <li>Firefox: Settings → Privacy & Security → Cookies</li>
                <li>Safari: Preferences → Privacy → Cookies</li>
                <li>Edge: Settings → Cookies and site permissions</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Changes to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Contact Us</h2>
              <p>
                If you have questions about our use of cookies, please contact us at privacy@draft.com.
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
