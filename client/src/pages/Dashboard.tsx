import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Download, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { Footer } from "@/components/Footer";

export default function Dashboard() {
  usePageTracking('dashboard');
  const { user, isAuthenticated } = useAuth();

  const professionalFeatures = [
    "5 AI models (Gemini, Grok, Groq, Claude, OpenAI)",
    "Unlimited photo rating",
    "Universal Mac app",
    "iPhone & iPad companion apps",
    "Works with any folder on your Mac",
    "Auto-sync across all devices",
    "Email support"
  ];

  const studioFeatures = [
    "Everything in Professional, plus:",
    "Priority processing queue",
    "Advanced batch processing",
    "Custom AI rating presets",
    "Team collaboration tools (up to 5 users)",
    "API access for automation",
    "Dedicated account manager",
    "Priority support (24/7)"
  ];

  const handleSelectPlan = (tier: 'professional' | 'studio') => {
    if (isAuthenticated && user) {
      // User is logged in - redirect to checkout
      window.location.href = "/checkout";
    } else {
      // User needs to log in first
      window.location.href = "/api/login";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -ml-2 transition-all"
            data-testid="button-logo-home"
          >
            <img src="/kull-logo.png" alt="Kull Logo" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-black text-foreground">Kull</span>
          </button>
          {!isAuthenticated && (
            <Button
              variant="outline"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login-nav"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground" data-testid="heading-dashboard">
              Start Your Free Trial to Access Downloads
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-3xl mx-auto">
              Choose a plan below to start your 24-hour free trial and download Kull for Mac, iPhone, and iPad.
            </p>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">No charge until your trial ends • Cancel anytime</span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {/* Professional Plan */}
            <div className="bg-card border border-card-border rounded-2xl p-8 md:p-10 hover-elevate" data-testid="card-pricing-professional">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2 text-card-foreground">Professional</h3>
                <p className="text-muted-foreground">Perfect for individual photographers</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-black text-foreground">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">Billed annually at $1,188/year</p>
                <p className="text-xs text-primary mt-1">Save $396 vs monthly billing</p>
              </div>

              <Button
                className="w-full h-12 text-base mb-8"
                onClick={() => handleSelectPlan('professional')}
                data-testid="button-select-professional"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Kull Now
              </Button>

              <div className="space-y-3">
                {professionalFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3" data-testid={`feature-professional-${index}`}>
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-card-foreground leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Studio Plan */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-2xl p-8 md:p-10 relative hover-elevate" data-testid="card-pricing-studio">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Most Popular
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2 text-foreground">Studio</h3>
                <p className="text-muted-foreground">For studios and high-volume photographers</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-black text-foreground">$499</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">Billed annually at $5,988/year</p>
                <p className="text-xs text-primary mt-1">Save $2,004 vs monthly billing</p>
              </div>

              <Button
                className="w-full h-12 text-base mb-8"
                onClick={() => handleSelectPlan('studio')}
                data-testid="button-select-studio"
              >
                <Crown className="w-4 h-4 mr-2" />
                <Download className="w-4 h-4 mr-2" />
                Download Kull Now
              </Button>

              <div className="space-y-3">
                {studioFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3" data-testid={`feature-studio-${index}`}>
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground leading-relaxed font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <p className="text-muted-foreground">
              After selecting a plan, you'll be able to download Kull for Mac, iPhone, and iPad immediately during your free trial.
            </p>
            <p className="text-sm text-muted-foreground">
              All plans can be canceled anytime. No long-term commitments.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
