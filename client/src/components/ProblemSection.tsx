import { XCircle, Clock, Eye, Frown, DollarSign, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ProblemSection() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [shootsPerWeek, setShootsPerWeek] = useState(2);
  const [hoursPerShoot, setHoursPerShoot] = useState(1.5);
  const [billableRate, setBillableRate] = useState(35);
  const [teamSize, setTeamSize] = useState(1);
  const [hasManuallyAdjusted, setHasManuallyAdjusted] = useState(false);
  const [hasBillableRateChanged, setHasBillableRateChanged] = useState(false);

  // Logarithmic scale for billable rate (20 to 2000)
  const minRate = 20;
  const maxRate = 2000;
  const logMin = Math.log(minRate);
  const logMax = Math.log(maxRate);

  // Convert linear slider position (0-100) to logarithmic billable rate
  const sliderToBillableRate = (sliderValue: number) => {
    const scale = (logMax - logMin) / 100;
    return Math.round(Math.exp(logMin + scale * sliderValue));
  };

  // Convert billable rate to linear slider position (0-100)
  const billableRateToSlider = (rate: number) => {
    const scale = (logMax - logMin) / 100;
    return Math.round((Math.log(rate) - logMin) / scale);
  };

  // Check if user has manually customized the values (not via preset buttons)
  const headerText = hasManuallyAdjusted
    ? "Culling Manually Is Wasting Your Most Precious Productive Hours"
    : "The Average Kull Customer Wastes...";

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

  // Calculate savings by end of year
  const today = new Date();
  const endOfYear = new Date(today.getFullYear(), 11, 31); // December 31 of current year
  const daysInYear = new Date(today.getFullYear(), 11, 31).getDate() === 31
    ? (new Date(today.getFullYear(), 11, 31) - new Date(today.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24) + 1
    : 365;
  const daysRemaining = Math.max(0, Math.ceil((endOfYear - today) / (1000 * 60 * 60 * 24)) + 1);
  const yearProgressRatio = daysRemaining / daysInYear;
  const savingsByEndOfYear = Math.round(totalCostPerYear * yearProgressRatio);
  const hoursByEndOfYear = Math.round(totalHoursPerYear * yearProgressRatio);

  // Calculate percentage of total working hours
  const standardWorkingHoursPerYear = 40 * 52; // 2,080 hours
  const percentageOfWorkYear = ((totalHoursPerYear / standardWorkingHoursPerYear) * 100).toFixed(1);
  const weeksReclaimed = (totalHoursPerYear / 40).toFixed(1);

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
          <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/30 rounded-3xl p-8 md:p-10 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-4 mb-6">
                <DollarSign className="w-10 h-10 text-primary flex-shrink-0" />
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Manual culling is a pain that's wasting your time & your creativity
                </h2>
              </div>
              <div className="mb-6">
                <h3 className="text-3xl md:text-4xl font-black text-foreground">
                  Would you guess you're wasting{" "}
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
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mt-4">
                  <button
                    onClick={() => document.getElementById('calculator-sliders')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    className="font-bold text-destructive hover:text-destructive/80 underline cursor-pointer transition-colors"
                  >
                    Move the sliders below
                  </button> to calculate exactly how much time/effort/energy you could save if you used Kull starting today.
                </p>
              </div>
            </div>

            {/* Results - Top */}
            <div className="mb-10">
              <div className="bg-gradient-to-br from-destructive/20 to-destructive/10 border-2 border-destructive/40 rounded-2xl p-8 mb-6">
                <div className="text-center mb-6">
                  <p className="text-sm uppercase tracking-wide text-muted-foreground font-bold mb-4">{headerText}</p>
                  <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
                    <div className="text-center flex-1">
                      <p className="text-5xl md:text-6xl font-black text-destructive mb-3">
                        ${totalCostPerYear.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground leading-snug">
                        worth of billable, working hours out of 2,080 spent on manual culling every year. Valued at <span className="font-bold text-foreground">${billableRate}/hr</span>{" "}
                        {!hasBillableRateChanged && (
                          <span className="inline-block">(
                          <button
                            onClick={() => document.getElementById('calculator-sliders')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                            className="font-bold text-white hover:text-white/80 underline cursor-pointer transition-colors"
                          >
                            change the sliders
                          </button> if that's not accurate)</span>
                        )}
                      </p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-5xl md:text-6xl font-black text-destructive mb-3">
                        {Math.round(totalHoursPerYear).toLocaleString()} <span className="text-3xl md:text-4xl">hrs</span>
                      </p>
                      <p className="text-sm text-muted-foreground leading-snug">
                        working hours spent on manual culling per year, or about <span className="font-bold text-foreground">{percentageOfWorkYear}%</span> of your total working hours a year
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-destructive/20">
                    <p className="text-base md:text-lg text-foreground font-semibold text-center">
                      That means Kull can help you reclaim <span className="text-destructive font-bold">{weeksReclaimed} weeks</span> you could be spending time with family or doing your actual creative work you love!
                    </p>
                  </div>
                  <div className="mt-6 pt-6 border-t border-destructive/20">
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                      Today is <span className="font-semibold text-foreground">{today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>.
                      By the end of {today.getFullYear()}, you'll have saved <span className="font-bold text-destructive">${savingsByEndOfYear.toLocaleString()}</span> and
                      gained <span className="font-bold text-destructive">{hoursByEndOfYear} extra hours</span> for the important part of your creative work:
                      editing the best, in focus, shots with compositions you like, without having to manually search and find them first—they'll just automatically rise to the top.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-center text-base md:text-lg font-bold text-white italic mb-4">
                How valuable is that extra time in your creative zone, or spent with your loved ones?
              </p>

              <Button
                size="lg"
                className="w-full h-auto min-h-[4rem] text-base md:text-lg font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-3"
                onClick={() => window.location.href = "/api/login"}
              >
                <span className="break-words leading-snug">Start Your Free Trial Now to Save ${totalCostPerYear.toLocaleString()}/yr</span>
              </Button>
              <p className="text-center mt-4 text-lg font-semibold text-muted-foreground">
                Reclaim <span className="text-foreground font-bold">{weeksReclaimed} entire workweeks</span> × <span className="text-foreground font-bold">{Math.round(totalHoursPerYear).toLocaleString()} billable hours</span> this year!
              </p>
            </div>

            {/* Calculator Sliders */}
            <div id="calculator-sliders" className="space-y-8">
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
                    <div className="text-right">
                      <div className="text-3xl font-black text-primary">{shootsPerWeek}</div>
                    </div>
                  </div>
                  <div className="relative pt-8 pb-4">
                    <input
                      type="range"
                      min="1"
                      max="14"
                      step="1"
                      value={shootsPerWeek}
                      onChange={(e) => {
                        setShootsPerWeek(parseInt(e.target.value));
                        setHasManuallyAdjusted(true);
                      }}
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
                      onChange={(e) => {
                        setHoursPerShoot(parseFloat(e.target.value));
                        setHasManuallyAdjusted(true);
                      }}
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
                      min="0"
                      max="100"
                      step="1"
                      value={billableRateToSlider(billableRate)}
                      onChange={(e) => {
                        setBillableRate(sliderToBillableRate(parseInt(e.target.value)));
                        setHasManuallyAdjusted(true);
                        setHasBillableRateChanged(true);
                      }}
                      className="w-full h-3 bg-primary/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                    />
                    <div className="absolute -bottom-1 left-0 right-0 text-xs text-muted-foreground font-mono">
                      <div className="relative h-4">
                        <span className="absolute left-0"><span className="absolute -top-6 left-0 w-px h-4 bg-border"></span>$20</span>
                        <span className="absolute left-[33.33%] -translate-x-1/2"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>$100</span>
                        <span className="absolute left-[66.67%] -translate-x-1/2"><span className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border"></span>$500</span>
                        <span className="absolute right-0"><span className="absolute -top-6 right-0 w-px h-4 bg-border"></span>$2000</span>
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
                      onChange={(e) => {
                        setTeamSize(parseInt(e.target.value));
                        setHasManuallyAdjusted(true);
                      }}
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
                      <p className="text-sm uppercase tracking-wide text-muted-foreground font-bold mb-4">{headerText}</p>
                      <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
                        <div className="text-center flex-1">
                          <p className="text-5xl md:text-6xl font-black text-destructive mb-3">
                            ${totalCostPerYear.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground leading-snug">
                            worth of billable, working hours out of 2,080 spent on manual culling every year. Valued at <span className="font-bold text-foreground">${billableRate}/hr</span>{" "}
                            {!hasBillableRateChanged && (
                              <span className="inline-block">(
                              <button
                                onClick={() => document.getElementById('calculator-sliders')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                className="font-bold text-white hover:text-white/80 underline cursor-pointer transition-colors"
                              >
                                change the sliders
                              </button> if that's not accurate)</span>
                            )}
                          </p>
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-5xl md:text-6xl font-black text-destructive mb-3">
                            {Math.round(totalHoursPerYear).toLocaleString()} <span className="text-3xl md:text-4xl">hrs</span>
                          </p>
                          <p className="text-sm text-muted-foreground leading-snug">
                            working hours spent on manual culling per year, or about <span className="font-bold text-foreground">{percentageOfWorkYear}%</span> of your total working hours a year
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-destructive/20">
                        <p className="text-base md:text-lg text-foreground font-semibold text-center">
                          That means Kull can help you reclaim <span className="text-destructive font-bold">{weeksReclaimed} weeks</span> you could be spending time with family or doing your actual creative work you love!
                        </p>
                      </div>
                      <div className="mt-6 pt-6 border-t border-destructive/20">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                          Today is <span className="font-semibold text-foreground">{today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>.
                          By the end of {today.getFullYear()}, you'll have saved <span className="font-bold text-destructive">${savingsByEndOfYear.toLocaleString()}</span> and
                          gained <span className="font-bold text-destructive">{hoursByEndOfYear} extra hours</span> for the important part of your creative work:
                          editing the best, in focus, shots with compositions you like, without having to manually search and find them first—they'll just automatically rise to the top.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-base md:text-lg font-bold text-white italic mb-4">
                    How valuable is that extra time in your creative zone, or spent with your loved ones?
                  </p>

                  <Button
                    size="lg"
                    className="w-full h-auto min-h-[4rem] text-base md:text-lg font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-3"
                    onClick={() => window.location.href = "/api/login"}
                  >
                    <span className="break-words leading-snug">Start Your Free Trial Now to Save ${totalCostPerYear.toLocaleString()}/yr</span>
                  </Button>
                  <p className="text-center mt-4 text-lg font-semibold text-muted-foreground">
                    Reclaim <span className="text-foreground font-bold">{weeksReclaimed} entire workweeks</span> × <span className="text-foreground font-bold">{Math.round(totalHoursPerYear).toLocaleString()} billable hours</span> this year!
                  </p>
                </div>
              </div>
          </div>
        </div>
      </div>
    </section>
  );
}
