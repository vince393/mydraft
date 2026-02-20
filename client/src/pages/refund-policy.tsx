import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function RefundPolicyPage() {
  useEffect(() => {
    document.title = "Refund and Billing Policy | MyDraft";
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
          <p className="text-muted-foreground mb-8">Effective Date: January 16, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Subscription Plans</h2>
              <p>MyDraft offers the following subscription tiers:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Free:</strong> $0 — Basic email management features with limited AI capabilities</li>
                <li><strong>Pro:</strong> $10/month or $99/year — Advanced AI features for individual professionals</li>
                <li><strong>Business:</strong> $29/month or $299/year — Enterprise-grade features for teams and businesses</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Free Trial</h2>
              <p>
                Pro and Business plans include a <strong>14-day free trial</strong> for annual subscriptions and a <strong>7-day free trial</strong> for monthly subscriptions.
              </p>
              <p className="mt-4">During the trial period:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>You receive full access to all features of the selected plan</li>
                <li>A valid payment method is required to begin the trial</li>
                <li>No charges will be made during the trial period</li>
                <li>You may cancel at any time before the trial ends with no obligation</li>
                <li>If not cancelled, your subscription automatically begins when the trial ends</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Billing</h2>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Billing Cycle</h3>
              <p>
                Subscriptions are billed in advance at the beginning of each billing period. Your billing date is determined by the date of your initial subscription.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Payment Methods</h3>
              <p>
                We accept major credit cards and debit cards through Stripe, our PCI-compliant payment processor. Your payment information is transmitted securely and never stored on our servers.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Failed Payments</h3>
              <p>
                If a payment fails, we will notify you and attempt to process the payment again. If payment cannot be collected after multiple attempts, your subscription may be suspended until payment is successfully processed.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Invoices</h3>
              <p>
                Invoices are automatically generated and sent to your registered email address following each payment. You can also access your billing history through your account settings.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Cancellation</h2>
              <p>
                You may cancel your subscription at any time through your account settings or by contacting support.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Your subscription remains active until the end of the current billing period</li>
                <li>No partial refunds are provided for unused time within a billing period</li>
                <li>Your account data will be retained for 30 days following cancellation to facilitate resubscription</li>
                <li>After 30 days, your data may be permanently deleted in accordance with our Privacy Policy</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Refund Policy</h2>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Monthly Subscriptions</h3>
              <p>
                Monthly subscriptions are generally non-refundable. However, refunds may be considered at our discretion for:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Documented technical issues that prevented service use</li>
                <li>Accidental purchases or duplicate charges</li>
                <li>First-time subscribers who request a refund within 7 days of their initial charge</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Annual Subscriptions</h3>
              <p>
                Annual subscriptions may be eligible for a prorated refund if requested within 30 days of the annual charge. The refund amount will be calculated based on the remaining unused months minus any discounts applied. After 30 days, annual subscriptions are non-refundable.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">How to Request a Refund</h3>
              <p>
                To request a refund, please contact our support team at support@mydraft.io. Include your account email address and the reason for your request. We aim to respond to all refund requests within 3 business days.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Refund Processing</h3>
              <p>
                Approved refunds are processed within 5-10 business days. The refund will be credited to the original payment method. Processing time may vary depending on your financial institution.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Plan Changes</h2>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Upgrading</h3>
              <p>
                When you upgrade your plan, the new rate takes effect immediately. You will receive prorated credit for any unused time on your previous plan, applied toward the cost of the upgraded plan.
              </p>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Downgrading</h3>
              <p>
                When you downgrade your plan, the change takes effect at the end of your current billing period. You retain access to your current plan's features until then. No refunds or credits are provided for downgrades.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Price Changes</h2>
              <p>
                We reserve the right to modify our pricing. For any price increases, we will provide at least 30 days' advance notice to affected subscribers. You may cancel your subscription before the new pricing takes effect if you do not agree to the changes.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Taxes</h2>
              <p>
                Listed prices do not include applicable taxes. You are responsible for any sales tax, VAT, or other taxes associated with your subscription based on your billing location. Taxes will be calculated and displayed during checkout.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Contact Information</h2>
              <p>
                For billing questions, payment issues, or refund requests, please contact our billing team:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> support@mydraft.io<br />
                <strong>Support Hours:</strong> Monday through Friday, 9:00 AM — 5:00 PM EST
              </p>
            </section>
          </div>
        </div>
      </div>
      
      <footer className="py-12 px-6 border-t border-gray-100">
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
