import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface ApprovalConfirmationProps {
  autoCloseDelay?: number; // milliseconds, 0 to disable
  showManageLink?: boolean;
}

/**
 * Success confirmation after device approval
 * Features:
 * - Animated checkmark
 * - Clear success message
 * - Optional auto-close
 * - Link to manage devices
 */
export function ApprovalConfirmation({
  autoCloseDelay = 5000,
  showManageLink = true,
}: ApprovalConfirmationProps) {
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(autoCloseDelay > 0 ? Math.ceil(autoCloseDelay / 1000) : 0);

  useEffect(() => {
    if (autoCloseDelay > 0) {
      // Countdown timer
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Auto-close - you can customize this behavior
            // For now, we'll just navigate to home
            window.close(); // Try to close the window (works if opened via window.open)
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [autoCloseDelay]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-2 border-green-500/20 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6 text-center">
          {/* Animated Checkmark */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <CheckCircle2 className="w-20 h-20 text-green-600 dark:text-green-500 animate-scale-in" />
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
            </div>
          </div>

          {/* Success Message */}
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
            Device Approved!
          </h2>

          <p className="text-green-800 dark:text-green-200 mb-6">
            You can now return to your device and start using Kull AI.
          </p>

          {/* Additional Info */}
          <div className="bg-white dark:bg-gray-950 rounded-lg p-4 mb-6 border border-green-200 dark:border-green-800">
            <p className="text-sm text-muted-foreground">
              Your device has been successfully authenticated and is now connected to your account.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {showManageLink && (
              <Button
                variant="default"
                onClick={() => navigate('/settings/devices')}
                className="w-full"
              >
                Manage Devices
              </Button>
            )}

            {countdown > 0 && (
              <p className="text-xs text-muted-foreground">
                This page will close in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
            )}

            <Button
              variant="ghost"
              onClick={() => window.close()}
              className="w-full"
            >
              Close This Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add custom animation to tailwind config if not already present
// In your tailwind.config.js, add:
// animation: {
//   'scale-in': 'scale-in 0.5s ease-out',
//   'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
// },
// keyframes: {
//   'scale-in': {
//     '0%': { transform: 'scale(0)', opacity: '0' },
//     '50%': { transform: 'scale(1.1)' },
//     '100%': { transform: 'scale(1)', opacity: '1' },
//   },
// }
