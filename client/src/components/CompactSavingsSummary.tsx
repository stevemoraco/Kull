import { Button } from "@/components/ui/button";
import { Shield, Download } from "lucide-react";
import { useCalculator } from "@/contexts/CalculatorContext";
import { useState, useRef, MouseEvent } from "react";

export function CompactSavingsSummary() {
  // Get real-time values from calculator context
  const { shootsPerWeek, hoursPerShoot, billableRate, hasManuallyAdjusted, hasClickedPreset } = useCalculator();
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
    // Server-side /api/login already handles logged-in users by redirecting to /
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
    : hasClickedPreset
    ? "You could be saving as much as..."
    : "The average Kull customer saves...";

  return (
    <div className="max-w-4xl mx-auto mt-16 px-4 pb-8">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative border-4 rounded-2xl cursor-pointer overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgb(0, 0, 0) 0%, hsl(180, 95%, 15%) 30%, hsl(180, 85%, 35%) 60%, rgb(6, 182, 212) 60%, rgb(45, 212, 191) 80%, rgb(16, 185, 129) 100%)',
          backgroundSize: '400% 400%',
          backgroundPosition: isHovered ? '100% 100%' : '0% 0%',
          animation: isHovered ? 'gradientPulse 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
          transition: isHovered
            ? 'background-position 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55), box-shadow 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55), border-color 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)'
            : 'background-position 0.8s ease-out, box-shadow 0.8s ease-out, border-color 0.8s ease-out, filter 0.8s ease-out, transform 0.8s ease-out',
          boxShadow: isHovered
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : '0 10px 30px -5px rgba(0, 0, 0, 0.4)',
          borderColor: isHovered ? 'rgb(103, 232, 249)' : 'hsl(180, 70%, 45%)'
        }}
      >
        {/* Inner gradient overlays for intense depth */}
        <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500 ${
          isHovered ? 'bg-gradient-to-t from-cyan-700/30 to-transparent' : 'bg-gradient-to-t from-black/50 to-transparent'
        }`} />
        <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500 ${
          isHovered ? 'bg-gradient-to-br from-white/20 via-transparent to-emerald-400/20' : 'bg-gradient-to-br from-transparent via-primary/10 to-transparent'
        }`} />

        {/* Responsive layout: flex column on mobile, row on desktop */}
        <div className="relative z-10 flex flex-col md:flex-row">
          {/* Kull Logo - Top on mobile, Left square section on desktop */}
          <div className="flex flex-col items-center md:items-start md:justify-center md:w-[30%] pt-16 px-6 pb-6 md:p-8 gap-3 md:min-h-full">
            <div className="flex flex-col items-center gap-3">
              <div className={`relative w-32 h-32 md:w-full md:h-auto md:aspect-square md:max-w-[200px] bg-white border-2 flex items-center justify-center overflow-hidden transition-all duration-300 ${
                isButtonHovered
                  ? 'border-white scale-105'
                  : 'border-primary/40 shadow-lg shadow-black/50'
              }`}
              style={{ borderRadius: '22.37%' }}>
                <img src="/kull-logo.png" alt="Kull" className="w-11/12 h-11/12" style={{ borderRadius: '20%' }} />
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

          <div className="bg-black/50 backdrop-blur-sm border border-white/40 rounded-xl p-4 mb-6 space-y-3">
            <p className="text-sm text-center text-white font-bold">
              <span className="text-white drop-shadow">Reclaim {workweeksSaved.toFixed(1)} weeks <span className="underline font-black italic">every year</span></span> for family or creative work you love
            </p>
            <p className="text-xs text-center text-white/95 leading-relaxed border-t border-white/40 pt-3">
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
              className={`w-full sm:w-auto rounded-3xl font-black text-base px-6 py-4 shadow-xl transition-all duration-300 border-2 transform-gpu relative overflow-hidden ${
                isButtonHovered
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-900 border-amber-300 shadow-amber-500/50 animate-dance-tilt'
                  : 'bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-600 text-white border-cyan-400 shadow-cyan-500/30 hover:scale-105'
              }`}
              style={isButtonHovered ? {
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite linear, dance-tilt 1s ease-in-out infinite'
              } : {}}
            >
              <Download className="w-5 h-5 mr-2 inline-block relative z-10" />
              <span className="relative z-10">Download Kull Free</span>
              {isButtonHovered && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine" />
              )}
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
