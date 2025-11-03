import { useEffect, useState } from "react";

interface CountdownTimerProps {
  expiresAt: Date | string;
  onExpire?: () => void;
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = new Date(expiresAt).getTime() - new Date().getTime();
    
    if (difference <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    return {
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      expired: false,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.expired && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  if (timeLeft.expired) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4">
      <div className="flex flex-col items-center">
        <div className="bg-card border border-card-border rounded-lg p-2 md:p-3 min-w-[60px] md:min-w-[80px]">
          <span className="text-3xl md:text-5xl font-bold tabular-nums text-foreground">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
        </div>
        <span className="text-xs md:text-sm text-muted-foreground mt-1">Hours</span>
      </div>
      <span className="text-2xl md:text-4xl font-bold text-muted-foreground">:</span>
      <div className="flex flex-col items-center">
        <div className="bg-card border border-card-border rounded-lg p-2 md:p-3 min-w-[60px] md:min-w-[80px]">
          <span className="text-3xl md:text-5xl font-bold tabular-nums text-foreground">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
        </div>
        <span className="text-xs md:text-sm text-muted-foreground mt-1">Minutes</span>
      </div>
      <span className="text-2xl md:text-4xl font-bold text-muted-foreground">:</span>
      <div className="flex flex-col items-center">
        <div className="bg-card border border-card-border rounded-lg p-2 md:p-3 min-w-[60px] md:min-w-[80px]">
          <span className="text-3xl md:text-5xl font-bold tabular-nums text-foreground">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
        </div>
        <span className="text-xs md:text-sm text-muted-foreground mt-1">Seconds</span>
      </div>
    </div>
  );
}
