import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useState } from "react";

export function CompactSavingsSummary() {
  const [shootsPerWeek, setShootsPerWeek] = useState(2);
  const [hoursPerShoot, setHoursPerShoot] = useState(1.5);
  const [billableRate, setBillableRate] = useState(35);
  const [hasManuallyAdjusted, setHasManuallyAdjusted] = useState(false);
  const teamSize = 1;

  const weeksPerYear = 52;
  const totalHoursPerYear = shootsPerWeek * hoursPerShoot * weeksPerYear * teamSize;
  const totalCostPerYear = totalHoursPerYear * billableRate;
  const workweeksSaved = totalHoursPerYear / 40;

  // Calculate end of year savings
  const today = new Date();
  const endOfYear = new Date(today.getFullYear(), 11, 31);
  const daysInYear = 365;
  const daysRemaining = Math.max(0, Math.ceil((endOfYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const yearProgressRatio = daysRemaining / daysInYear;
  const savingsByEndOfYear = Math.round(totalCostPerYear * yearProgressRatio);
  const hoursByEndOfYear = Math.round(totalHoursPerYear * yearProgressRatio);

  const standardWorkingHoursPerYear = 40 * 52;
  const percentageOfWorkYear = ((totalHoursPerYear / standardWorkingHoursPerYear) * 100).toFixed(1);

  const handleStartTrial = () => {
    window.location.href = "/api/login";
  };

  const scrollToCalculator = () => {
    const element = document.getElementById('calculator-sliders');
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const headerText = hasManuallyAdjusted
    ? "You Could Save..."
    : "The Average Kull Customer Saves...";

  return (
    <div className="max-w-5xl mx-auto mt-16 px-4">
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-wide text-center text-muted-foreground font-bold mb-4">
          {headerText}
        </p>

        {/* Compact quick adjusters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Shoots/week:</label>
            <input
              type="number"
              min="1"
              max="14"
              step="1"
              value={shootsPerWeek}
              onChange={(e) => {
                setShootsPerWeek(parseInt(e.target.value) || 2);
                setHasManuallyAdjusted(true);
              }}
              className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground text-xs text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Hours/shoot:</label>
            <input
              type="number"
              min="0.5"
              max="8"
              step="0.5"
              value={hoursPerShoot}
              onChange={(e) => {
                setHoursPerShoot(parseFloat(e.target.value) || 1.5);
                setHasManuallyAdjusted(true);
              }}
              className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground text-xs text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Rate/hr:</label>
            <input
              type="number"
              min="20"
              max="500"
              step="5"
              value={billableRate}
              onChange={(e) => {
                setBillableRate(parseInt(e.target.value) || 35);
                setHasManuallyAdjusted(true);
              }}
              className="w-20 px-2 py-1 rounded border border-border bg-background text-foreground text-xs text-center"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="text-center">
            <p className="text-4xl md:text-5xl font-black text-primary mb-2">
              ${totalCostPerYear.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              worth of billable hours saved per year at ${billableRate}/hr
            </p>
          </div>
          <div className="text-center">
            <p className="text-4xl md:text-5xl font-black text-primary mb-2">
              {Math.round(totalHoursPerYear)} <span className="text-2xl">hrs</span>
            </p>
            <p className="text-xs text-muted-foreground">
              or {percentageOfWorkYear}% of your total working hours
            </p>
          </div>
        </div>

        <div className="bg-card/50 rounded-xl p-4 mb-6 space-y-3">
          <p className="text-sm text-center text-foreground">
            <span className="font-bold text-primary">Reclaim {workweeksSaved.toFixed(1)} weeks</span> for family or creative work you love
          </p>
          <p className="text-xs text-center text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
            By end of {today.getFullYear()}: save <span className="font-bold text-primary">${savingsByEndOfYear.toLocaleString()}</span> and gain <span className="font-bold text-primary">{hoursByEndOfYear} hours</span> for editing your best shots.{" "}
            <button
              onClick={scrollToCalculator}
              className="text-primary font-semibold hover:underline cursor-pointer"
            >
              Sound incorrect? Try our calculator
            </button>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-semibold">Risk-Free Trial • Cancel Anytime</span>
          </div>
          <Button onClick={handleStartTrial} size="lg" className="w-full sm:w-auto">
            Start Free Trial — Save ${totalCostPerYear.toLocaleString()}/yr
          </Button>
        </div>
      </div>
    </div>
  );
}
