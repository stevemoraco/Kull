import { Button } from "@/components/ui/button";
import { Zap, Shield, Clock } from "lucide-react";

export function FinalCTA() {
  const handleStartTrial = () => {
    window.location.href = "/api/login";
  };

  return (
    <section className="py-20 md:py-32 px-4 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative overflow-hidden" data-testid="section-final-cta">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-foreground" data-testid="text-final-cta-headline">
          Start Rating Photos in Minutes,
          <br />
          <span className="text-primary">Not Hours</span>
        </h2>

        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          Join 500+ photographers who've already saved hundreds of hours with Kull
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button
            size="lg"
            className="text-xl h-16 px-10 min-w-[280px]"
            onClick={handleStartTrial}
            data-testid="button-start-trial-final"
          >
            <Zap className="w-6 h-6 mr-2" />
            Start Your Free Trial
          </Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">No Credit Card</span>
            <span className="text-xs text-muted-foreground">Required to start</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">1-Day Free Trial</span>
            <span className="text-xs text-muted-foreground">Unlimited rating</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Cancel Anytime</span>
            <span className="text-xs text-muted-foreground">No commitments</span>
          </div>
        </div>
      </div>
    </section>
  );
}
