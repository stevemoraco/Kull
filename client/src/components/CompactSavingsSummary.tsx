import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useCalculator } from "@/contexts/CalculatorContext";
import { useState, useRef, MouseEvent } from "react";

export function CompactSavingsSummary() {
  // Get real-time values from calculator context
  const { shootsPerWeek, hoursPerShoot, billableRate, hasManuallyAdjusted } = useCalculator();
  const teamSize = 1;

  // Simple hover effect
  const [isHovered, setIsHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

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
    ? "Culling manually is wasting your most precious productive hours. Instead you could save..."
    : "The Average Kull Customer Saves...";

  return (
    <div className="max-w-4xl mx-auto mt-16 px-4">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative bg-gradient-to-br from-black via-[hsl(180,95%,15%)] to-[hsl(180,85%,35%)] border-4 rounded-2xl shadow-2xl cursor-pointer transition-all duration-300 ${
          isHovered
            ? 'shadow-[0_35px_100px_-15px_hsl(180,70%,45%)] border-primary scale-105'
            : 'shadow-primary/40 border-[hsl(180,70%,45%)] scale-100'
        }`}
      >
        {/* Inner gradient overlays for intense depth */}
        <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 ${
          isHovered ? 'bg-gradient-to-t from-black/60 to-transparent' : 'bg-gradient-to-t from-black/50 to-transparent'
        }`} />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/10 to-transparent rounded-2xl pointer-events-none" />
        <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 ${
          isHovered ? 'bg-gradient-to-br from-white/10 via-transparent to-primary/20 opacity-100' : 'opacity-0'
        }`} />

        {/* Responsive layout: flex column on mobile, row on desktop */}
        <div className="relative z-10 flex flex-col md:flex-row">
          {/* Kull Logo - Top on mobile, Left square section on desktop */}
          <div className="flex flex-col items-center md:items-start md:justify-center md:w-[30%] p-6 md:p-8 gap-3 md:min-h-full">
            <div className="flex flex-col items-center gap-3">
              <div className={`relative w-32 h-32 md:w-full md:h-auto md:aspect-square md:max-w-[200px] rounded-3xl bg-gradient-to-br from-black to-[hsl(180,60%,20%)] border-2 flex items-center justify-center overflow-hidden transition-all duration-300 ${
                isButtonHovered
                  ? 'border-white scale-105'
                  : 'border-primary/40 shadow-lg shadow-black/50'
              }`}>
                <img src="/kull-logo.png" alt="Kull" className="w-4/5 h-4/5 rounded-2xl" />
              </div>
              <p className="text-white text-base font-semibold tracking-wide">Kull</p>
            </div>
          </div>

          {/* Content section */}
          <div className="flex-1 p-6 md:p-8 md:pl-0">
          <p className="text-xs uppercase tracking-wide text-center text-white font-bold mb-4">
            {headerText}
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
                ${totalCostPerYear.toLocaleString()}
              </p>
              <p className="text-xs text-white/90 font-medium">
                worth of billable hours per year at ${billableRate}/hr
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
                {Math.round(totalHoursPerYear)} <span className="text-2xl">hrs</span>
              </p>
              <p className="text-xs text-white/90 font-medium">
                or {percentageOfWorkYear}% of your total working hours
              </p>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4 mb-6 space-y-3">
            <p className="text-sm text-center text-white font-bold">
              <span className="text-white drop-shadow">Reclaim {workweeksSaved.toFixed(1)} weeks <span className="underline font-black italic">every year</span></span> for family or creative work you love
            </p>
            <p className="text-xs text-center text-white/95 leading-relaxed border-t border-white/30 pt-3">
              By end of {today.getFullYear()}: save <span className="font-bold">${savingsByEndOfYear.toLocaleString()}</span> and gain <span className="font-bold">{hoursByEndOfYear} hours</span> for editing your best shots.{" "}
              <button
                onClick={scrollToCalculator}
                className="text-white font-bold hover:underline cursor-pointer underline decoration-2 decoration-white/60"
              >
                Sound incorrect? Try our calculator
              </button>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-white font-semibold">
              <Shield className="w-5 h-5 text-white drop-shadow flex-shrink-0" />
              <span>Risk-Free Trial • Cancel Anytime</span>
            </div>
            <Button
              onClick={handleStartTrial}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
              size="lg"
              className="w-full sm:w-auto rounded-3xl bg-gradient-to-r from-[hsl(180,70%,35%)] via-primary to-white hover:from-[hsl(180,75%,40%)] hover:via-[hsl(180,75%,50%)] hover:to-white text-[hsl(180,70%,15%)] font-black text-base px-6 py-4 shadow-xl shadow-primary/30 transition-all duration-300 border-2 border-[hsl(180,80%,60%)] hover:border-[hsl(180,90%,70%)] hover:scale-105 transform-gpu"
            >
              ⚡ Start Free Trial — Save ${totalCostPerYear.toLocaleString()}/yr now
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
