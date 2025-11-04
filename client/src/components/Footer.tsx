import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export function Footer() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    scrollToTop();
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const handleSectionClick = (sectionId: string) => {
    const isOnLandingPage = location === '/landing' || (location === '/' && !isAuthenticated);
    
    if (isOnLandingPage) {
      // Already on landing page, just scroll
      scrollToSection(sectionId);
    } else {
      // Navigate to landing page then scroll
      setLocation('/landing');
      setTimeout(() => scrollToSection(sectionId), 200);
    }
  };

  const productLinks = [
    { name: "Features", href: "/#features", isSection: true, sectionId: "features" },
    { name: "Pricing", href: "/#pricing", isSection: true, sectionId: "pricing" },
    { name: "Referrals", href: "/#referrals", isSection: true, sectionId: "referrals" },
    { name: "Download", href: "/#download", isSection: true, sectionId: "download" }
  ];

  const companyLinks = [
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Support", href: "/support" }
  ];

  const accountLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "My Account", href: "/" },
    { name: "Referrals", href: "/#referrals", isSection: true, sectionId: "referrals" },
    { name: "Downloads", href: "/#download", isSection: true, sectionId: "download" }
  ];

  const legalLinks = [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Refund Policy", href: "/refunds" }
  ];

  return (
    <footer className="bg-card border-t border-card-border" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className={`grid sm:grid-cols-2 gap-8 mb-12 ${isAuthenticated ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {/* Product */}
          <div>
            <h3 className="font-bold text-card-foreground mb-4">Product</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <button
                    onClick={() => link.isSection ? handleSectionClick(link.sectionId!) : window.location.href = link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                    data-testid={`link-footer-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold text-card-foreground mb-4">Company</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    onClick={handleClick}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-footer-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* My Account (only when authenticated) */}
          {isAuthenticated && (
            <div>
              <h3 className="font-bold text-card-foreground mb-4">My Account</h3>
              <ul className="space-y-2">
                {accountLinks.map((link) => (
                  <li key={link.name}>
                    {link.isSection ? (
                      <button
                        onClick={() => handleSectionClick(link.sectionId!)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                        data-testid={`link-footer-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.name}
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={handleClick}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`link-footer-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Legal */}
          <div>
            <h3 className="font-bold text-card-foreground mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    onClick={handleClick}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-footer-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/40">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p data-testid="text-copyright">
              © 2025 Lander Media, 31 N Tejon St Colorado Springs CO 80903
            </p>
            <p data-testid="text-powered-by">
              Built and powered by <a href="https://heydata.org" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">heydata.org</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
