import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft, MapPin, Clock, Twitter } from "lucide-react";
import { Footer } from "@/components/Footer";
import { SupportChat } from "@/components/SupportChat";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

export default function Contact() {
  const [chatDuration, setChatDuration] = useState(0);
  const [showTwitter, setShowTwitter] = useState(false);
  const [profileImage, setProfileImage] = useState("");
  const [bioImage, setBioImage] = useState("");

  useEffect(() => {
    // Track chat engagement time
    const timer = setInterval(() => {
      setChatDuration(prev => {
        const next = prev + 1;
        // Show Twitter option after 5 minutes (300 seconds)
        if (next >= 300 && !showTwitter) {
          setShowTwitter(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showTwitter]);

  useEffect(() => {
    // Load images
    setProfileImage("/founder/profile.png");
    setBioImage("/founder/twitter-bio.png");
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeUntilTwitter = Math.max(0, 300 - chatDuration);

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
          <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -mr-2 transition-all"
            data-testid="button-logo-home"
          >
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Kull</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <MessageCircle className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground" data-testid="text-contact-headline">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start with our AI chat support for instant answers. If you need more help, connect directly with founder Steve Moraco.
            </p>
          </div>

          {/* Primary Contact Method: Chat */}
          <div className="mb-12">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-2xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-3 text-foreground">Start with Chat Support</h2>
                  <p className="text-muted-foreground leading-relaxed text-lg mb-4">
                    Our AI assistant knows everything about Kull - installation, features, billing, troubleshooting, and more. Available 24/7 with instant answers.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Chat engagement time: {formatTime(chatDuration)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Twitter DM - Revealed After 5 Minutes */}
          {showTwitter ? (
            <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
              <Card className="bg-card border-2 border-card-border rounded-2xl p-8 md:p-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3 text-foreground">Still Need Help?</h2>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    Connect directly with founder Steve Moraco via Twitter DM
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-center">
                  {/* Founder Profile */}
                  <div className="flex flex-col items-center md:items-start gap-4">
                    {profileImage && (
                      <img 
                        src={profileImage} 
                        alt="Steve Moraco - Kull Founder" 
                        className="w-24 h-24 rounded-full border-4 border-primary/20"
                        data-testid="img-founder-profile"
                      />
                    )}
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-bold text-foreground mb-2">Steve Moraco</h3>
                      <p className="text-muted-foreground mb-1">Founder, Kull</p>
                      <a 
                        href="https://twitter.com/stevemoraco" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2 justify-center md:justify-start"
                        data-testid="link-twitter-profile"
                      >
                        <Twitter className="w-4 h-4" />
                        @stevemoraco
                      </a>
                    </div>
                  </div>

                  {/* Twitter Bio Preview */}
                  <div className="flex flex-col gap-4">
                    {bioImage && (
                      <img 
                        src={bioImage} 
                        alt="Steve Moraco Twitter Bio" 
                        className="w-full rounded-xl border border-card-border shadow-lg"
                        data-testid="img-twitter-bio"
                      />
                    )}
                    <a 
                      href="https://twitter.com/messages/compose?recipient_id=stevemoraco" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      <Button size="lg" className="w-full gap-2" data-testid="button-twitter-dm">
                        <Twitter className="w-5 h-5" />
                        Send Twitter DM to Steve
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="mb-12">
              <Card className="bg-muted/30 border border-card-border rounded-2xl p-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Additional Contact Options</h3>
                <p className="text-muted-foreground mb-4">
                  More contact options will appear after {formatTime(timeUntilTwitter)} of chat engagement
                </p>
                <p className="text-sm text-muted-foreground">
                  Start a conversation with our AI assistant first - it can help with most questions instantly!
                </p>
              </Card>
            </div>
          )}

          {/* Office Information */}
          <div className="bg-card border border-card-border rounded-2xl p-8 md:p-12 mb-12">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4 text-foreground">Our Office</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-foreground font-semibold mb-2">Lander Media</p>
                    <p className="text-muted-foreground leading-relaxed">
                      31 N Tejon St<br />
                      Colorado Springs, CO 80903<br />
                      United States
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Founded 2014
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground font-semibold mb-2">Support Availability</p>
                    <p className="text-muted-foreground leading-relaxed">
                      AI Chat: 24/7 instant support<br />
                      Founder DM: Response within 24 hours<br />
                      <span className="text-sm">(typically much faster)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-card border border-card-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-foreground text-center">Quick Links</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/support">
                <Button variant="outline" className="w-full" data-testid="button-support-link">
                  Support Center
                </Button>
              </Link>
              <Link href="/privacy">
                <Button variant="outline" className="w-full" data-testid="button-privacy-link">
                  Privacy Policy
                </Button>
              </Link>
              <Link href="/terms">
                <Button variant="outline" className="w-full" data-testid="button-terms-link">
                  Terms of Service
                </Button>
              </Link>
              <Link href="/refunds">
                <Button variant="outline" className="w-full" data-testid="button-refunds-link">
                  Refund Policy
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <SupportChat />
    </div>
  );
}
