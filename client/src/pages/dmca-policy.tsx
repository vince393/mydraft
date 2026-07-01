import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function DMCAPolicyPage() {
  useEffect(() => {
    document.title = "Copyright & DMCA Policy | MyDraft";
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

          <h1 className="text-3xl font-semibold mb-2">Copyright &amp; DMCA Policy</h1>
          <p className="text-muted-foreground mb-8">Effective Date: July 1, 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Our Commitment to Copyright</h2>
              <p>
                MyDraft ("we", "us", or "the Service") respects the intellectual property rights of others and expects our users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), we will respond promptly to clear notices of alleged copyright infringement that comply with the requirements described below.
              </p>
              <p className="mt-4">
                MyDraft is an email productivity tool. Content processed through the Service (such as your emails and drafts) is private to you and the recipients you choose; we do not publicly host or publish user content. Nonetheless, we provide this policy and a designated agent so that rights holders have a clear path to report concerns.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Reporting Alleged Infringement</h2>
              <p>
                If you believe that content made available through the Service infringes a copyright you own or control, you may submit a written notice to our Designated Copyright Agent. To be effective under the DMCA (17 U.S.C. § 512(c)(3)), your notice must include substantially the following:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf;</li>
                <li>Identification of the copyrighted work claimed to have been infringed, or a representative list if multiple works are covered;</li>
                <li>Identification of the material that is claimed to be infringing and information reasonably sufficient to allow us to locate it;</li>
                <li>Your contact information, including your name, mailing address, telephone number, and email address;</li>
                <li>A statement that you have a good-faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law; and</li>
                <li>A statement, made under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on the owner's behalf.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Designated Copyright Agent</h2>
              <p>
                Notices of alleged copyright infringement should be sent to our Designated Copyright Agent:
              </p>
              <p className="mt-2">
                {/* TODO: Replace the placeholder details below with your registered DMCA agent information. */}
                <strong>Copyright Agent</strong><br />
                MyDraft — Copyright / DMCA<br />
                [Company legal name]<br />
                [Mailing address]<br />
                <strong>Email:</strong> support@mydraft.io
              </p>
              <p className="mt-4">
                For faster handling, please use the subject line "DMCA Notice." We may share a copy of any notice we receive with the user who is alleged to have provided the material.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Counter-Notification</h2>
              <p>
                If you believe that material was removed or disabled by mistake or misidentification, you may submit a written counter-notification to our Designated Copyright Agent that includes substantially the following:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Your physical or electronic signature;</li>
                <li>Identification of the material that was removed or disabled and the location at which it appeared before removal;</li>
                <li>A statement, under penalty of perjury, that you have a good-faith belief the material was removed or disabled as a result of mistake or misidentification;</li>
                <li>Your name, mailing address, telephone number, and email address; and</li>
                <li>A statement that you consent to the jurisdiction of the federal court in the district where your address is located (or, if outside the United States, the district in which we may be found), and that you will accept service of process from the party who filed the original notice or its agent.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Repeat Infringers</h2>
              <p>
                In appropriate circumstances and at our discretion, we will disable or terminate the accounts of users who are determined to be repeat infringers of the intellectual property rights of others.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Misrepresentations</h2>
              <p>
                Under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material is infringing, or that it was removed or disabled by mistake, may be liable for damages. Please do not make false claims.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Responsibility for Content</h2>
              <p>
                You are solely responsible for the content you create, upload, process, or send through the Service, and you represent that you have all rights necessary to do so. Your use of the Service is also governed by our{" "}
                <Link href="/terms" className="text-foreground underline hover:no-underline">Terms of Service</Link>{" "}and{" "}
                <Link href="/acceptable-use" className="text-foreground underline hover:no-underline">Acceptable Use Policy</Link>, which prohibit infringing the intellectual property rights of others.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact</h2>
              <p>
                Questions about this policy may be sent to{" "}
                <a href="mailto:support@mydraft.io" className="text-foreground underline hover:no-underline">support@mydraft.io</a>.
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
