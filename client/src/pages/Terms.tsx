import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { usePageTracking } from "@/hooks/usePageTracking";

export default function Terms() {
  usePageTracking('terms');
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
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Kull AI</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <FileText className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground" data-testid="text-terms-headline">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground">
              Last Updated: November 3, 2025
            </p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Kull AI, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.
              </p>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Service Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kull AI provides a universal Mac/iPhone/iPad app with AI-powered photo rating and organization services. Our service uses multiple AI models (Gemini, Grok, Groq, Claude, and OpenAI) to analyze, rate, organize, title, describe, tag, and color-code photos from any folder on your Mac with a 1-5 star rating system.
              </p>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Free Trial Terms</h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  New users receive a 1-day (24-hour) free trial with the following conditions:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="leading-relaxed">You must provide valid payment information to start the trial</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="leading-relaxed">You can cancel anytime during the trial period with no charge</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="leading-relaxed">If you don't cancel, your subscription automatically begins after 24 hours</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="leading-relaxed">The trial is limited to one per user/payment method</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="leading-relaxed">Special offer pricing (if applicable) expires 24 hours after signup</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Subscription Plans</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Professional Plan - $99/month ($1,188/year)</h3>
                  <p className="leading-relaxed">
                    Designed for individual photographers. Includes unlimited photo ratings and organization, 5 AI model consensus, universal Mac app (works with any folder), iPhone & iPad apps, auto-sync across all devices, and standard support.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Studio Plan - $499/month ($5,988/year)</h3>
                  <p className="leading-relaxed">
                    Designed for teams and high-volume users. Includes all Professional features plus priority processing, team collaboration tools, advanced analytics, and priority support.
                  </p>
                </div>
                <p className="leading-relaxed mt-4">
                  All prices are in USD. Annual subscriptions receive a discount equivalent to approximately 3 free months compared to monthly billing.
                </p>
              </div>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Billing and Payments</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Subscriptions renew automatically unless cancelled</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">You will be charged at the beginning of each billing period</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Failed payments may result in service suspension</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Price changes will be communicated 30 days in advance</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">All payments are processed securely through Stripe</span>
                </li>
              </ul>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Cancellation Policy</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You may cancel your subscription at any time:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Cancel from your account dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">You will retain access until the end of your current billing period</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">No refunds for partial months or unused time (except as stated in Refund Policy)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Your rating data remains accessible for 30 days after cancellation</span>
                </li>
              </ul>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You agree NOT to:</p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Share your account credentials with others</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Use the service for illegal or unauthorized purposes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Attempt to reverse engineer or extract our AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Abuse the service with excessive automated requests</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Upload content that infringes on intellectual property rights</span>
                </li>
              </ul>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                You retain all rights to your photos. Kull AI does not claim ownership of your images. We only process them to provide rating services. The Kull AI software, AI models, and service are protected by copyright and other intellectual property laws.
              </p>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kull AI is provided "as is" without warranties of any kind. We strive for accuracy in our AI ratings, but cannot guarantee perfection. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
              </p>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify you of significant changes via email. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Questions about these Terms of Service? Contact us:
              </p>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-foreground font-semibold">Lander Media</p>
                <p className="text-muted-foreground">31 N Tejon St</p>
                <p className="text-muted-foreground">Colorado Springs, CO 80903</p>
                <p className="text-muted-foreground mt-2">
                  Email: <a href="mailto:legal@kullai.com" className="text-primary hover:underline">legal@kullai.com</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
