import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Target, Zap } from "lucide-react";
import { Footer } from "@/components/Footer";
import { usePageTracking } from "@/hooks/usePageTracking";

export default function About() {
  usePageTracking('about');
  
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
            <img src="/kull-logo.png" alt="Kull Logo" className="w-6 h-6 rounded-lg" />
            <span className="font-bold text-lg">Kull</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Sparkles className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground" data-testid="text-about-headline">
              About Kull
            </h1>
            <p className="text-lg text-muted-foreground">
              AI-powered photo rating and organization for professional photographers
            </p>
          </div>

          {/* Our Story */}
          <section className="bg-card border border-card-border rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Our Story</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Kull was created to solve a problem every photographer faces: spending hours manually sorting through thousands of photos to find the best shots. We built a universal Mac/iPhone/iPad app that uses advanced AI to rate, organize, and tag your photos instantly.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              By combining five cutting-edge AI models—Gemini, Grok, Kimi k2, Claude, and GPT-5—Kull provides professional-level photo rating that saves photographers hours of tedious selection work, letting them focus on what they do best: creating stunning images.
            </p>
          </section>

          {/* Our Mission */}
          <section className="bg-card border border-card-border rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Our Mission</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Target className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Save Photographers Time</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Help photographers rate 1,000+ photos in minutes instead of hours, giving them more time for creative work and client relationships.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">AI-Powered Accuracy</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Provide professional-level photo ratings using multiple AI models that understand composition, lighting, focus, and emotional impact.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Universal Platform</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Create a seamless experience across Mac, iPhone, and iPad with automatic sync, so your ratings and organization follow you everywhere.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Founder */}
          <section className="bg-card border border-card-border rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Founder</h2>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground mb-2">Steve Moraco</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Steve is an entrepreneur and technologist passionate about using AI to solve real-world problems. After seeing photographers struggle with photo selection, he built Kull to automate the tedious parts of the workflow.
                </p>
                <p className="text-sm text-muted-foreground">
                  Based in Colorado Springs, CO. Available via <a href="https://twitter.com/stevemoraco" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Twitter DM</a> for support and feedback.
                </p>
              </div>
            </div>
          </section>

          {/* Company Info */}
          <section className="bg-card border border-card-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Company</h2>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Legal Name:</strong> Lander Media</p>
              <p><strong className="text-foreground">Address:</strong> 31 N Tejon St, Colorado Springs, CO 80903</p>
              <p><strong className="text-foreground">Founded:</strong> 2025</p>
              <p><strong className="text-foreground">Support:</strong> Available 24/7 via <Link href="/support"><span className="text-primary hover:underline">AI chat</span></Link></p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
