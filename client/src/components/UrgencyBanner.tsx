import { CountdownTimer } from "./CountdownTimer";
import { AlertCircle } from "lucide-react";

interface UrgencyBannerProps {
  expiresAt: Date | string;
}

export function UrgencyBanner({ expiresAt }: UrgencyBannerProps) {
  return (
    <div className="sticky top-0 z-50 bg-primary text-primary-foreground border-b border-primary-border shadow-lg" data-testid="banner-urgency">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold text-sm md:text-base">
              Special Offer Expires In:
            </span>
          </div>
          <CountdownTimer expiresAt={expiresAt} />
          <div className="text-xs md:text-sm font-medium">
            Save 40% on Annual Plans
          </div>
        </div>
      </div>
    </div>
  );
}
