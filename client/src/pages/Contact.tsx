import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, MapPin, MessageSquare } from "lucide-react";
import { Footer } from "@/components/Footer";
import { SupportChat } from "@/components/SupportChat";

export default function Contact() {
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
            <Mail className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Kull AI</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Mail className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground" data-testid="text-contact-headline">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions, feedback, or need assistance? We'd love to hear from you.
            </p>
          </div>

          {/* Contact Methods */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Email Card */}
            <div className="bg-card border border-card-border rounded-2xl p-8 hover-elevate">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Email Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Send us a message and we'll respond within 24 hours. For urgent issues, use the live chat widget.
              </p>
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-foreground">General Inquiries</p>
                  <a
                    href="mailto:hello@kullai.com"
                    className="text-primary hover:underline text-lg"
                  >
                    hello@kullai.com
                  </a>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-foreground">Support</p>
                  <a
                    href="mailto:support@kullai.com"
                    className="text-primary hover:underline text-lg"
                  >
                    support@kullai.com
                  </a>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-foreground">Sales & Partnerships</p>
                  <a
                    href="mailto:sales@kullai.com"
                    className="text-primary hover:underline text-lg"
                  >
                    sales@kullai.com
                  </a>
                </div>
              </div>
            </div>

            {/* Live Chat Card */}
            <div className="bg-card border border-card-border rounded-2xl p-8 hover-elevate">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Live Chat</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Get instant answers to your questions. Click the chat widget in the bottom-right corner to start a conversation.
              </p>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-foreground font-semibold mb-2">Available 24/7</p>
                <p className="text-sm text-muted-foreground">
                  Automated assistance anytime, with human support during business hours (9am-5pm MT, Monday-Friday)
                </p>
              </div>
            </div>
          </div>

          {/* Office Information */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-8 md:p-12 mb-16">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4 text-foreground">Our Office</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-foreground font-semibold mb-2">Lander Media</p>
                    <p className="text-muted-foreground leading-relaxed">
                      31 N Tejon St<br />
                      Colorado Springs, CO 80903<br />
                      United States
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground font-semibold mb-2">Business Hours</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Monday - Friday: 9:00 AM - 5:00 PM MT<br />
                      Saturday - Sunday: Closed<br />
                      <span className="text-sm">(Email and chat available 24/7)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-card border border-card-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-foreground text-center">Quick Links</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/support">
                <Button variant="outline" className="w-full" data-testid="button-support-link">
                  Support Center
                </Button>
              </Link>
              <Link href="/privacy">
                <Button variant="outline" className="w-full" data-testid="button-privacy-link">
                  Privacy Policy
                </Button>
              </Link>
              <Link href="/terms">
                <Button variant="outline" className="w-full" data-testid="button-terms-link">
                  Terms of Service
                </Button>
              </Link>
              <Link href="/refunds">
                <Button variant="outline" className="w-full" data-testid="button-refunds-link">
                  Refund Policy
                </Button>
              </Link>
            </div>
          </div>

          {/* Partnership & Press */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Partnerships & Press</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Interested in partnering with Kull AI or writing about us? We'd love to collaborate with photography communities, industry publications, and innovative companies.
            </p>
            <a href="mailto:partnerships@kullai.com">
              <Button size="lg" data-testid="button-partnerships">
                <Mail className="w-4 h-4 mr-2" />
                Contact Partnerships Team
              </Button>
            </a>
          </div>
        </div>
      </main>

      <Footer />
      <SupportChat />
    </div>
  );
}
