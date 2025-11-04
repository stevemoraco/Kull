import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StripePaymentModalProps {
  open: boolean;
  onClose: () => void;
  packageAmount: 500 | 1000;
  onSuccess: () => void;
}

export function StripePaymentModal({
  open,
  onClose,
  packageAmount,
  onSuccess,
}: StripePaymentModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasBonus = packageAmount === 1000;
  const totalCredits = hasBonus ? 110000 : packageAmount * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Failed to submit payment details');
        setLoading(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/credits?payment=success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      console.error('[Payment] Error:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !success) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Purchase {packageAmount === 1000 ? '$1,000' : '$500'} in Credits
            {hasBonus && (
              <Badge variant="secondary" className="ml-2">
                +$100 Bonus
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Complete your purchase to add {(totalCredits / 100).toLocaleString()} credits to your account
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">
                Your credits are being added to your account
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Package Summary */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Package</span>
                <span className="font-medium">${packageAmount}</span>
              </div>
              {hasBonus && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bonus</span>
                  <span className="font-medium text-green-600">+$100</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="font-medium">Total Credits</span>
                <span className="font-bold">{(totalCredits / 100).toLocaleString()} credits</span>
              </div>
            </div>

            {/* Payment Element */}
            <div className="space-y-4">
              <PaymentElement />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex-col sm:flex-col gap-3">
              <Button
                type="submit"
                size="lg"
                disabled={!stripe || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay $${packageAmount}`
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>Secure payment powered by Stripe</span>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={loading}
                className="w-full"
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
