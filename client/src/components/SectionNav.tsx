import { useEffect, useState, useRef } from "react";
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
  { id: "features", label: "The Solution: Kull App", icon: Zap },
  { id: "value", label: "What you get", icon: Star },
  { id: "referrals", label: "Get 3 Months Free", icon: Gift },
  { id: "download", label: "Pricing/Download", icon: Download },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

export function SectionNav() {
  const [activeSection, setActiveSection] = useState("top");
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

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
    const calculatorElement = document.getElementById('calculator');
    if (calculatorElement) {
      observer.observe(calculatorElement);
    }

    return () => observer.disconnect();
  }, []);

  // Show mobile nav and auto-collapse when scrolling
  useEffect(() => {
    // Show nav immediately
    setShowMobileNav(true);

    const handleScroll = () => {
      // Auto-collapse when scrolling
      if (isMobileExpanded) {
        setIsMobileExpanded(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobileExpanded]);

  // Close mobile nav when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target as Node)) {
        setIsMobileExpanded(false);
      }
    };

    if (isMobileExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobileExpanded]);

  const scrollToSection = (id: string) => {
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Special handling for calculator - scroll to top of calculator panel
    if (id === "calculator") {
      const element = document.getElementById('calculator');
      if (element) {
        const offset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
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
    <>
      {/* Desktop sidebar - left side */}
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

      {/* Mobile floating side navigation */}
      {showMobileNav && (
        <nav className="xl:hidden fixed left-0 top-1/2 -translate-y-1/2 z-40" ref={mobileNavRef}>
          {isMobileExpanded ? (
            // Expanded state - show all sections with labels
            <div className="bg-card/60 backdrop-blur-md border-r border-t border-b border-border/30 rounded-r-2xl py-2 pl-2 pr-1 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        scrollToSection(section.id);
                        setIsMobileExpanded(false);
                      }}
                      className={`
                        w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium
                        transition-all duration-200
                        ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }
                      `}
                      data-testid={`section-nav-mobile-${section.id}`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="whitespace-nowrap text-[10px]">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Collapsed state - show all icons stacked vertically
            <div className="bg-card/60 backdrop-blur-md border-r border-t border-b border-border/30 rounded-r-2xl py-1.5 pl-1.5 pr-1 shadow-2xl animate-in fade-in slide-in-from-left duration-200">
              <div className="flex flex-col gap-0.5">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        scrollToSection(section.id);
                        setIsMobileExpanded(true);
                      }}
                      className={`
                        p-1.5 rounded-lg transition-all duration-200 block
                        ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }
                      `}
                      data-testid={`section-nav-mobile-icon-${section.id}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      )}
    </>
  );
}
