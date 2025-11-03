import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LifeBuoy, ArrowLeft, MessageCircle, Mail, BookOpen, Video } from "lucide-react";
import { Footer } from "@/components/Footer";
import { SupportChat } from "@/components/SupportChat";

export default function Support() {
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
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Kull AI</span>
          </div>
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
              Get help with Kull AI. Choose the option that works best for you.
            </p>
          </div>

          {/* Support Options Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {/* Live Chat */}
            <div className="bg-card border border-card-border rounded-2xl p-8 hover-elevate">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-foreground">Live Chat Support</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Get instant answers from our support team. Click the chat widget in the bottom-right corner of any page.
              </p>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Available:</strong> 24/7 automated assistance, with human support during business hours (9am-5pm MT)
                </p>
              </div>
            </div>

            {/* Email Support */}
            <div className="bg-card border border-card-border rounded-2xl p-8 hover-elevate">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-foreground">Email Support</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Send us a detailed message and we'll respond within 24 hours (usually much faster).
              </p>
              <a
                href="mailto:support@kullai.com"
                className="inline-block"
              >
                <Button className="w-full" data-testid="button-email-support">
                  <Mail className="w-4 h-4 mr-2" />
                  Email support@kullai.com
                </Button>
              </a>
            </div>
          </div>

          {/* Common Questions */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-foreground text-center">Common Questions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-card-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3 text-foreground">How do I install Kull AI?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Download the Mac DMG file from your account dashboard. Double-click to install, then open Lightroom. The AI ratings will appear automatically as you browse photos.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3 text-foreground">Which AI models does Kull AI use?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We use 5 advanced models: Gemini (Google), Grok (xAI), Groq, Claude (Anthropic), and OpenAI. All 5 analyze each photo and reach a consensus rating for maximum accuracy.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3 text-foreground">How accurate are the ratings?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our multi-model consensus approach achieves professional-level accuracy. The AI analyzes composition, exposure, focus, and artistic merit—similar to how an expert photographer would evaluate images.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3 text-foreground">Can I cancel my subscription?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Yes, cancel anytime from your account dashboard. You'll retain access until the end of your current billing period. No cancellation fees.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3 text-foreground">Do you store my photos?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  No. We never store your actual photos. They're processed in real-time and only the ratings (1-5 stars) are saved. Your creative work stays on your device, always.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3 text-foreground">What's included in the free trial?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Full access to all features for 24 hours. Rate unlimited photos. Cancel anytime during the trial with no charge. Perfect for testing with your own photography workflow.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Resources */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6 text-foreground text-center">Additional Resources</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Documentation</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Detailed guides on installation, features, and troubleshooting. Coming soon to our knowledge base.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Video Tutorials</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Step-by-step video guides for getting started and advanced features. Available in your dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Still Need Help?</h2>
            <p className="text-muted-foreground mb-6">
              Our team is here to ensure you get the most out of Kull AI.
            </p>
            <div className="inline-block p-6 bg-card border border-card-border rounded-xl">
              <p className="text-foreground font-semibold">Lander Media</p>
              <p className="text-muted-foreground">31 N Tejon St</p>
              <p className="text-muted-foreground">Colorado Springs, CO 80903</p>
              <p className="text-muted-foreground mt-3">
                Email: <a href="mailto:support@kullai.com" className="text-primary hover:underline">support@kullai.com</a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <SupportChat />
    </div>
  );
}
