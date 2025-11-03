import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Refunds() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundResult, setRefundResult] = useState<any>(null);

  const handleRequestRefund = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to request a refund",
        variant: "destructive",
      });
      window.location.href = "/api/login";
      return;
    }

    setIsProcessing(true);
    try {
      const result = await apiRequest("/api/refund/request", {
        method: "POST",
      });
      setRefundResult(result);
      toast({
        title: "Refund Processed",
        description: "Your refund has been processed successfully. You will see the credit in 5-7 business days.",
      });
    } catch (error: any) {
      const errorMessage = error.detail || error.message || "Failed to process refund";
      toast({
        title: "Refund Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setRefundResult({ error: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Kull AI</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <DollarSign className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground" data-testid="text-refunds-headline">
              Refund Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Last Updated: November 3, 2025
            </p>
          </div>

          {/* Self-Service Refund Section */}
          {user && (
            <section className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Request Instant Refund</h2>
              {!refundResult ? (
                <>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Within 7 days of your first payment, you can request an instant refund with one click. No questions asked.
                  </p>
                  <Button
                    onClick={handleRequestRefund}
                    disabled={isProcessing}
                    size="lg"
                    className="w-full sm:w-auto"
                    data-testid="button-request-refund"
                  >
                    {isProcessing ? 'Processing Refund...' : 'Request Refund Now'}
                  </Button>
                </>
              ) : refundResult.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{refundResult.error}</AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    <div className="space-y-2">
                      <p className="font-semibold">Refund Processed Successfully!</p>
                      <p>Amount: ${(refundResult.refund.amount / 100).toFixed(2)}</p>
                      <p className="text-sm">You will see the credit in your account within 5-7 business days.</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </section>
          )}

          <div className="prose prose-lg max-w-none space-y-8">
            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Our Commitment to Satisfaction</h2>
              <p className="text-muted-foreground leading-relaxed">
                We want you to love Kull AI. That's why we offer a generous 1-day free trial and a fair refund policy for new subscribers.
              </p>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Free Trial Period</h2>
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-4">
                <p className="text-foreground font-semibold mb-2">24-Hour Trial - Zero Risk</p>
                <p className="text-muted-foreground leading-relaxed">
                  All new users receive a full 24-hour trial period. You can cancel anytime during this period with absolutely no charge. This is your risk-free opportunity to test Kull AI with your own photos.
                </p>
              </div>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">7-Day Money-Back Guarantee</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you're not satisfied with Kull AI after your trial ends, we offer a 7-day money-back guarantee on your first payment:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">Request a refund within 7 days of your first payment</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">Applies to both monthly and annual subscriptions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">Full refund, no questions asked</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">Processed within 5-7 business days</span>
                </li>
              </ul>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">How to Request a Refund</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Sign In</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Make sure you're logged into your account.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Click the Button</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Click the "Request Refund Now" button above (only available within 7 days of payment).
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Receive Confirmation</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Your refund will be processed instantly and you'll see the credit in 5-7 business days.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Refund Eligibility</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Eligible for Refund:</h3>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-3">
                      <span className="text-primary mt-1">•</span>
                      <span className="leading-relaxed">First payment within 7 days of charge</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary mt-1">•</span>
                      <span className="leading-relaxed">Technical issues preventing service use (we'll try to resolve first)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary mt-1">•</span>
                      <span className="leading-relaxed">Duplicate or erroneous charges</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Not Eligible for Refund:</h3>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-3">
                      <span className="text-primary mt-1">•</span>
                      <span className="leading-relaxed">Renewal charges beyond the first billing period</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary mt-1">•</span>
                      <span className="leading-relaxed">Partial month refunds (you retain access until period ends)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary mt-1">•</span>
                      <span className="leading-relaxed">Violation of Terms of Service</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary mt-1">•</span>
                      <span className="leading-relaxed">Requests made after the 7-day guarantee window</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Annual Subscription Refunds</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                For annual subscriptions, the 7-day money-back guarantee applies to the full annual amount:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">Full refund if requested within 7 days of annual charge</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">No pro-rated refunds for cancellations after the 7-day window</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span className="leading-relaxed">You retain access to the service until the end of your annual term</span>
                </li>
              </ul>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Chargebacks</h2>
              <p className="text-muted-foreground leading-relaxed">
                We encourage you to use the self-service refund button above before initiating a chargeback with your credit card company. Our instant refund system makes this easy. Chargebacks may result in immediate account suspension and could affect your ability to use Kull AI in the future.
              </p>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Need Help?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Have questions about our refund policy? Use our chat support on any page for instant help.
              </p>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-foreground font-semibold">Lander Media</p>
                <p className="text-muted-foreground">31 N Tejon St</p>
                <p className="text-muted-foreground">Colorado Springs, CO 80903</p>
                <p className="text-muted-foreground mt-2">
                  Founded 2014
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
