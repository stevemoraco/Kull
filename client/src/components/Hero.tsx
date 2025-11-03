import { Button } from "@/components/ui/button";
import { Zap, Sparkles, Star } from "lucide-react";

export function Hero() {
  const handleStartTrial = () => {
    window.location.href = "/api/login";
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8" data-testid="badge-announcement">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">1-Day Unlimited Free Trial</span>
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6 text-foreground" data-testid="text-hero-headline">
          Rate 1,000+ Photos in Minutes
          <br />
          <span className="text-primary">Using AI</span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed" data-testid="text-hero-subheadline">
          Kull AI uses 5 advanced AI models to instantly rate your Lightroom photos with 1-5 stars. 
          Save hours on photo selection and focus on what you do best—creating stunning images.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button
            size="lg"
            className="text-lg h-14 px-8 min-w-[240px]"
            onClick={handleStartTrial}
            data-testid="button-start-trial-hero"
          >
            <Zap className="w-5 h-5 mr-2" />
            Start Free Trial Now
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-lg h-14 px-8 min-w-[240px] bg-background/80 backdrop-blur-sm"
            data-testid="button-watch-demo"
          >
            Watch Demo
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2" data-testid="text-user-count">
            <Star className="w-4 h-4 text-primary" />
            <span>Used by 500+ professional photographers</span>
          </div>
        </div>

        {/* AI Model badges */}
        <div className="mt-16 pt-8 border-t border-border/40">
          <p className="text-sm text-muted-foreground mb-6 uppercase tracking-wide font-semibold">Powered by 5 Advanced AI Models</p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {['Gemini', 'Grok', 'Groq', 'Claude', 'OpenAI'].map((model) => (
              <div
                key={model}
                className="px-4 py-2 bg-card border border-card-border rounded-lg text-sm font-semibold text-card-foreground"
                data-testid={`badge-ai-${model.toLowerCase()}`}
              >
                {model}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
