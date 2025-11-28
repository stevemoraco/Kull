import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { useQuery } from "@tanstack/react-query";
import { UrgencyBanner } from "@/components/UrgencyBanner";
import { PricingSection } from "@/components/PricingSection";
import { ReferralForm } from "@/components/ReferralForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, LogOut, Gift, Clock, DollarSign } from "lucide-react";
import { Footer } from "@/components/Footer";
import { OfflineQueueIndicator } from "@/components/OfflineQueueIndicator";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useCredits } from "@/hooks/useCredits";
import { hasPaidAccess } from "@/lib/accessControl";
import type { User } from "@shared/schema";

export default function Home() {
  usePageTracking('home');
  const { user } = useAuth();
  const { logout: handleLogout } = useLogout();
  const typedUser = user as User;
  const { balance } = useCredits();
  const hasAccess = hasPaidAccess(typedUser);

  // Fetch latest version information
  const { data: versions } = useQuery({
    queryKey: ['latest-versions'],
    queryFn: async () => {
      const response = await fetch('/api/download/latest');
      if (!response.ok) {
        throw new Error('Failed to fetch version information');
      }
      return response.json();
    },
  });

  const handleSelectPlan = (tier: 'professional' | 'studio') => {
    window.location.href = `/checkout?plan=${tier}`;
  };

  // Check if user has special offer active
  const hasSpecialOffer = typedUser?.specialOfferExpiresAt &&
    new Date(typedUser.specialOfferExpiresAt) > new Date();

  // Check trial status
  const isOnTrial = typedUser?.subscriptionStatus === 'trial';
  const hasActiveSubscription = typedUser?.subscriptionStatus === 'active';

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
            <img src="/kull-logo.png" alt="Kull Logo" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-black text-foreground">Kull</span>
          </button>
          <div className="flex items-center gap-4">
            <OfflineQueueIndicator />
            {hasAccess && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/credits'}
                className="relative"
                data-testid="button-credits"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Credits
                <Badge variant="secondary" className="ml-2 font-mono text-xs">
                  ${(balance / 100).toFixed(0)}
                </Badge>
              </Button>
            )}
            <span className="text-sm text-muted-foreground" data-testid="text-user-email">
              {typedUser?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Special offer banner */}
      {hasSpecialOffer && (
        <UrgencyBanner expiresAt={typedUser.specialOfferExpiresAt!} />
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-12 md:py-20">
        {/* Welcome section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-foreground" data-testid="text-welcome-headline">
            Welcome to Kull, {typedUser?.firstName || 'Photographer'}!
          </h1>
          {isOnTrial && (
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Your free trial is active until {typedUser?.trialEndsAt ? new Date(typedUser.trialEndsAt).toLocaleDateString() : 'soon'}
              </span>
            </div>
          )}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {hasActiveSubscription 
              ? "You're all set! Download the app and start rating photos with AI."
              : "Choose a plan to continue using Kull after your trial ends."
            }
          </p>
        </div>

        {/* Download section (if subscribed) */}
        {hasActiveSubscription && (
          <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
            <div className="bg-card border border-card-border rounded-2xl p-8 hover-elevate">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Download className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-card-foreground">Download for Mac</h2>
              <p className="text-muted-foreground mb-6">
                Get the universal Mac app and start rating, organizing, and tagging photos from any folder.
              </p>
              <Button
                className="w-full"
                data-testid="button-download-dmg"
                onClick={() => {
                  const downloadUrl = versions?.macos?.downloadUrl || '/downloads/Kull-latest.dmg';
                  window.location.href = downloadUrl;
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download DMG File
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                {versions?.macos?.minimumOS || 'macOS 14.0+'} • Version {versions?.macos?.version || 'loading...'}
              </p>
            </div>

            <div className="bg-card border border-card-border rounded-2xl p-8 hover-elevate">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-card-foreground">iPhone &amp; iPad Apps</h2>
              <p className="text-muted-foreground mb-6">
                Rate and organize photos on the go with automatic sync across all devices.
              </p>
              <Button
                className="w-full"
                variant="outline"
                data-testid="button-download-ios"
                onClick={() => {
                  const testFlightUrl = versions?.ios?.testFlightUrl || 'https://testflight.apple.com/join/PtzCFZKb';
                  window.open(testFlightUrl, '_blank');
                }}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Join TestFlight Beta
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                {versions?.ios?.minimumOS || 'iOS 17.0+'} • Version {versions?.ios?.version || 'loading...'}
              </p>
            </div>
          </div>
        )}

        {/* Subscription status */}
        {!hasActiveSubscription && (
          <div className="mb-16">
            <PricingSection onSelectPlan={handleSelectPlan} />
          </div>
        )}

        {/* Referral Section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
              Refer Friends &amp; Earn Rewards
            </h2>
            <p className="text-muted-foreground">
              Invite up to 10 photographers and unlock bonuses from extra features to free months
            </p>
          </div>
          <ReferralForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
