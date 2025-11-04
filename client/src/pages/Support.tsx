import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LifeBuoy, ArrowLeft, MessageCircle, BookOpen } from "lucide-react";
import { Footer } from "@/components/Footer";
import { SupportChat } from "@/components/SupportChat";
import { usePageTracking } from "@/hooks/usePageTracking";

export default function Support() {
  usePageTracking('support');
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
          <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -mr-2 transition-all"
            data-testid="button-logo-home"
          >
            <LifeBuoy className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Kull</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <LifeBuoy className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground" data-testid="text-support-headline">
              Support Center
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get instant help with Kull. Our AI-powered chat support is available 24/7.
            </p>
          </div>

          {/* Support Options Grid */}
          <div className="grid md:grid-cols-1 gap-6 mb-16 max-w-2xl mx-auto">
            {/* Live Chat - Primary Support Method */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-2xl p-8">
              <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-foreground text-center">Live Chat Support</h2>
              <p className="text-muted-foreground leading-relaxed mb-6 text-center text-lg">
                Get instant answers from our AI assistant trained on Kull's documentation and codebase. Click the chat widget in the bottom-right corner of any page.
              </p>
              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 text-center">
                <p className="text-foreground font-semibold mb-2">Available 24/7</p>
                <p className="text-sm text-muted-foreground">
                  Powered by advanced AI with complete knowledge of Kull features, installation, troubleshooting, and billing. For additional support, founder Steve Moraco is available via Twitter DM.
                </p>
              </div>
            </div>
          </div>

          {/* Common Questions */}
          <div className="mb-16">
            <div className="flex items-center justify-center gap-3 mb-8">
              <BookOpen className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">Common Questions</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-card-border rounded-xl p-6 hover-elevate">
                <h3 className="text-xl font-bold mb-3 text-foreground">How do I install Kull?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Download the Mac app from your account dashboard. Double-click to install, then point it to any photo folder on your Mac. The AI ratings, titles, descriptions, tags, and color-coding appear automatically as you browse.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-6 hover-elevate">
                <h3 className="text-xl font-bold mb-3 text-foreground">Which AI models does Kull use?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We use 5 advanced models you can choose from: Gemini (Google), Grok (xAI), Kimi k2 (via Groq), Claude (Anthropic), and GPT-5 (OpenAI). All 5 analyze each photo using their low-cost batch APIs when possible, and rate each based on context in the photoshoot for maximum accuracy.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-6 hover-elevate">
                <h3 className="text-xl font-bold mb-3 text-foreground">How accurate are the ratings?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our multi-model consensus approach achieves professional-level accuracy. The AI analyzes composition, exposure, focus, and artistic merit—similar to how an expert photographer would evaluate images.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-6 hover-elevate">
                <h3 className="text-xl font-bold mb-3 text-foreground">Can I cancel my subscription?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Yes, cancel anytime from your account dashboard or use our self-service refund button within 7 days of payment. You'll retain access until the end of your current billing period. No cancellation fees.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-6 hover-elevate">
                <h3 className="text-xl font-bold mb-3 text-foreground">Do you store my photos?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  No. We never store your actual photos. They're processed in real-time and only the ratings (1-5 stars) are saved. Your creative work stays on your device, always.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-6 hover-elevate">
                <h3 className="text-xl font-bold mb-3 text-foreground">What's included in the free trial?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Full access to all features for 24 hours. Rate unlimited photos. Cancel anytime during the trial with no charge. Perfect for testing with your own photography workflow.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Resources */}
          <div className="bg-card border border-card-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-foreground text-center">Additional Resources</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Link href="/refunds">
                <Button variant="outline" className="w-full" data-testid="button-refund-policy">
                  Refund Policy
                </Button>
              </Link>
              <Link href="/privacy">
                <Button variant="outline" className="w-full" data-testid="button-privacy">
                  Privacy Policy
                </Button>
              </Link>
              <Link href="/terms">
                <Button variant="outline" className="w-full" data-testid="button-terms">
                  Terms of Service
                </Button>
              </Link>
            </div>
          </div>

          {/* Chat Reminder */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Still have questions? Our AI chat support can help with installation, billing, technical issues, and more.
            </p>
            <p className="text-sm text-muted-foreground">
              Click the chat icon in the bottom-right corner to get started.
            </p>
          </div>
        </div>
      </main>

      <Footer />
      <SupportChat />
    </div>
  );
}
