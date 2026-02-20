import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function AIUsePolicyPage() {
  useEffect(() => {
    document.title = "AI Use Policy | MyDraft";
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
          
          <h1 className="text-3xl font-semibold mb-2">AI Use Policy</h1>
          <p className="text-muted-foreground mb-8">Effective Date: January 16, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Overview</h2>
              <p>
                MyDraft leverages artificial intelligence to enhance your email productivity. This AI Use Policy explains how we implement AI features, how your data is processed, your responsibilities when using AI-assisted features, and the limitations of AI-generated content.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. AI-Powered Features</h2>
              <p>MyDraft provides the following AI-powered capabilities:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>AI Draft Generation:</strong> Create email replies with customizable tone and style</li>
                <li><strong>AI Polish:</strong> Enhance the clarity, professionalism, and grammar of your drafts</li>
                <li><strong>AI Refine:</strong> Modify drafts based on your specific instructions</li>
                <li><strong>Voice Assistant:</strong> Compose and manage emails through voice commands</li>
                <li><strong>Translation:</strong> Translate emails between supported languages</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Data Processing</h2>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Information Sent to AI Systems</h3>
              <p>When you use AI features, the following information may be sent to our AI provider for processing:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>The email content you are responding to or composing</li>
                <li>Your selected tone and style preferences</li>
                <li>Any specific instructions you provide for the AI</li>
                <li>Relevant context from the email thread</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Data Retention and Security</h3>
              <p>
                Email content processed by AI features is transmitted securely and processed in real-time. We do not retain copies of your email content after processing is complete. Our AI provider (OpenAI) operates under their Enterprise API terms, which prohibit using customer data for model training.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. User Responsibilities</h2>
              <p>When using AI features, you agree to the following:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Review Before Sending:</strong> You must review all AI-generated content before sending. You are solely responsible for the content of emails you send, regardless of AI assistance.</li>
                <li><strong>Verify Accuracy:</strong> AI may produce content that is factually incorrect, contextually inappropriate, or inconsistent with your intentions. Always verify accuracy before use.</li>
                <li><strong>Appropriate Use:</strong> Do not use AI features to generate harmful, deceptive, discriminatory, defamatory, or illegal content.</li>
                <li><strong>Confidentiality Awareness:</strong> Be mindful that email content is processed by third-party AI systems when using these features.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Limitations of AI</h2>
              <p>Please understand that AI technology has inherent limitations:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>AI-generated content may contain factual errors or inaccuracies</li>
                <li>AI may not fully understand nuanced context, cultural subtleties, or specialized terminology</li>
                <li>AI cannot access real-time information or verify current facts</li>
                <li>Generated content may not perfectly match your intended tone or style</li>
                <li>AI is a productivity tool and does not replace human judgment</li>
              </ul>
              <p className="mt-4">
                MyDraft makes no warranties regarding the accuracy, appropriateness, or completeness of AI-generated content.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Prohibited Uses of AI Features</h2>
              <p>You may not use AI features to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Generate spam, unsolicited bulk communications, or chain letters</li>
                <li>Create phishing attempts or fraudulent correspondence</li>
                <li>Produce content that harasses, threatens, or defames individuals</li>
                <li>Generate content that violates laws or regulations</li>
                <li>Attempt to bypass, manipulate, or exploit AI safety measures</li>
                <li>Create content that infringes on intellectual property rights</li>
                <li>Automate deceptive communications or impersonation</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. AI Provider</h2>
              <p>
                We utilize OpenAI's GPT models to power our AI features. OpenAI processes data under their Enterprise API Data Processing Agreement, which includes commitments to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Not use customer data for model training or improvement</li>
                <li>Maintain appropriate security measures</li>
                <li>Delete processed data in accordance with their retention policies</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Opting Out of AI Features</h2>
              <p>
                AI features are optional enhancements. You may compose emails manually without AI assistance at any time. Different subscription plans provide varying levels of AI functionality.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to AI Features</h2>
              <p>
                We may update, modify, enhance, or discontinue AI features at any time. Significant changes to how AI processes your data will be communicated through updated policies on our website.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Information</h2>
              <p>
                For questions, concerns, or feedback regarding our AI features, please contact us:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> support@mydraft.io
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
