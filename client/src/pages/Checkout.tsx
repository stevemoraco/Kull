import { useEffect, useState } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Crown, Zap } from "lucide-react";
import { Footer } from "@/components/Footer";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ tier }: { tier: 'professional' | 'studio' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      toast({
        title: "Payment Successful",
        description: "Welcome to Kull AI! Download your app now.",
      });
      setLocation('/');
    }
  };

  const planDetails = tier === 'studio' ? {
    name: 'Studio',
    price: '$499',
    period: '/month',
    annual: '$5,988/year',
    savings: 'Save $2,004 vs monthly'
  } : {
    name: 'Professional',
    price: '$99',
    period: '/month',
    annual: '$1,188/year',
    savings: 'Save $396 vs monthly'
  };

  return (
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
        <p className="text-xs text-primary">{planDetails.savings}</p>
      </div>

      <div className="bg-muted/30 border border-border rounded-xl p-6">
        <PaymentElement />
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full h-12 text-base"
        data-testid="button-submit-payment"
      >
        {isProcessing ? 'Processing...' : 'Subscribe Now'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By subscribing, you agree to our Terms of Service and Privacy Policy.
        Cancel anytime from your account settings.
      </p>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
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
      // Create subscription
      apiRequest("POST", "/api/create-subscription", { tier })
        .then((res) => res.json())
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            toast({
              title: "Subscription Active",
              description: "You already have an active subscription!",
            });
            setLocation('/');
          }
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to initialize checkout. Please try again.",
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-black text-lg">K</span>
            </div>
            <span className="text-xl font-black text-foreground">Kull AI</span>
          </div>
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
            Complete Your Subscription
          </h1>
          <p className="text-muted-foreground">
            Start rating photos with AI in minutes
          </p>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm tier={tier} />
        </Elements>
      </main>

      <Footer />
    </div>
  );
}
