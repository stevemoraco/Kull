import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BalanceCard } from '@/components/credits/BalanceCard';
import { PurchasePackages } from '@/components/credits/PurchasePackages';
import { StripePaymentModal } from '@/components/credits/StripePaymentModal';
import { TransactionHistory } from '@/components/credits/TransactionHistory';
import { UsageSummary } from '@/components/credits/UsageSummary';
import { useCredits, useCreditTransactions, useCreditUsageSummary } from '@/hooks/useCredits';
import { purchaseCredits, confirmPurchase } from '@/api/credits';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function Credits() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { balance, loading: balanceLoading, refetch: refetchBalance } = useCredits();
  const { transactions, loading: transactionsLoading, hasMore, loadMore, refetch: refetchTransactions } = useCreditTransactions(20);
  const { summary, loading: summaryLoading, refetch: refetchSummary } = useCreditUsageSummary();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<500 | 1000>(500);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Check for payment success in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');

    if (paymentStatus === 'success') {
      toast({
        title: 'Payment Successful',
        description: 'Your credits have been added to your account',
      });
      // Clean up URL
      window.history.replaceState({}, '', '/credits');
      // Refetch data
      refetchBalance();
      refetchTransactions();
      refetchSummary();
    }
  }, [toast, refetchBalance, refetchTransactions, refetchSummary]);

  const handleSelectPackage = async (amount: 500 | 1000) => {
    try {
      setPurchaseLoading(true);
      setSelectedPackage(amount);

      const { clientSecret: secret, paymentIntentId: intentId } = await purchaseCredits(amount);
      setClientSecret(secret);
      setPaymentIntentId(intentId);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error('[Credits] Error initiating purchase:', error);
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Failed to initiate purchase. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (paymentIntentId) {
      try {
        await confirmPurchase(paymentIntentId);
        toast({
          title: 'Credits Added!',
          description: 'Your credits have been successfully added to your account.',
        });
      } catch (error: any) {
        console.error('[Credits] Error confirming purchase:', error);
      }
    }

    // Refetch all data
    refetchBalance();
    refetchTransactions();
    refetchSummary();

    // Reset state
    setClientSecret(null);
    setPaymentIntentId(null);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setClientSecret(null);
    setPaymentIntentId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold tracking-tight">Credits</h1>
            <p className="text-muted-foreground mt-1">
              Manage your AI culling credits and view usage history
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column - Balance and Purchase */}
          <div className="lg:col-span-1 space-y-6">
            <BalanceCard
              balance={balance}
              loading={balanceLoading}
              onAddCredits={() => setShowPaymentModal(true)}
            />
          </div>

          {/* Right column - Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Purchase Packages */}
            <PurchasePackages
              onSelectPackage={handleSelectPackage}
              loading={purchaseLoading}
            />

            {/* Usage Summary */}
            <UsageSummary
              summary={summary}
              loading={summaryLoading}
            />

            {/* Transaction History */}
            <TransactionHistory
              transactions={transactions}
              loading={transactionsLoading}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          </div>
        </div>
      </div>

      {/* Stripe Payment Modal */}
      {clientSecret && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: 'hsl(var(--primary))',
                borderRadius: '0.5rem',
              },
            },
          }}
        >
          <StripePaymentModal
            open={showPaymentModal}
            onClose={handleCloseModal}
            packageAmount={selectedPackage}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      )}
    </div>
  );
}
