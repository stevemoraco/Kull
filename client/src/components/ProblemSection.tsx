import { XCircle, Clock, Eye, Frown } from "lucide-react";

export function ProblemSection() {
  const problems = [
    {
      icon: Clock,
      title: "Hours Wasted on Manual Rating",
      description: "Spending 4-6 hours sorting through thousands of photos from a single shoot"
    },
    {
      icon: Eye,
      title: "Decision Fatigue",
      description: "Your eye gets tired, and you start missing great shots or rating inconsistently"
    },
    {
      icon: Frown,
      title: "Delayed Deliveries",
      description: "Clients waiting days or weeks for their photos because culling takes forever"
    },
    {
      icon: XCircle,
      title: "Missing Revenue",
      description: "Can't take on more clients because you're stuck in the editing workflow bottleneck"
    }
  ];

  return (
    <section className="py-20 md:py-32 px-4" data-testid="section-problem">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground" data-testid="text-problem-headline">
            The Photo Rating Nightmare
            <br />
            Every Photographer Knows
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            You love capturing moments, not spending hours staring at thumbnails deciding which shots make the cut.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="bg-card border border-card-border rounded-2xl p-8 hover-elevate"
              data-testid={`card-problem-${index}`}
            >
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                <problem.icon className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-card-foreground">
                {problem.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-destructive/10 border border-destructive/20 rounded-xl px-8 py-6">
            <p className="text-xl md:text-2xl font-bold text-foreground mb-3">
              ~2 photoshoots per week, 1-2 hours per photoshoot culling & organizing and picking selects
            </p>
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              That's <span className="text-destructive">up to 208 hours per year</span>
            </p>
            <p className="text-lg md:text-xl font-semibold text-muted-foreground mt-2">
              which is <span className="text-destructive">$7,280 in billable hours wasted</span> per year at $35/hour
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
