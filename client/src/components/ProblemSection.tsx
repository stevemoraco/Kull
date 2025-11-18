import { XCircle, Clock, Eye, Frown, DollarSign, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ProblemSection() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [shootsPerWeek, setShootsPerWeek] = useState(2);
  const [hoursPerShoot, setHoursPerShoot] = useState(1.5);
  const [billableRate, setBillableRate] = useState(35);
  const [teamSize, setTeamSize] = useState(1);

  // Preset functions
  const applyDefaultPreset = () => {
    setShootsPerWeek(2);
    setHoursPerShoot(1.5);
    setBillableRate(35);
    setTeamSize(1);
  };

  const applyLessPreset = () => {
    setShootsPerWeek(1);
    setHoursPerShoot(1);
    setBillableRate(30);
    setTeamSize(1);
  };

  const applyMorePreset = () => {
    setShootsPerWeek(3);
    setHoursPerShoot(2.5);
    setBillableRate(50);
    setTeamSize(1);
  };

  const problems = [
    {
      icon: Clock,
      title: "Hours Wasted on Manual Rating",
      description: "Spending hours sorting through thousands of photos from a single shoot"
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

  // Calculate totals
  const weeksPerYear = 52;
  const totalHoursPerYear = shootsPerWeek * hoursPerShoot * weeksPerYear * teamSize;
  const totalCostPerYear = totalHoursPerYear * billableRate;
  const workweeksSaved = totalHoursPerYear / 40; // 40 hours per workweek

  return (
    <section className="py-12 md:py-20 px-4" data-testid="section-problem">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
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

        {/* Interactive Calculator */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-destructive/5 via-destructive/10 to-destructive/5 border-2 border-destructive/30 rounded-3xl p-8 md:p-10 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="flex flex-col items-center gap-4 mb-6">
                <DollarSign className="w-10 h-10 text-destructive" />
                <h3 className="text-3xl md:text-4xl font-black text-foreground">
                  Are you wasting{" "}
                  <span className="inline-flex items-center gap-2 bg-muted/50 border border-border rounded-full px-1 py-0.5 mx-2">
                    <button
                      onClick={() => {
                        setShowCalculator(false);
                        applyLessPreset();
                      }}
                      className={`px-4 py-1.5 rounded-full font-bold text-lg transition-all ${
                        !showCalculator
                          ? "bg-destructive text-destructive-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      less
                    </button>
                    <span className="text-muted-foreground font-normal">/</span>
                    <button
                      onClick={() => {
                        setShowCalculator(true);
                        applyMorePreset();
                      }}
                      className={`px-4 py-1.5 rounded-full font-bold text-lg transition-all ${
                        showCalculator
                          ? "bg-destructive text-destructive-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      more
                    </button>
                  </span>{" "}
                  than{" "}
                  <button
                    onClick={applyDefaultPreset}
                    className="text-destructive hover:underline cursor-pointer"
                  >
                    $5,460/year
                  </button>?
                </h3>
              </div>
            </div>

            {/* Results - Top */}
            <div className="mb-10">
              <div className="bg-gradient-to-br from-destructive/20 to-destructive/10 border-2 border-destructive/40 rounded-2xl p-8 mb-6">
                <div className="text-center mb-6">
                  <p className="text-sm uppercase tracking-wide text-muted-foreground font-bold mb-2">Total Annual Waste</p>
                  <p className="text-5xl md:text-6xl font-black text-destructive mb-4">
                    ${totalCostPerYear.toLocaleString()}
                  </p>
                  <p className="text-lg text-muted-foreground">
                    {Math.round(totalHoursPerYear).toLocaleString()} hours wasted per year
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full h-auto min-h-[4rem] text-lg md:text-xl font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-3"
                onClick={() => window.location.href = "/api/login"}
              >
                <span className="break-words">Save ${totalCostPerYear.toLocaleString()}/yr By Signing Up Now</span>
              </Button>
              <p className="text-center mt-4 text-lg font-semibold text-muted-foreground">
                Reclaim <span className="text-foreground font-bold">{workweeksSaved.toFixed(1)} entire workweeks</span> × <span className="text-foreground font-bold">{Math.round(totalHoursPerYear).toLocaleString()} billable hours</span> this year!
              </p>
            </div>

            {/* Calculator Sliders */}
            <div className="space-y-8">
                {/* Photoshoots per week */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <label className="text-lg font-bold text-foreground">Photoshoots per Week</label>
                        <p className="text-sm text-muted-foreground">Per photographer on your team</p>
                      </div>
                    </div>
                    <div className="text-3xl font-black text-primary">{shootsPerWeek}</div>
                  </div>
                  <div className="relative pt-8 pb-4">
                    <input
                      type="range"
                      min="1"
                      max="14"
                      step="1"
                      value={shootsPerWeek}
                      onChange={(e) => setShootsPerWeek(parseInt(e.target.value))}
                      className="w-full h-3 bg-primary/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                    />
                    <div className="absolute -bottom-1 left-0 right-0 flex justify-between text-xs text-muted-foreground font-mono">
                      <span className="relative"><span className="absolute -top-6 left-0 w-px h-4 bg-border"></span>1</span>
                      <span className="relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>5</span>
                      <span className="relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>10</span>
                      <span className="relative"><span className="absolute -top-6 right-0 w-px h-4 bg-border"></span>14</span>
                    </div>
                  </div>
                </div>

                {/* Culling Time per Shoot */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <label className="text-lg font-bold text-foreground">Culling Time per Shoot</label>
                        <p className="text-sm text-muted-foreground">Hours spent culling & organizing</p>
                      </div>
                    </div>
                    <div className="text-3xl font-black text-primary">{hoursPerShoot}h</div>
                  </div>
                  <div className="relative pt-8 pb-4">
                    <input
                      type="range"
                      min="0.5"
                      max="8"
                      step="0.5"
                      value={hoursPerShoot}
                      onChange={(e) => setHoursPerShoot(parseFloat(e.target.value))}
                      className="w-full h-3 bg-primary/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                    />
                    <div className="absolute -bottom-1 left-0 right-0 text-xs text-muted-foreground font-mono">
                      <div className="relative h-4">
                        <span className="absolute left-0"><span className="absolute -top-6 left-0 w-px h-4 bg-border"></span>0.5h</span>
                        <span className="absolute left-[20%] -translate-x-1/2"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>2h</span>
                        <span className="absolute left-[46.67%] -translate-x-1/2"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>4h</span>
                        <span className="absolute right-0"><span className="absolute -top-6 right-0 w-px h-4 bg-border"></span>8h</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billable Rate */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <label className="text-lg font-bold text-foreground">Billable Rate</label>
                        <p className="text-sm text-muted-foreground">Your hourly value</p>
                      </div>
                    </div>
                    <div className="text-3xl font-black text-primary">${billableRate}/hr</div>
                  </div>
                  <div className="relative pt-8 pb-4">
                    <input
                      type="range"
                      min="20"
                      max="500"
                      step="5"
                      value={billableRate}
                      onChange={(e) => setBillableRate(parseInt(e.target.value))}
                      className="w-full h-3 bg-primary/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                    />
                    <div className="absolute -bottom-1 left-0 right-0 text-xs text-muted-foreground font-mono">
                      <div className="relative h-4">
                        <span className="absolute left-0"><span className="absolute -top-6 left-0 w-px h-4 bg-border"></span>$20</span>
                        <span className="absolute left-[16.67%] -translate-x-1/2"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>$100</span>
                        <span className="absolute left-[47.92%] -translate-x-1/2"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>$250</span>
                        <span className="absolute right-0"><span className="absolute -top-6 right-0 w-px h-4 bg-border"></span>$500</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Size */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <label className="text-lg font-bold text-foreground">Team Size</label>
                        <p className="text-sm text-muted-foreground">Number of photographers</p>
                      </div>
                    </div>
                    <div className="text-3xl font-black text-primary">{teamSize}</div>
                  </div>
                  <div className="relative pt-8 pb-4">
                    <input
                      type="range"
                      min="1"
                      max="25"
                      step="1"
                      value={teamSize}
                      onChange={(e) => setTeamSize(parseInt(e.target.value))}
                      className="w-full h-3 bg-primary/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                    />
                    <div className="absolute -bottom-1 left-0 right-0 text-xs text-muted-foreground font-mono">
                      <div className="relative h-4">
                        <span className="absolute left-0"><span className="absolute -top-6 left-0 w-px h-4 bg-border"></span>1</span>
                        <span className="absolute left-[8.33%] -translate-x-1/2"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>3</span>
                        <span className="absolute left-[25%] -translate-x-1/2"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>7</span>
                        <span className="absolute left-[58.33%] -translate-x-1/2"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>15</span>
                        <span className="absolute right-0"><span className="absolute -top-6 right-0 w-px h-4 bg-border"></span>25</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="mt-10 pt-8 border-t-2 border-destructive/20">
                  <div className="bg-gradient-to-br from-destructive/20 to-destructive/10 border-2 border-destructive/40 rounded-2xl p-8 mb-6">
                    <div className="text-center mb-6">
                      <p className="text-sm uppercase tracking-wide text-muted-foreground font-bold mb-2">Total Annual Waste</p>
                      <p className="text-5xl md:text-6xl font-black text-destructive mb-4">
                        ${totalCostPerYear.toLocaleString()}
                      </p>
                      <p className="text-lg text-muted-foreground">
                        {Math.round(totalHoursPerYear).toLocaleString()} hours wasted per year
                      </p>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full h-auto min-h-[4rem] text-lg md:text-xl font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-3"
                    onClick={() => window.location.href = "/api/login"}
                  >
                    <span className="break-words">Save ${totalCostPerYear.toLocaleString()}/yr By Signing Up Now</span>
                  </Button>
                  <p className="text-center mt-4 text-lg font-semibold text-muted-foreground">
                    Reclaim <span className="text-foreground font-bold">{workweeksSaved.toFixed(1)} entire workweeks</span> × <span className="text-foreground font-bold">{Math.round(totalHoursPerYear).toLocaleString()} billable hours</span> this year!
                  </p>
                </div>
              </div>
          </div>
        </div>
      </div>
    </section>
  );
}
