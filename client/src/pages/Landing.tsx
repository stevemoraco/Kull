import { Hero } from "@/components/Hero";
import { ProblemSection } from "@/components/ProblemSection";
import { SolutionSection } from "@/components/SolutionSection";
import { ValueStack } from "@/components/ValueStack";
import { PricingSection } from "@/components/PricingSection";
import { ReferralSection } from "@/components/ReferralSection";
import { FAQSection } from "@/components/FAQSection";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function Landing() {
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
      {/* Fixed navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={scrollToTop}
            className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -ml-2 transition-all"
            data-testid="button-logo-home"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-black text-lg">K</span>
            </div>
            <span className="text-xl font-black text-foreground" data-testid="text-logo">Kull</span>
          </button>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection('features')} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-link-features">
              Features
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-link-pricing">
              Pricing
            </button>
            <button onClick={() => scrollToSection('referrals')} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-link-referrals">
              Referrals
            </button>
            <button onClick={() => scrollToSection('download')} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-link-download">
              Download
            </button>
            <Button
              variant="outline"
              onClick={handleLogin}
              data-testid="button-login-nav"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>
          
          {/* Mobile Sign In */}
          <Button
            variant="outline"
            onClick={handleLogin}
            className="md:hidden"
            data-testid="button-login-nav-mobile"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Button>
        </div>
      </nav>

      {/* Add top padding to account for fixed nav */}
      <div className="pt-16">
        <Hero />
        <ProblemSection />
        <div id="features">
          <SolutionSection />
        </div>
        <ValueStack />
        <div id="pricing">
          <PricingSection />
        </div>
        <div id="referrals">
          <ReferralSection />
        </div>
        <div id="download">
          <FinalCTA />
        </div>
        <FAQSection />
        <Footer />
      </div>
    </div>
  );
}
