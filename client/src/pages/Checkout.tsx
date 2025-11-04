import { useEffect, useState } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Crown, Zap, AlertCircle, Gift } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePageTracking } from "@/hooks/usePageTracking";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ tier, setupIntentId, onDowngrade, bonus }: { 
  tier: 'professional' | 'studio'; 
  setupIntentId: string | null;
  onDowngrade: () => void;
  bonus: { freeMonths: number; prioritySupport: boolean; description: string } | null;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDowngrade, setShowDowngrade] = useState(false);
  const [downgradeInfo, setDowngradeInfo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Submit the SetupIntent
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Setup Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Now confirm the trial with our backend
      if (setupIntent && setupIntent.id) {
        const response = await apiRequest("POST", "/api/trial/confirm", {
          setupIntentId: setupIntent.id,
          tier,
        });

        if (!response.ok) {
          const errorData = await response.json();
          
          // Check if it's a downgrade required response
          if (response.status === 402 && errorData.requiresDowngrade) {
            setDowngradeInfo(errorData);
            setShowDowngrade(true);
            setIsProcessing(false);
            return;
          }

          throw new Error(errorData.message || 'Failed to confirm trial');
        }

        const data = await response.json();
        
        toast({
          title: "Trial Started!",
          description: "Your 24-hour free trial has begun. Download the app now!",
        });
        
        setLocation('/');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start trial. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleDowngradeToMonthly = async () => {
    if (!setupIntentId) return;
    
    setIsProcessing(true);
    
    try {
      const response = await apiRequest("POST", "/api/trial/downgrade-monthly", {
        setupIntentId,
        tier,
      });

      if (!response.ok) {
        throw new Error('Failed to downgrade to monthly');
      }

      toast({
        title: "Trial Started!",
        description: "Your 24-hour free trial has begun with monthly billing. Download the app now!",
      });
      
      setLocation('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to switch to monthly billing.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const monthlyPrice = tier === 'studio' ? 499 : 99;
  const annualPrice = monthlyPrice * 12;
  const discountAmount = (bonus?.freeMonths || 0) * monthlyPrice;
  const finalAnnualPrice = annualPrice - discountAmount;
  
  const planDetails = tier === 'studio' ? {
    name: 'Studio',
    price: '$499',
    period: '/month',
    annual: bonus?.freeMonths ? `$${finalAnnualPrice.toLocaleString()}/year` : '$5,988/year',
    annualTotal: bonus?.freeMonths ? `$${finalAnnualPrice.toLocaleString()}` : '$5,988',
    monthlyTotal: '$499',
    savings: bonus?.freeMonths 
      ? `${bonus.freeMonths} month${bonus.freeMonths > 1 ? 's' : ''} free = Save $${(discountAmount + 2004).toLocaleString()}!`
      : 'Save $2,004 vs monthly'
  } : {
    name: 'Professional',
    price: '$99',
    period: '/month',
    annual: bonus?.freeMonths ? `$${finalAnnualPrice.toLocaleString()}/year` : '$1,188/year',
    annualTotal: bonus?.freeMonths ? `$${finalAnnualPrice.toLocaleString()}` : '$1,188',
    monthlyTotal: '$99',
    savings: bonus?.freeMonths 
      ? `${bonus.freeMonths} month${bonus.freeMonths > 1 ? 's' : ''} free = Save $${(discountAmount + 396).toLocaleString()}!`
      : 'Save $396 vs monthly'
  };

  return (
    <>
      {bonus && bonus.freeMonths > 0 && (
        <Alert className="mb-6 border-primary/50 bg-primary/10">
          <Gift className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-foreground">
            <p className="font-bold text-primary">{bonus.description}</p>
            <p className="mt-1">You've earned <strong>{bonus.freeMonths} month{bonus.freeMonths > 1 ? 's' : ''} free</strong> through referrals. This discount has been applied to your annual price below!</p>
            {bonus.prioritySupport && (
              <p className="mt-1 text-primary font-semibold">Plus priority support access!</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {showDowngrade && downgradeInfo && (
        <Alert className={`mb-6 ${downgradeInfo.bonus?.freeMonths > 0 ? 'border-primary/50 bg-primary/10' : 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20'}`}>
          {downgradeInfo.bonus?.freeMonths > 0 ? (
            <Gift className="h-4 w-4 text-primary" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          )}
          <AlertDescription className={`text-sm ${downgradeInfo.bonus?.freeMonths > 0 ? 'text-foreground' : 'text-amber-900 dark:text-amber-100'}`}>
            <p className="font-semibold mb-2">
              {downgradeInfo.bonus?.freeMonths > 0 
                ? 'Good news about your referral bonuses!' 
                : `Unable to authorize $${downgradeInfo.annualAmount} for annual billing`}
            </p>
            <p className="mb-3">
              {downgradeInfo.bonus?.freeMonths > 0 
                ? `You earned ${downgradeInfo.bonus.freeMonths} month${downgradeInfo.bonus.freeMonths > 1 ? 's' : ''} free! Switch to monthly billing with $${downgradeInfo.monthlyAmount === 0 ? '0' : downgradeInfo.monthlyAmount} for your first month?`
                : `Would you like to try monthly billing at $${downgradeInfo.monthlyAmount}/month instead?`}
            </p>
            <div className="flex gap-3">
              <Button 
                size="sm" 
                onClick={handleDowngradeToMonthly}
                disabled={isProcessing}
                data-testid="button-downgrade-monthly"
              >
                {isProcessing ? 'Processing...' : downgradeInfo.monthlyAmount === 0 ? 'Start Free Trial' : 'Switch to Monthly'}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowDowngrade(false)}
                data-testid="button-cancel-downgrade"
              >
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-card-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            {tier === 'studio' && <Crown className="w-6 h-6 text-primary" />}
            {tier === 'professional' && <Zap className="w-6 h-6 text-primary" />}
            <h3 className="text-2xl font-bold text-card-foreground">{planDetails.name} Plan</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-foreground">{planDetails.price}</span>
            <span className="text-muted-foreground">{planDetails.period}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Billed annually at {planDetails.annual}</p>
          <p className="text-xs text-primary mb-4">{planDetails.savings}</p>
          
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold text-foreground mb-2">Card Pre-Authorization</p>
            <p className="text-xs text-muted-foreground">
              To prevent fraud, we require a {planDetails.annualTotal} hold on your card for the annual plan 1-day trial. We will email you to remind you 6 hours and 1 hour before it goes through, and only actually charge you once your 24-hour trial ends, but the hold will show on your card until then. Cancel anytime in that period for zero charge and the hold will be immediately removed.
            </p>
          </div>
        </div>

        <div className="bg-muted/30 border border-border rounded-xl p-6">
          <PaymentElement />
        </div>

        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full h-12 text-base"
          data-testid="button-start-trial"
        >
          {isProcessing ? 'Processing...' : 'Start Free 24-Hour Trial'}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By starting your trial, you agree to our Terms of Service and Privacy Policy.
          You can cancel anytime during your 24-hour trial with zero charge.
        </p>
      </form>
    </>
  );
};

export default function Checkout() {
  usePageTracking('checkout');
  const [clientSecret, setClientSecret] = useState("");
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const [bonus, setBonus] = useState<{ freeMonths: number; prioritySupport: boolean; description: string } | null>(null);
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  // Get tier from URL params
  const params = new URLSearchParams(window.location.search);
  const tier = (params.get('plan') || 'professional') as 'professional' | 'studio';

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (user) {
      // Create SetupIntent for trial
      apiRequest("POST", "/api/trial/setup-intent", { tier })
        .then((res) => res.json())
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
            setBonus(data.bonus || null);
          } else {
            toast({
              title: "Trial Already Active",
              description: "You already have an active trial or subscription!",
            });
            setLocation('/');
          }
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to initialize trial. Please try again.",
            variant: "destructive",
          });
        });
    }
  }, [user, isLoading, tier, toast, setLocation]);

  if (isLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" data-testid="loading-spinner"/>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" data-testid="loading-spinner"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -ml-2 transition-all"
            data-testid="button-logo-home"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-black text-lg">K</span>
            </div>
            <span className="text-xl font-black text-foreground">Kull</span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </nav>

      {/* Checkout form */}
      <main className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black mb-4 text-foreground" data-testid="text-checkout-headline">
            Start Your Free Trial
          </h1>
          <p className="text-muted-foreground">
            24 hours of unlimited AI photo rating. No charge until trial ends.
          </p>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm 
            tier={tier} 
            setupIntentId={setupIntentId}
            onDowngrade={() => {}}
            bonus={bonus}
          />
        </Elements>
      </main>

      <Footer />
    </div>
  );
}
