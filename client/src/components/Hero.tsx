import { Button } from "@/components/ui/button";
import { Zap, Sparkles, Star } from "lucide-react";

export function Hero() {
  const handleStartTrial = () => {
    window.location.href = "/api/login";
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8" data-testid="badge-announcement">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">1-Day Unlimited Free Trial</span>
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-4 text-foreground" data-testid="text-hero-headline">
          10,000+ photos in seconds
          <br />
          <span className="text-primary">Using AI</span>
        </h1>

        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
          <span className="text-sm font-semibold text-foreground">(multiple photoshoots at once)</span>
        </div>

        <div className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed space-y-3" data-testid="text-hero-subheadline">
          <p className="flex items-center gap-3">✍️ <span>Title</span></p>
          <p className="flex items-center gap-3">📝 <span>Describe</span></p>
          <p className="flex items-center gap-3">🏷️ <span>Tag</span></p>
          <p className="flex items-center gap-3">⭐ <span>Rate 1-5 stars</span></p>
          <p className="flex items-center gap-3">🎨 <span>Color-code</span></p>
          <p className="flex items-center gap-3">🎯 <span>Kull down to your exact ideal number of final images ranked/organized by the best composition, lighting and technical aspects like focus, detail, and subject mood</span></p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button
            size="lg"
            className="text-lg h-14 px-8 min-w-[240px]"
            onClick={handleStartTrial}
            data-testid="button-start-trial-hero"
          >
            <Zap className="w-5 h-5 mr-2" />
            Start Free Trial Now
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-lg h-14 px-8 min-w-[240px] bg-background/80 backdrop-blur-sm"
            data-testid="button-watch-demo"
          >
            Watch Demo
          </Button>
        </div>

        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <div className="flex -space-x-3" data-testid="avatar-stack">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-background flex items-center justify-center text-white font-semibold text-xs">
              JD
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-background flex items-center justify-center text-white font-semibold text-xs">
              SK
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-background flex items-center justify-center text-white font-semibold text-xs">
              ML
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-background flex items-center justify-center text-white font-semibold text-xs">
              TC
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-background flex items-center justify-center text-white font-semibold text-xs">
              AR
            </div>
          </div>
          <div className="flex items-center gap-2" data-testid="text-user-count">
            <span>Used by photographers worldwide</span>
          </div>
        </div>

        {/* AI Model badges */}
        <div className="mt-16 pt-8 border-t border-border/40">
          <p className="text-sm text-muted-foreground mb-8 uppercase tracking-wide font-semibold">Powered by the Latest AI Models</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* OpenAI GPT-5.1 */}
            <div className="group relative bg-gradient-to-br from-gray-950 via-gray-900 to-black border border-gray-700/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-emerald-500/50" data-testid="badge-ai-gpt">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">OpenAI</div>
                  <div className="text-gray-300 text-xs font-semibold">GPT-5.1</div>
                </div>
              </div>
              <div className="text-gray-500 text-xs font-mono">Nov 12, 2025</div>
            </div>

            {/* Anthropic Claude Sonnet 4.5 */}
            <div className="group relative bg-gradient-to-br from-orange-950 via-orange-900 to-orange-800 border border-orange-600/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-orange-400/50" data-testid="badge-ai-claude">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.18l7 3.5v7.14l-7-3.5V9.18zm16 0v7.14l-7 3.5v-7.14l7-3.5z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Anthropic</div>
                  <div className="text-orange-200 text-xs font-semibold">Claude Sonnet 4.5</div>
                </div>
              </div>
              <div className="text-orange-700 text-xs font-mono">Sep 29, 2025</div>
            </div>

            {/* xAI Grok 4.1 */}
            <div className="group relative bg-gradient-to-br from-gray-950 via-gray-900 to-black border border-gray-700/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-white/50" data-testid="badge-ai-grok">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
                  <span className="text-black font-black text-xl">𝕏</span>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">xAI</div>
                  <div className="text-gray-300 text-xs font-semibold">Grok 4.1</div>
                </div>
              </div>
              <div className="text-gray-500 text-xs font-mono">Nov 17, 2025</div>
            </div>

            {/* Google Gemini 2.5 Pro */}
            <div className="group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-600/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-blue-400/50" data-testid="badge-ai-gemini">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-red-400 via-yellow-400 to-green-400 opacity-90"></div>
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 relative z-10">
                    <path d="M12 2L15.5 8.5L22 9.5L17 14.5L18.5 21L12 17.5L5.5 21L7 14.5L2 9.5L8.5 8.5L12 2Z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Google</div>
                  <div className="text-slate-300 text-xs font-semibold">Gemini 2.5 Pro</div>
                </div>
              </div>
              <div className="text-slate-500 text-xs font-mono">Jun 17, 2025</div>
            </div>

            {/* Moonshot Kimi K2 */}
            <div className="group relative bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 border border-indigo-600/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-indigo-400/50" data-testid="badge-ai-kimi">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🌙</span>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Moonshot AI</div>
                  <div className="text-indigo-200 text-xs font-semibold">Kimi K2</div>
                </div>
              </div>
              <div className="text-indigo-700 text-xs font-mono">Jul 2025</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
