import { Zap, Target, Gauge, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SolutionSection() {
  const features = [
    {
      icon: Zap,
      title: "5 AI Models",
      description: "Gemini, Grok, Kimi k2, Claude & GPT-5 you can choose from"
    },
    {
      icon: Target,
      title: "Real-Time Rating",
      description: "See ratings appear instantly as AI analyzes each photo"
    },
    {
      icon: Gauge,
      title: "Live Preview",
      description: "Watch the AI work on photos from any folder on your Mac"
    },
    {
      icon: RefreshCw,
      title: "Instant Sync",
      description: "Organize and tag across Mac, iPhone, and iPad seamlessly"
    }
  ];

  const handleStartTrial = () => {
    window.location.href = "/api/login";
  };

  return (
    <section className="py-20 md:py-32 px-4 bg-muted/30" data-testid="section-solution">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground" data-testid="text-solution-headline">
          Introducing <span className="text-primary">Kull</span>
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
          The first AI-powered photo rating and organization system for Mac, iPhone, and iPad, 
          combining 5 advanced AI models to rate and organize your photos with professional-level accuracy.
        </p>

        {/* Demo mockup placeholder */}
        <div className="bg-card border border-card-border rounded-2xl p-8 mb-12 shadow-xl" data-testid="demo-mockup">
          <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <Zap className="w-16 h-16 text-primary mx-auto mb-4" />
              <p className="text-xl font-semibold text-foreground">Live Demo Coming Soon</p>
              <p className="text-sm text-muted-foreground mt-2">See Kull rating photos in real-time</p>
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card border border-card-border rounded-xl p-6 hover-elevate"
              data-testid={`card-feature-${index}`}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2 text-card-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className="text-lg h-14 px-8"
          onClick={handleStartTrial}
          data-testid="button-start-trial-solution"
        >
          <Zap className="w-5 h-5 mr-2" />
          Try It Free for 1 Day
        </Button>
      </div>
    </section>
  );
}
