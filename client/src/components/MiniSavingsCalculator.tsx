import { Calendar, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function MiniSavingsCalculator() {
  const [nextShoot, setNextShoot] = useState<"week" | "month" | "date">("week");
  const [photosInEditing, setPhotosInEditing] = useState<"0" | "1" | "2" | "3" | "more">("2");
  const [customShootCount, setCustomShootCount] = useState("1");
  const [selectedDate, setSelectedDate] = useState("");

  const handleStartTrial = () => {
    window.location.href = "/api/login";
  };

  const hoursPerShoot = 1.5;
  const billableRate = 35;

  const shootCount = photosInEditing === "more"
    ? parseInt(customShootCount) || 1
    : photosInEditing === "0"
    ? 0
    : parseInt(photosInEditing);

  const getDaysUntilShoot = () => {
    if (nextShoot === "week") return 7;
    if (nextShoot === "month") return 30;
    if (nextShoot === "date" && selectedDate) {
      const selected = new Date(selectedDate);
      const today = new Date();
      const diffTime = selected.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays);
    }
    return 7;
  };

  const daysUntilShoot = getDaysUntilShoot();
  const totalHoursSaved = shootCount * hoursPerShoot;
  const totalMoneySaved = totalHoursSaved * billableRate;
  const nextShootSavings = hoursPerShoot * billableRate;

  return (
    <div className="max-w-4xl mx-auto mt-12 mb-8">
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-6">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Next shoot toggle */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Next photoshoot?</p>
            <div className="flex gap-1">
              <button onClick={() => setNextShoot("week")} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${nextShoot === "week" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
                This week
              </button>
              <button onClick={() => setNextShoot("month")} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${nextShoot === "month" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
                This month
              </button>
              <button onClick={() => setNextShoot("date")} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${nextShoot === "date" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
                <Calendar className="w-3 h-3" />
                Date
              </button>
            </div>
            {nextShoot === "date" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full mt-2 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                min={new Date().toISOString().split('T')[0]}
              />
            )}
          </div>

          {/* Shoots in editing toggle */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Shoots in editing?</p>
            <div className="flex gap-1">
              {["0", "1", "2", "3", "more"].map((val) => (
                <button
                  key={val}
                  onClick={() => setPhotosInEditing(val as any)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${photosInEditing === val ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                >
                  {val === "more" ? "More" : val}
                </button>
              ))}
            </div>
            {photosInEditing === "more" && (
              <input
                type="number"
                min="1"
                value={customShootCount}
                onChange={(e) => setCustomShootCount(e.target.value)}
                className="w-full mt-2 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs text-center"
                placeholder="How many?"
              />
            )}
          </div>
        </div>

        {/* Compact savings display */}
        <div className="bg-card/50 rounded-lg p-4 space-y-3">
          {shootCount > 0 && (
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Process {shootCount} {shootCount === 1 ? 'shoot' : 'shoots'} & save:</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary">{totalHoursSaved.toFixed(1)}h</span>
                <span className="text-lg font-bold text-primary">${totalMoneySaved}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Next shoot in {daysUntilShoot}d:</span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-primary">{hoursPerShoot}h</span>
              <span className="text-lg font-bold text-primary">${nextShootSavings}</span>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border/50">
            Processed in <span className="text-primary font-semibold">seconds</span>. Reclaim your time.
          </p>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3 text-primary" />
            <span className="font-semibold">Risk-Free • Cancel Anytime</span>
          </div>
          <Button onClick={handleStartTrial} size="sm" className="text-xs">
            Start Free Trial
          </Button>
        </div>
      </div>
    </div>
  );
}
