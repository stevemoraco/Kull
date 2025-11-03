import { Check, Gift, Shield } from "lucide-react";

export function ValueStack() {
  const coreFeatures = [
    "5 AI models analyzing every photo (Gemini, Grok, Groq, Claude, OpenAI)",
    "Real-time 1-5 star ratings appearing live in Lightroom",
    "Unlimited photo rating during your subscription",
    "Desktop app for Mac (DMG download after purchase)",
    "iOS companion app for on-the-go rating",
    "Automatic sync across all your devices",
    "Priority processing queue for faster results",
    "Regular AI model updates and improvements"
  ];

  const bonuses = [
    "Advanced filtering and batch processing",
    "Custom rating presets for different shoot types",
    "Detailed AI insights and composition analysis",
    "Export ratings to any catalog format"
  ];

  return (
    <section className="py-20 md:py-32 px-4" data-testid="section-value-stack">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground" data-testid="text-value-headline">
            Everything You Get With Kull AI
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            A complete AI-powered photo rating system that saves you hundreds of hours
          </p>
        </div>

        {/* Core features */}
        <div className="bg-card border border-card-border rounded-2xl p-8 md:p-12 mb-8 shadow-lg">
          <h3 className="text-2xl font-bold mb-6 text-card-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-primary" />
            </div>
            Core Features
          </h3>
          <div className="space-y-4">
            {coreFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3" data-testid={`item-core-${index}`}>
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-card-foreground leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bonus features */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-8 md:p-12 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            Bonus Features (Included Free)
          </h3>
          <div className="space-y-4">
            {bonuses.map((feature, index) => (
              <div key={index} className="flex items-start gap-3" data-testid={`item-bonus-${index}`}>
                <Gift className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total value */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">TOTAL VALUE</p>
          <p className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            <span className="line-through text-muted-foreground">$2,400/year</span>
            <span className="text-primary ml-4">Starting at $99/mo</span>
          </p>
          <p className="text-sm text-muted-foreground">Save 200+ hours annually</p>
        </div>

        {/* Risk reversal */}
        <div className="bg-muted/30 border border-border rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Shield className="w-6 h-6 text-primary" />
            <h4 className="font-bold text-lg text-foreground">Zero Risk Guarantee</h4>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Start with a <strong className="text-foreground">1-day unlimited free trial</strong>. 
            No credit card required. Cancel anytime—no questions asked.
          </p>
        </div>
      </div>
    </section>
  );
}
