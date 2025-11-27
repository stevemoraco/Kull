import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { hasPaidAccess } from "@/lib/accessControl";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import type { User } from "@shared/schema";

export function Footer() {
  const { isAuthenticated, user } = useAuth();
  const { logout: handleLogout } = useLogout();
  const [location, setLocation] = useLocation();
  const typedUser = user as User;
  const hasAccess = hasPaidAccess(typedUser);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

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

  const allProductLinks = [
    { name: "Features", href: "/#features", isSection: true, sectionId: "features" },
    { name: "Marketplace", href: "/marketplace", isSection: false, requiresPaid: true },
    { name: "Pricing", href: "/#pricing", isSection: true, sectionId: "pricing" },
    { name: "Referrals", href: "/#referrals", isSection: true, sectionId: "referrals" },
    { name: "Download Apps", href: "/download", isSection: false }
  ];

  const productLinks = allProductLinks.filter(link => !link.requiresPaid || hasAccess);

  const companyLinks = [
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Support", href: "/support" }
  ];

  const allAccountLinks = [
    { name: "Dashboard", href: "/dashboard", isSection: false },
    { name: "My Account", href: "/", isSection: false },
    { name: "My Prompts", href: "/my-prompts", isSection: false, requiresPaid: true },
    { name: "Referrals", href: "/#referrals", isSection: true, sectionId: "referrals" },
    { name: "Download Apps", href: "/download", isSection: false }
  ];

  const accountLinks = allAccountLinks.filter(link => !link.requiresPaid || hasAccess);

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

        {/* Account Actions */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground">
                Signed in as {typedUser?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-footer-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                Not signed in
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={handleLogin}
                data-testid="button-footer-login"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </>
          )}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
            <div className="text-center md:text-left px-4 md:px-0">
              <p data-testid="text-copyright">
                © 2025 Lander Media, 31 N Tejon St Colorado Springs CO 80903
              </p>
            </div>
            <div className="text-center px-4 md:px-0">
              <p data-testid="text-powered-by">
                Built and powered by <a href="https://heydata.org" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">heydata.org</a>
              </p>
            </div>
            <div className="text-center md:text-right px-4 md:px-0">
              <p className="text-xs">Adobe, Lightroom, and the Lightroom logo are either registered trademarks or trademarks of Adobe Inc. in the United States and/or other countries.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
