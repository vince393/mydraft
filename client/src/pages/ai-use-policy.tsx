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
          <p className="text-muted-foreground mb-8">Last updated: January 16, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Overview</h2>
              <p>
                MyDraft uses artificial intelligence (AI) to help you manage your email more efficiently. This policy explains how we use AI, what data is processed, and your responsibilities when using AI-powered features.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. AI Features</h2>
              <p>MyDraft provides the following AI-powered capabilities:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>AI Draft:</strong> Generate email replies with customizable tone</li>
                <li><strong>AI Polish:</strong> Improve the clarity and professionalism of your drafts</li>
                <li><strong>AI Refine:</strong> Modify drafts based on specific instructions</li>
                <li><strong>Voice Assistant:</strong> Interact with your inbox using voice commands</li>
                <li><strong>Email Translation:</strong> Translate emails to different languages</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. How AI Processes Your Data</h2>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Data Sent to AI</h3>
              <p>When you use AI features, we send relevant context to our AI provider (OpenAI), including:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>The email content you're responding to</li>
                <li>Your selected tone preference</li>
                <li>Any specific instructions you provide</li>
                <li>Previous messages in a thread for context</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Data Retention</h3>
              <p>
                Email content sent to AI is processed in real-time and not stored by MyDraft after the response is generated. Our AI provider (OpenAI) processes data according to their own data policies, which include not using API data for training.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Your Responsibilities</h2>
              <p>When using AI features, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Review before sending:</strong> Always review AI-generated content before sending. You are responsible for what you send.</li>
                <li><strong>Verify accuracy:</strong> AI may generate inaccurate or inappropriate content. Check facts and ensure the tone is right.</li>
                <li><strong>Avoid misuse:</strong> Do not use AI to generate harmful, deceptive, discriminatory, or illegal content.</li>
                <li><strong>Respect confidentiality:</strong> Be aware that email content is processed by third-party AI services.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Limitations of AI</h2>
              <p>Please be aware that:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>AI-generated content may contain errors or inaccuracies</li>
                <li>AI may not understand nuanced context or cultural subtleties</li>
                <li>AI cannot access real-time information or external sources</li>
                <li>AI responses may not always match your intended tone perfectly</li>
                <li>AI is a tool to assist you, not replace your judgment</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Prohibited Uses</h2>
              <p>You may not use AI features to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Generate spam or unsolicited messages</li>
                <li>Create phishing or fraudulent content</li>
                <li>Produce content that harasses or threatens others</li>
                <li>Generate content that violates laws or regulations</li>
                <li>Attempt to "jailbreak" or circumvent AI safety measures</li>
                <li>Generate content that infringes intellectual property</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. AI Provider</h2>
              <p>
                We use OpenAI's GPT models to power our AI features. OpenAI processes data according to their Enterprise Privacy Policy, which includes commitments to not train on customer API data.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Opting Out</h2>
              <p>
                AI features are optional. You can choose not to use AI draft generation and compose emails manually. Some plans offer more AI features than others.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to AI Features</h2>
              <p>
                We may update, modify, or discontinue AI features at any time. We will notify you of significant changes to how AI processes your data.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Feedback</h2>
              <p>
                We welcome feedback on our AI features. Please contact us at support@draft.com with any questions, concerns, or suggestions for improvement.
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
            <p className="text-sm text-muted-foreground/50">© 2024 MyDraft. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <a href="mailto:support@mydraft.io" className="hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
              <a href="tel:+16197757982" className="hover:text-foreground transition-colors" data-testid="footer-phone">+1 (619) 775-7982</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
