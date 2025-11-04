import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function Privacy() {
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
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Kull</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground" data-testid="text-privacy-headline">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Last Updated: November 3, 2025
            </p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Our Commitment to Your Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                At Kull, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information when you use our AI-powered photo rating service.
              </p>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Information We Collect</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Account Information</h3>
                  <p className="leading-relaxed">
                    When you create an account, we collect your email address, name, and profile information through our authentication provider (Replit Auth).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Payment Information</h3>
                  <p className="leading-relaxed">
                    Payment processing is handled securely by Stripe. We never store your full credit card details on our servers—only a tokenized reference to your payment method.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Usage Data</h3>
                  <p className="leading-relaxed">
                    We collect data about how you use Kull, including the number of photos rated, feature usage, and subscription tier. This helps us improve the service and provide better support.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Your Photos</h3>
                  <p className="leading-relaxed">
                    <strong className="text-foreground">We do NOT store your actual photos.</strong> When you use Kull, your images are processed by our AI models in real-time and only the ratings data (1-5 stars) is saved. Your creative work stays on your device, always.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">How We Use Your Information</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Provide and improve the AI photo rating service</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Process payments and manage subscriptions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Send transactional emails (welcome, trial reminders, receipts)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Provide customer support and respond to inquiries</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Analyze usage patterns to improve our AI models and features</span>
                </li>
              </ul>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Data Security</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">All data transmitted between your device and our servers is encrypted using SSL/TLS</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Passwords are hashed and never stored in plain text</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Payment processing is PCI-DSS compliant through Stripe</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Regular security audits and monitoring</span>
                </li>
              </ul>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Access your personal data</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Request correction of inaccurate data</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Request deletion of your account and associated data</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Opt-out of non-essential communications</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Export your data in a portable format</span>
                </li>
              </ul>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use trusted third-party services to provide Kull:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed"><strong className="text-foreground">Stripe</strong> for payment processing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed"><strong className="text-foreground">Replit Auth</strong> for secure authentication</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed"><strong className="text-foreground">SendGrid</strong> for transactional emails</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed"><strong className="text-foreground">AI Providers</strong> (Gemini, Grok, Groq, Claude, OpenAI) for photo analysis</span>
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Each of these services has their own privacy policies and security practices that comply with industry standards.
              </p>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or want to exercise your rights, please contact us:
              </p>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-foreground font-semibold">Lander Media</p>
                <p className="text-muted-foreground">31 N Tejon St</p>
                <p className="text-muted-foreground">Colorado Springs, CO 80903</p>
                <p className="text-muted-foreground mt-2">
                  Email: <a href="mailto:privacy@kullai.com" className="text-primary hover:underline">privacy@kullai.com</a>
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
