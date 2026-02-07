import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function CookiePolicyPage() {
  useEffect(() => {
    document.title = "Cookie Policy | MyDraft";
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
          <p className="text-muted-foreground mb-8">Effective Date: January 16, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. What Are Cookies</h2>
              <p>
                Cookies are small text files stored on your device when you visit a website. They serve various purposes, including maintaining your session, remembering preferences, and helping websites function properly. This policy explains how MyDraft uses cookies and similar technologies.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Cookies</h2>
              <p>MyDraft uses cookies for the following purposes:</p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Essential Cookies</h3>
              <p>These cookies are necessary for the Service to function and cannot be disabled:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Session Management:</strong> Maintain your authenticated session as you navigate the platform</li>
                <li><strong>Security:</strong> Protect against cross-site request forgery and other security threats</li>
                <li><strong>Preference Storage:</strong> Remember your display preferences (e.g., theme selection)</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Functional Cookies</h3>
              <p>These cookies enhance your experience by remembering choices you make:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Language preferences</li>
                <li>Display settings and layout preferences</li>
                <li>Previously selected options</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Cookies We Use</h2>
              <div className="overflow-x-auto">
                <table className="w-full mt-4 border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 pr-4 text-foreground">Cookie Name</th>
                      <th className="text-left py-2 pr-4 text-foreground">Purpose</th>
                      <th className="text-left py-2 pr-4 text-foreground">Type</th>
                      <th className="text-left py-2 text-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-4">connect.sid</td>
                      <td className="py-2 pr-4">Session authentication and management</td>
                      <td className="py-2 pr-4">Essential</td>
                      <td className="py-2">7 days</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-4">theme</td>
                      <td className="py-2 pr-4">Stores dark/light mode preference</td>
                      <td className="py-2 pr-4">Functional</td>
                      <td className="py-2">1 year</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-4">csrf_token</td>
                      <td className="py-2 pr-4">Security protection against CSRF attacks</td>
                      <td className="py-2 pr-4">Essential</td>
                      <td className="py-2">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Third-Party Cookies</h2>
              <p>
                We use Stripe as our payment processor, which may set cookies for payment processing and fraud prevention. These cookies are governed by Stripe's privacy policy.
              </p>
              <p className="mt-4">
                <strong>Important:</strong> MyDraft does not use advertising cookies, tracking cookies for marketing purposes, or social media cookies. We do not sell or share cookie data with third parties for advertising purposes.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Managing Cookies</h2>
              <p>
                You can control and manage cookies through your browser settings. Most browsers allow you to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>View cookies stored on your device</li>
                <li>Delete all or specific cookies</li>
                <li>Block cookies from specific or all websites</li>
                <li>Set preferences for cookie acceptance</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Browser-Specific Instructions</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                <li><strong>Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies</li>
              </ul>
              
              <p className="mt-4">
                <strong>Note:</strong> Disabling essential cookies will prevent the Service from functioning correctly. You may not be able to log in or use core features with essential cookies disabled.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Do Not Track Signals</h2>
              <p>
                MyDraft does not track users across third-party websites. We respect Do Not Track signals, although our service functions the same way regardless of this setting since we do not engage in cross-site tracking.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in our practices or for legal compliance. Updates will be posted on this page with a revised effective date.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact Us</h2>
              <p>
                If you have questions about our use of cookies, please contact us:
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
