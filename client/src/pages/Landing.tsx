import { Hero } from "@/components/Hero";
import { ProblemSection } from "@/components/ProblemSection";
import { SolutionSection } from "@/components/SolutionSection";
import { ValueStack } from "@/components/ValueStack";
import { ReferralSection } from "@/components/ReferralSection";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { SectionNav } from "@/components/SectionNav";
import { Button } from "@/components/ui/button";
import { Download, LayoutDashboard, LogOut } from "lucide-react";
import { useSectionTiming } from "@/hooks/useSectionTiming";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const { logout: handleLogout } = useLogout();
  // Track section timing (for analytics)
  useSectionTiming([
    'hero',
    'problem',
    'solution',
    'value-stack',
    'referrals',
    'final-cta',
  ]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for fixed nav
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
        {/* Section Navigation */}
        <SectionNav />

      {/* Fixed navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={scrollToTop}
            className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -ml-2 transition-all"
            data-testid="button-logo-home"
          >
            <img src="/kull-logo.png" alt="Kull Logo" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-black text-foreground" data-testid="text-logo">Kull</span>
          </button>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection('calculator')} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-link-calculator">
              Savings Calculator
            </button>
            <button onClick={() => scrollToSection('features')} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-link-demo">
              Watch How It Works
            </button>
            <button onClick={() => scrollToSection('download')} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-link-pricing">
              Pricing
            </button>
            {!isLoading && isAuthenticated ? (
              <>
                <Button
                  variant="default"
                  onClick={() => window.location.href = '/dashboard'}
                  data-testid="button-dashboard-nav"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  data-testid="button-logout-nav"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-1"
                onClick={handleLogin}
                data-testid="button-login-nav"
              >
                <Download className="w-5 h-5 mr-2 flex-shrink-0" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm">Start Free Trial</span>
                  <span className="text-sm">Download Now</span>
                </div>
              </Button>
            )}
          </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            {!isLoading && isAuthenticated ? (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => window.location.href = '/dashboard'}
                  data-testid="button-dashboard-nav-mobile"
                >
                  <LayoutDashboard className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleLogout}
                  data-testid="button-logout-nav-mobile"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-3 py-1"
                onClick={handleLogin}
                data-testid="button-login-nav-mobile"
              >
                <Download className="w-4 h-4 mr-1.5 flex-shrink-0" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs">Start Free Trial</span>
                  <span className="text-xs">Download Now</span>
                </div>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Add top padding to account for fixed nav */}
      <div className="pt-16">
        <div data-section="hero">
          <Hero />
        </div>
        <div data-section="problem">
          <ProblemSection />
        </div>
        <div id="features" data-section="solution">
          <SolutionSection />
        </div>
        <div data-section="value-stack">
          <ValueStack />
        </div>
        <div id="referrals" data-section="referrals">
          <ReferralSection />
        </div>
        <div id="download" data-section="final-cta">
          <FinalCTA />
        </div>
        <Footer />
      </div>
    </div>
  );
}
