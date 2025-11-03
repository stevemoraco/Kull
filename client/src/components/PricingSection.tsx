import { Button } from "@/components/ui/button";
import { Check, Zap, Crown } from "lucide-react";

interface PricingSectionProps {
  onSelectPlan?: (tier: 'professional' | 'studio') => void;
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const professionalFeatures = [
    "5 AI models (Gemini, Grok, Groq, Claude, OpenAI)",
    "Unlimited photo rating",
    "Desktop app (Mac DMG)",
    "iOS companion app",
    "Real-time Lightroom integration",
    "Auto-sync across devices",
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
    if (onSelectPlan) {
      onSelectPlan(tier);
    } else {
      window.location.href = "/api/login";
    }
  };

  return (
    <section className="py-20 md:py-32 px-4 bg-muted/30" data-testid="section-pricing">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground" data-testid="text-pricing-headline">
            Choose Your Plan
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-4">
            All plans include a 1-day unlimited free trial
          </p>
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">24-Hour Bonus: Get 3 extra months free on annual plans</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
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
              Start Free Trial
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
              Start Free Trial
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

        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans can be canceled anytime. No long-term commitments.
        </p>
      </div>
    </section>
  );
}
