import { Button } from "@/components/ui/button";
import { Zap, Sparkles, Clock, Monitor, Smartphone, Tablet, HelpCircle, Shield, Star, Calendar, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { CompactSavingsSummary } from "@/components/CompactSavingsSummary";
import { useCalculator } from "@/contexts/CalculatorContext";

export function FinalCTA() {
  const [nextShoot, setNextShoot] = useState<"week" | "month" | "date">("week");
  const [photosInEditing, setPhotosInEditing] = useState<"0" | "1" | "2" | "3" | "more">("1");
  const [customShootCount, setCustomShootCount] = useState("4");
  const [selectedDate, setSelectedDate] = useState("");

  // Get real-time calculator values
  const { shootsPerWeek, hoursPerShoot, billableRate } = useCalculator();

  const handleStartTrial = () => {
    window.location.href = "/api/login";
  };

  // Calculate actual shoot count
  const shootCount = photosInEditing === "more"
    ? parseInt(customShootCount) || 1
    : photosInEditing === "0"
    ? 0
    : parseInt(photosInEditing);

  // Calculate days until next shoot
  const getDaysUntilShoot = () => {
    if (nextShoot === "week") return 7;
    if (nextShoot === "month") return 30;
    if (nextShoot === "date" && selectedDate) {
      const selected = new Date(selectedDate);
      const today = new Date();
      const diffTime = selected.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays);
    }
    return 7;
  };

  const daysUntilShoot = getDaysUntilShoot();
  const totalHoursSaved = shootCount * hoursPerShoot;
  const totalMoneySaved = totalHoursSaved * billableRate;
  const nextShootSavings = hoursPerShoot * billableRate;

  // Format the shoot date for display
  const getFormattedShootDate = () => {
    let targetDate: Date;

    if (nextShoot === "date" && selectedDate) {
      targetDate = new Date(selectedDate);
    } else {
      // Calculate the date based on daysUntilShoot
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysUntilShoot);
    }

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    };

    // Format with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const day = targetDate.getDate();
    const ordinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    const weekday = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    const month = targetDate.toLocaleDateString('en-US', { month: 'long' });

    return `${weekday}, ${month} ${day}${ordinalSuffix(day)}`;
  };

  const formattedDate = getFormattedShootDate();

  // Photo processing calculations
  const photosPerShoot = 2000;
  const totalPhotos = shootCount * photosPerShoot;
  const processingRatePerMinute = 30000;
  const processingTimeSeconds = (totalPhotos / processingRatePerMinute) * 60;
  const processingTimeDisplay = processingTimeSeconds < 60
    ? `${Math.round(processingTimeSeconds)} seconds`
    : `${(processingTimeSeconds / 60).toFixed(1)} minutes`;

  // Single shoot processing time
  const singleShootProcessingTime = (photosPerShoot / processingRatePerMinute) * 60; // in seconds

  const faqs = [
    {
      icon: "🚀",
      question: "How does the 1-day free trial work?",
      answer: "Sign up and get unlimited access to Kull for 24 hours. Rate as many photos as you want during your trial with no payment required upfront. If you love it, your paid subscription begins after the trial ends."
    },
    {
      icon: "🎁",
      question: "What's the 24-hour special offer?",
      answer: "When you sign up, you'll have 24 hours to subscribe and receive 3 extra months free on any annual plan. That's a total of 15 months for the price of 12, saving you hundreds of dollars on professional AI photo culling."
    },
    {
      icon: "💻",
      question: "How does the app work?",
      answer: "Download the universal Mac/iPhone/iPad app, point it to your photo folders, and the AI instantly analyzes every image. It rates, organizes, titles, describes, tags, and color-codes your photos automatically with seamless sync across all your devices."
    },
    {
      icon: "⭐",
      question: "How accurate are the AI ratings?",
      answer: "Kull uses ONLY your preferred model(s)—choose from Gemini, Grok, Kimi, Claude, or GPT—to rate all images simultaneously and affordably. Each model analyzes composition, exposure, focus, and artistic merit with professional-level accuracy that improves with every update."
    },
    {
      icon: "✅",
      question: "Can I cancel anytime?",
      answer: "Absolutely. Cancel your subscription at any time from your account dashboard with no questions asked and zero cancellation fees. You'll retain full access until the end of your current billing period."
    },
    {
      icon: "🤝",
      question: "What about the referral bonuses?",
      answer: "Refer photographer friends and unlock amazing rewards: 1 referral = bonus feature, 3 referrals = 1 month free, 5 referrals = priority support upgrade, 10 referrals = 3 months free. Share with your photography network and stack unlimited rewards!"
    },
    {
      icon: "🔒",
      question: "Is my data secure?",
      answer: "Absolutely. Your photos and ratings never leave your device—everything stays on your Mac, iPhone, and iPad with local sync. The only data we see are prompts you choose to share in the prompt marketplace. Complete privacy, complete control."
    },
    {
      icon: "🎨",
      question: "How will Kull improve my workflow?",
      answer: "Kull eliminates the most tedious part of photography—manual culling—so you can focus on what you love: editing your best shots and creating amazing work. Spend more time with clients, shooting new projects, or simply enjoying your creative freedom."
    },
    {
      icon: "📁",
      question: "What file formats are supported?",
      answer: "Kull supports all major RAW formats (CR2, CR3, NEF, ARW, DNG, RAF, ORF) plus JPEG, HEIC, PNG, and TIFF. It works seamlessly with files from Canon, Nikon, Sony, Fuji, Olympus, and virtually every professional camera brand."
    },
    {
      icon: "⚡",
      question: "How fast is the processing?",
      answer: "Incredibly fast. Kull processes up to 30,000 photos each minute using cloud AI, compared to competitors that take 30+ minutes for just 2,000 photos. Process entire photoshoots the moment they finish uploading to your Mac."
    }
  ];

  return (
    <section className="py-20 md:py-32 px-4 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative overflow-hidden" data-testid="section-final-cta">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Start your unlimited free trial now</span>
        </div>

        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6 text-foreground max-w-5xl mx-auto" data-testid="text-final-cta-headline">
          Start rating photos in seconds, not hours.
        </h2>

        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Join thousands who've discovered Kull, and get started completely risk free.
        </p>

        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-gradient-to-br from-card via-card/95 to-card border border-card-border rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {/* First column - Kull only */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-foreground leading-tight mb-2">Kull</h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5">💬</span>
                        <p className="text-sm text-muted-foreground leading-snug">Tell Kull your desired number of deliverable images</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5">🗣️</span>
                        <p className="text-sm text-muted-foreground leading-snug">Tell Kull your priority for ranking this shoot in plain language</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5">😊</span>
                        <p className="text-sm text-muted-foreground leading-snug">Kull organizes by composition, lighting, focus, even subject mood</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5">👁️</span>
                        <p className="text-sm text-muted-foreground leading-snug">Watch Kull work right in Lightroom!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second column */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-foreground leading-tight">Rate 1-5 stars</h3>
                    <p className="text-sm text-muted-foreground leading-snug mt-1">All images starred in seconds based on your custom, sharable prompt</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-foreground leading-tight">Color-code</h3>
                    <p className="text-sm text-muted-foreground leading-snug mt-1">Visual organization at a glance</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🔄</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-foreground leading-tight">Re-rank & Re-organize</h3>
                    <p className="text-sm text-muted-foreground leading-snug mt-1">Get more or less strict selects instantly</p>
                  </div>
                </div>
              </div>

              {/* Third column */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">✍️</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-foreground leading-tight">Title</h3>
                    <p className="text-sm text-muted-foreground leading-snug mt-1">Auto-written based on subject, shoot context, GPS, EXIF, and other metadata</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">📝</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-foreground leading-tight">Describe</h3>
                    <p className="text-sm text-muted-foreground leading-snug mt-1">Detailed descriptions of each shot</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🏷️</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-foreground leading-tight">Tag</h3>
                    <p className="text-sm text-muted-foreground leading-snug mt-1">Smart tags for easy organization</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Pills */}
        <div className="mb-8 space-y-6 max-w-3xl mx-auto">
          {/* When is your next photoshoot */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">When is your next photoshoot?</p>
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-muted/50 border border-border rounded-full p-1">
                <button
                  onClick={() => setNextShoot("week")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    nextShoot === "week"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  This week
                </button>
                <button
                  onClick={() => setNextShoot("month")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    nextShoot === "month"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  This month
                </button>
                <button
                  onClick={() => setNextShoot("date")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                    nextShoot === "date"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Pick a date
                </button>
              </div>
              {nextShoot === "date" && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  min={new Date().toISOString().split('T')[0]}
                />
              )}
            </div>
          </div>

          {/* How many do you have currently in editing */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">How many do you have currently in editing?</p>
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-muted/50 border border-border rounded-full p-1">
                <button
                  onClick={() => setPhotosInEditing("0")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    photosInEditing === "0"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  0
                </button>
                <button
                  onClick={() => setPhotosInEditing("1")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    photosInEditing === "1"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  1
                </button>
                <button
                  onClick={() => setPhotosInEditing("2")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    photosInEditing === "2"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  2
                </button>
                <button
                  onClick={() => setPhotosInEditing("3")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    photosInEditing === "3"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  3
                </button>
                <button
                  onClick={() => setPhotosInEditing("more")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    photosInEditing === "more"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  More
                </button>
              </div>
              {photosInEditing === "more" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCustomShootCount(String(Math.max(4, parseInt(customShootCount) - 1)))}
                    className="w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                    aria-label="Decrease count"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="4"
                    value={customShootCount}
                    onChange={(e) => setCustomShootCount(e.target.value)}
                    className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm text-center"
                    placeholder="4"
                  />
                  <button
                    onClick={() => setCustomShootCount(String(parseInt(customShootCount) + 1))}
                    className="w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                    aria-label="Increase count"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Savings Calculations */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl p-6 space-y-4">
            {shootCount > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-foreground mb-2">
                  Process all {shootCount} {shootCount === 1 ? 'shoot' : 'shoots'} and save:
                </p>
                <div className="flex items-center justify-center gap-8">
                  <div>
                    <p className="text-3xl font-black text-foreground">{totalHoursSaved.toFixed(1)} hrs</p>
                    <p className="text-xs text-foreground/70">of your time</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-foreground">${totalMoneySaved.toFixed(0)}</p>
                    <p className="text-xs text-foreground/70">in billable hours</p>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 mt-4">
                  Your estimated <span className="font-semibold text-foreground">{totalPhotos.toLocaleString()} photos</span> will process in <span className="font-semibold text-foreground">{processingTimeDisplay}</span>
                </p>
              </div>
            )}
            <div className="pt-4 border-t border-primary/20 space-y-3">
              <div className="text-center">
                <p className="text-sm font-bold text-foreground mb-1">
                  At your next shoot on {formattedDate},
                </p>
                <p className="text-xs text-foreground/70 uppercase tracking-wide mb-3">
                  here's how your editing and post-processing experience will be different:
                </p>

                {/* Comparison: Without Kull vs With Kull */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-card/50 border border-border rounded-lg p-3">
                    <p className="text-xs text-foreground/70 mb-1">Without Kull</p>
                    <p className="text-2xl font-black text-foreground">{hoursPerShoot} hrs</p>
                    <p className="text-xs text-foreground/70">Manual culling time</p>
                  </div>
                  <div className="bg-card/50 border border-border rounded-lg p-3">
                    <p className="text-xs text-foreground/70 mb-1">With Kull</p>
                    <p className="text-2xl font-black text-foreground">{Math.round(singleShootProcessingTime)}s</p>
                    <p className="text-xs text-foreground/70">Automated processing</p>
                  </div>
                </div>

                {/* Key insight based on their workflow */}
                <div className="bg-card/30 border border-border/50 rounded-lg p-3 text-left">
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="font-bold">At your pace of {shootsPerWeek} {shootsPerWeek === 1 ? 'shoot' : 'shoots'}/week</span>,
                    Kull will save you <span className="font-bold">{(shootsPerWeek * hoursPerShoot).toFixed(1)} hours every week</span>.
                    That's <span className="font-bold">${(shootsPerWeek * hoursPerShoot * billableRate).toLocaleString()}/week</span> in
                    billable time you can spend {billableRate >= 100 ? 'on high-value client work' : 'editing your best shots or with family'}.
                  </p>
                </div>

                {/* Processing speed insight */}
                <p className="text-xs text-foreground/80 mt-2">
                  While you grab coffee, Kull processes 2,000 photos in <span className="font-semibold">{Math.round((2000 / 30000) * 60)} seconds</span>.
                  Manual culling? <span className="font-semibold">{hoursPerShoot} hours</span>.
                </p>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-primary/20">
              <p className="text-sm font-bold text-foreground flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                100% Risk-Free Trial • Cancel Anytime
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button
            size="lg"
            className="text-lg h-14 px-8 min-w-[240px]"
            onClick={handleStartTrial}
            data-testid="button-start-trial-final"
          >
            <Zap className="w-5 h-5 mr-2" />
            Start Free Trial Now
          </Button>
        </div>

        {/* Feature Icons */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-4xl mx-auto mb-16">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">macOS App</span>
            <span className="text-xs text-muted-foreground">Works with any folder</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">iOS App</span>
            <span className="text-xs text-muted-foreground">Cull on the go</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Tablet className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">iPad App</span>
            <span className="text-xs text-muted-foreground">Large screen review</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">1-Day Free Trial</span>
            <span className="text-xs text-muted-foreground">Unlimited rating</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Cancel Anytime</span>
            <span className="text-xs text-muted-foreground">No commitments</span>
          </div>
        </div>

        {/* FAQ Cards */}
        <div className="max-w-7xl mx-auto" id="faq">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-12 text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-card/80 backdrop-blur-sm border border-card-border rounded-2xl p-6 text-left hover-elevate"
                data-testid={`faq-card-${index}`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">{faq.icon}</span>
                  </div>
                  <h3 className="font-bold text-card-foreground leading-tight pt-1">
                    {faq.question}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        <CompactSavingsSummary />
      </div>
    </section>
  );
}
