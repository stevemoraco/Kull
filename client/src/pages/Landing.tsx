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
            <span className="text-xl font-black text-foreground" data-testid="text-logo">Kull AI</span>
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
      </nav>

      {/* Add top padding to account for fixed nav */}
      <div className="pt-16">
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <ValueStack />
        <PricingSection />
        <ReferralSection />
        <FAQSection />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
}
