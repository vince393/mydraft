import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function RefundPolicyPage() {
  useEffect(() => {
    document.title = "Refund and Billing Policy | Draft";
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
          
          <h1 className="text-3xl font-semibold mb-2">Refund and Billing Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 16, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Subscription Plans</h2>
              <p>Draft offers the following subscription plans:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Free:</strong> $0 - Basic email management features</li>
                <li><strong>Pro:</strong> $24/month or $199/year - Advanced AI features</li>
                <li><strong>Business:</strong> $49/month or $399/year - Enterprise features</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Free Trial</h2>
              <p>
                Pro and Business plans include a <strong>14-day free trial</strong>. During the trial:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>You'll have full access to all plan features</li>
                <li>A valid payment method is required to start the trial</li>
                <li>You will not be charged during the trial period</li>
                <li>You can cancel anytime before the trial ends to avoid charges</li>
                <li>If you don't cancel, your subscription will automatically begin on day 15</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Billing</h2>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Billing Cycle</h3>
              <p>
                Subscriptions are billed at the start of each billing period (monthly or annually). Your billing date is based on when you subscribed.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Payment Methods</h3>
              <p>
                We accept major credit cards and debit cards. All payments are processed securely through Stripe. We do not store your full card details on our servers.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Failed Payments</h3>
              <p>
                If a payment fails, we'll notify you and attempt to charge your card again. After multiple failed attempts, your subscription may be suspended until payment is successful.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Cancellation</h2>
              <p>You can cancel your subscription at any time from your account settings.</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Access continues until the end of your current billing period</li>
                <li>No partial refunds are given for unused time in a billing period</li>
                <li>Your data will be retained for 30 days after cancellation in case you resubscribe</li>
                <li>After 30 days, your data may be permanently deleted</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Refund Policy</h2>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Monthly Subscriptions</h3>
              <p>
                Monthly subscriptions are generally non-refundable. However, we may offer refunds at our discretion for:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Technical issues that prevented you from using the service</li>
                <li>Accidental purchases or duplicate charges</li>
                <li>First-time subscribers within 7 days of their first charge</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Annual Subscriptions</h3>
              <p>
                Annual subscriptions may be eligible for a prorated refund if requested within 30 days of the annual charge, minus any months already used. After 30 days, annual subscriptions are non-refundable.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">How to Request a Refund</h3>
              <p>
                To request a refund, please contact our support team at billing@draft.com with your account email and the reason for your request. We aim to respond to all refund requests within 3 business days.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Plan Changes</h2>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Upgrading</h3>
              <p>
                When you upgrade your plan, the new rate takes effect immediately. You'll receive prorated credit for any unused time on your previous plan.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Downgrading</h3>
              <p>
                When you downgrade your plan, the change takes effect at the end of your current billing period. You'll retain access to your current plan's features until then.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Price Changes</h2>
              <p>
                We may change our prices from time to time. If we increase prices, we'll give you at least 30 days' notice before the new prices take effect. You can cancel before the new prices take effect if you don't agree to them.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Taxes</h2>
              <p>
                Prices do not include applicable taxes. You are responsible for any taxes associated with your subscription based on your location.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Contact</h2>
              <p>
                For billing questions or refund requests, please contact us at billing@draft.com. Our billing support team is available Monday through Friday, 9am-5pm EST.
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
