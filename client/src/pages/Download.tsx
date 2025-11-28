import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Sparkles, Shield, Users, Download as DownloadIcon, LogIn } from "lucide-react";
import { detectPlatform, getRecommendedPlatform } from "@/components/download/PlatformDetector";
import { DownloadButton } from "@/components/download/DownloadButton";
import { PlatformSwitcher } from "@/components/download/PlatformSwitcher";
import { InstallInstructions } from "@/components/download/InstallInstructions";
import { SystemRequirements } from "@/components/download/SystemRequirements";
import { Changelog } from "@/components/download/Changelog";
import { DownloadFAQ } from "@/components/download/DownloadFAQ";
import { getLatestVersions, type LatestVersions } from "@/api/download";
import { useAuth } from "@/hooks/useAuth";

export default function Download() {
  const { isAuthenticated } = useAuth();
  const [selectedPlatform, setSelectedPlatform] = useState<'macos' | 'ios'>('macos');
  const [versions, setVersions] = useState<LatestVersions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-detect platform on mount
    const detected = detectPlatform();
    const recommended = getRecommendedPlatform(detected);
    setSelectedPlatform(recommended);

    // Load version information
    async function loadVersions() {
      try {
        const data = await getLatestVersions();
        setVersions(data);
      } catch (error) {
        console.error("Failed to load version information:", error);
      } finally {
        setLoading(false);
      }
    }
    loadVersions();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading || !versions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading download page...</p>
        </div>
      </div>
    );
  }

  const currentVersionInfo = versions[selectedPlatform];

  return (
    <div className="min-h-screen">
      {/* Fixed navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -ml-2 transition-all"
            >
              <img src="/kull-logo.png" alt="Kull Logo" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-black text-foreground">Kull</span>
            </button>
          </Link>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <Button
                variant="outline"
                onClick={() => window.location.href = "/api/login"}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            ) : (
              <Link href="/">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Add top padding to account for fixed nav */}
      <div className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Native Apps for macOS and iOS</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6 text-foreground">
              Download Kull AI
              <br />
              <span className="text-primary">Rate 10,000+ Photos</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
              Get the universal Mac app and iOS companion to rate 1,000+ photos in minutes using AI.
              Seamlessly syncs across all your devices.
            </p>

            {/* Platform Switcher */}
            <PlatformSwitcher
              selectedPlatform={selectedPlatform}
              onPlatformChange={setSelectedPlatform}
            />

            {/* Download Button */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <DownloadButton
                platform={selectedPlatform}
                versionInfo={currentVersionInfo}
                size="lg"
              />
              <p className="text-sm text-muted-foreground">
                Version {currentVersionInfo.version} (Build {currentVersionInfo.buildNumber}) • {currentVersionInfo.minimumOS}
                {!isAuthenticated && (
                  <>
                    {" • "}
                    <Link href="/api/login" className="text-primary hover:underline">
                      Sign in to download
                    </Link>
                  </>
                )}
              </p>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mt-12">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span>Secure Download</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span>Privacy Focused</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Join 500+ Photographers</span>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="mt-16 pt-8 border-t border-border/40 max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6">
                {currentVersionInfo.features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 text-left"
                  >
                    <DownloadIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* System Requirements */}
        <SystemRequirements platform={selectedPlatform} versionInfo={currentVersionInfo} />

        {/* Installation Instructions */}
        <InstallInstructions platform={selectedPlatform} />

        {/* Changelog */}
        <Changelog />

        {/* FAQ */}
        <DownloadFAQ />

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              Ready to Transform Your Photo Workflow?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Download Kull AI now and experience the power of AI-assisted photo culling.
              <br />
              Start your free 24-hour trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <DownloadButton
                platform={selectedPlatform}
                versionInfo={currentVersionInfo}
              />
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="lg"
                  className="min-w-[280px] h-14 text-lg"
                  onClick={() => window.location.href = "/api/login"}
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In to Get Started
                </Button>
              )}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
