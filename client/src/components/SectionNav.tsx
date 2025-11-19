import { useEffect, useState } from "react";
import { Home, AlertCircle, Zap, Star, DollarSign, Gift, Download, HelpCircle } from "lucide-react";

interface Section {
  id: string;
  label: string;
  icon: any;
}

const sections: Section[] = [
  { id: "top", label: "What is Kull?", icon: Home },
  { id: "problem", label: "The Problem: Culling", icon: AlertCircle },
  { id: "calculator", label: "Calculate Time Saved", icon: DollarSign },
  { id: "features", label: "Kull: The Solution", icon: Zap },
  { id: "value", label: "What you get", icon: Star },
  { id: "referrals", label: "Get 3 Months Free", icon: Gift },
  { id: "download", label: "Pricing/Download", icon: Download },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

export function SectionNav() {
  const [activeSection, setActiveSection] = useState("top");

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px", // Trigger when section is 20% from top
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    // Special handling for top/hero section
    const heroElement = document.querySelector('[data-testid="section-hero"]');
    if (heroElement) {
      const tempDiv = document.createElement('div');
      tempDiv.id = 'top';
      tempDiv.style.position = 'absolute';
      tempDiv.style.top = '0';
      tempDiv.style.height = '1px';
      heroElement.prepend(tempDiv);
      observer.observe(tempDiv);
    }

    // Special handling for problem section
    const problemElement = document.querySelector('[data-testid="section-problem"]');
    if (problemElement && !problemElement.id) {
      problemElement.id = 'problem';
      observer.observe(problemElement);
    }

    // Special handling for FAQ section
    const faqElement = document.querySelector('[data-testid="section-faq"]');
    if (faqElement && !faqElement.id) {
      faqElement.id = 'faq';
      observer.observe(faqElement);
    }

    // Special handling for value section
    const valueElement = document.querySelector('[data-testid="section-value-stack"]');
    if (valueElement && !valueElement.id) {
      valueElement.id = 'value';
      observer.observe(valueElement);
    }

    // Special handling for calculator section
    const calculatorElement = document.getElementById('calculator-sliders');
    if (calculatorElement) {
      // Create a wrapper div with id="calculator" if it doesn't exist
      if (!document.getElementById('calculator')) {
        const wrapper = document.createElement('div');
        wrapper.id = 'calculator';
        wrapper.style.position = 'absolute';
        wrapper.style.top = '-80px'; // Account for nav offset
        calculatorElement.parentElement?.insertBefore(wrapper, calculatorElement);
      }
      const calcWrapper = document.getElementById('calculator');
      if (calcWrapper) {
        observer.observe(calcWrapper);
      }
    }

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for fixed nav
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <nav className="hidden xl:block fixed left-8 top-1/2 -translate-y-1/2 z-40">
      <div className="bg-card/80 backdrop-blur-lg border border-border/40 rounded-2xl p-4 shadow-xl">
        <div className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200 group
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }
                `}
                data-testid={`section-nav-${section.id}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "" : "group-hover:scale-110 transition-transform"}`} />
                <span className="whitespace-nowrap">{section.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
