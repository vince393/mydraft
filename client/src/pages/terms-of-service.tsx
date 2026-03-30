import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function TermsOfServicePage() {
  useEffect(() => {
    document.title = "Terms of Service | MyDraft";
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
          
          <h1 className="text-3xl font-semibold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Effective Date: January 16, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Agreement to Terms</h2>
              <p>
                By creating an account or using MyDraft ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and MyDraft.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
              <p>
                MyDraft is an AI-powered email management platform that enables users to view, organize, and respond to emails with the assistance of artificial intelligence. The Service integrates with third-party email providers through secure OAuth authentication and provides features including AI-generated email drafts, inbox organization, and productivity tools.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Eligibility and Account Registration</h2>
              <p>To use MyDraft, you must:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Be at least 18 years of age or the age of legal majority in your jurisdiction</li>
                <li>Have the legal capacity to enter into a binding agreement</li>
                <li>Provide accurate, complete, and current registration information</li>
                <li>Maintain the confidentiality and security of your account credentials</li>
                <li>Promptly notify us of any unauthorized access to your account</li>
              </ul>
              <p className="mt-4">
                You are solely responsible for all activities that occur under your account. MyDraft reserves the right to refuse service, terminate accounts, or remove content at our discretion.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Subscription Plans and Payment</h2>
              <p>
                MyDraft offers Free, Pro, and Business subscription tiers. Paid subscriptions are billed on a monthly or annual basis as selected at the time of purchase.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Paid plans include a trial period as specified at checkout</li>
                <li>Subscription fees are charged at the beginning of each billing cycle</li>
                <li>All fees are non-refundable except as stated in our Refund Policy</li>
                <li>You may cancel your subscription at any time through your account settings</li>
                <li>Cancellation takes effect at the end of the current billing period</li>
              </ul>
              <p className="mt-4">
                We reserve the right to modify our pricing with 30 days' advance notice. Continued use after a price change constitutes acceptance of the new pricing.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Acceptable Use</h2>
              <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Use the Service for any illegal, fraudulent, or unauthorized purpose</li>
                <li>Violate any applicable local, state, national, or international law or regulation</li>
                <li>Send unsolicited bulk communications (spam) or engage in phishing</li>
                <li>Transmit malware, viruses, or other harmful code</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Interfere with or disrupt the integrity or performance of the Service</li>
                <li>Harass, abuse, threaten, or incite violence against any individual or group</li>
                <li>Use the Service in a manner that infringes the intellectual property rights of others</li>
              </ul>
              <p className="mt-4">
                Violation of these terms may result in immediate termination of your account without notice or refund.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. AI-Generated Content</h2>
              <p>
                MyDraft uses artificial intelligence to generate email drafts and suggestions. By using these features, you acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>You are solely responsible for reviewing, editing, and approving all AI-generated content before sending</li>
                <li>AI-generated content may contain errors, inaccuracies, or inappropriate suggestions</li>
                <li>MyDraft does not guarantee the accuracy, appropriateness, or fitness for purpose of AI-generated content</li>
                <li>You assume full responsibility for any emails sent using the Service, regardless of AI involvement</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
              <p>
                The Service, including its original content, features, functionality, design, and underlying technology, is owned by MyDraft and is protected by copyright, trademark, and other intellectual property laws. Your use of the Service does not grant you any ownership rights to our intellectual property.
              </p>
              <p className="mt-4">
                Your email content and communications remain your property. By using the Service, you grant us a limited license to process your content solely for the purpose of providing the Service to you.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
              </p>
              <p className="mt-4">
                We do not warrant that the Service will be uninterrupted, secure, error-free, or that defects will be corrected. We make no representations about the accuracy, reliability, or completeness of any content provided through the Service.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MYDRAFT AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITIES, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE.
              </p>
              <p className="mt-4">
                In no event shall our total liability exceed the amount you paid to MyDraft in the twelve (12) months preceding the claim.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless MyDraft and its officers, directors, employees, agents, and affiliates from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to your use of the Service, your violation of these Terms, or your violation of any rights of a third party.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. You may terminate your account at any time through your account settings or by contacting support.
              </p>
              <p className="mt-4">
                Upon termination, your right to use the Service will immediately cease. Provisions of these Terms that by their nature should survive termination shall survive, including intellectual property provisions, disclaimers, limitations of liability, and indemnification.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">12. Modifications to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on our website with a new effective date. Your continued use of the Service after such modifications constitutes your acceptance of the revised Terms.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">13. Governing Law and Dispute Resolution</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">14. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">15. Entire Agreement</h2>
              <p>
                These Terms, together with our Privacy Policy, Acceptable Use Policy, and any other policies referenced herein, constitute the entire agreement between you and MyDraft regarding the Service and supersede all prior agreements and understandings.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">16. Contact Information</h2>
              <p>
                For questions regarding these Terms, please contact us:
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
