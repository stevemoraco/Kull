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
          <p className="text-sm text-muted-foreground mb-8 uppercase tracking-wide font-semibold">Powered by your preference from the latest AI models</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* OpenAI GPT-5.1 */}
            <div className="group relative bg-gradient-to-br from-gray-950 via-gray-900 to-black border border-gray-700/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-emerald-500/50" data-testid="badge-ai-gpt">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-lg border border-gray-800">
                    <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">OpenAI GPT-5.1</div>
                  <div className="text-gray-400 text-xs">ChatGPT</div>
                </div>
              </div>
              <div className="text-gray-500 text-xs font-mono">Nov 12, 2025 <span className="text-gray-600">• 6 days ago</span></div>
            </div>

            {/* Anthropic Claude Sonnet 4.5 */}
            <div className="group relative bg-gradient-to-br from-orange-950 via-orange-900 to-orange-800 border border-orange-600/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-orange-400/50" data-testid="badge-ai-claude">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 200 200" fill="white" className="w-6 h-6">
                      <path d="M100 20 L180 60 L180 140 L100 180 L20 140 L20 60 Z M100 50 L160 80 L160 120 L100 150 L40 120 L40 80 Z M70 70 L100 85 L130 70 L130 100 L100 115 L70 100 Z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Anthropic Claude Sonnet 4.5</div>
                  <div className="text-orange-200 text-xs">Constitutional AI</div>
                </div>
              </div>
              <div className="text-orange-700 text-xs font-mono">Sep 29, 2025 <span className="text-orange-800">• 7 weeks ago</span></div>
            </div>

            {/* xAI Grok 4.1 */}
            <div className="group relative bg-gradient-to-br from-sky-950 via-blue-900 to-blue-800 border border-sky-600/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-sky-400/50" data-testid="badge-ai-grok">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">xAI Grok 4.1</div>
                  <div className="text-sky-200 text-xs">by Elon Musk</div>
                </div>
              </div>
              <div className="text-sky-700 text-xs font-mono">Nov 17, 2025 <span className="text-sky-800">• 1 day ago</span></div>
            </div>

            {/* Google Gemini 2.5 Pro */}
            <div className="group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-600/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-blue-400/50" data-testid="badge-ai-gemini">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-white">
                    <svg viewBox="0 0 48 48" className="w-6 h-6">
                      <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                      <path fill="#34A853" d="M11.4 28.8l-2.2 1.6-1 2.3C10.1 36.9 16.5 40 24 40c5.6 0 10.9-2.1 14.8-5.6l-7.3-5.7c-2 1.3-4.6 2.2-7.5 2.2-5.5 0-10.2-3.5-11.6-8.1z"/>
                      <path fill="#FBBC05" d="M8.2 32.7C7.4 30.9 7 28.9 7 27s.4-3.9 1.2-5.7l-2.2-1.6-1-2.3C3.4 19.8 3 21.8 3 24s.4 4.2 1 6.1l2.2 1.6 1 2.3z"/>
                      <path fill="#EA4335" d="M24 11c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.5 2 10.1 5.1 7.2 9.3l2.2 1.6 1 2.3C11.8 8.7 17.5 5.2 24 5.2z"/>
                    </svg>
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-6 h-6">
                      <defs>
                        <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{stopColor: '#4285F4'}} />
                          <stop offset="33%" style={{stopColor: '#EA4335'}} />
                          <stop offset="66%" style={{stopColor: '#FBBC04'}} />
                          <stop offset="100%" style={{stopColor: '#34A853'}} />
                        </linearGradient>
                      </defs>
                      <path fill="url(#gemini-gradient)" d="M100 20 L120 80 L180 90 L130 130 L145 190 L100 155 L55 190 L70 130 L20 90 L80 80 Z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Google Gemini 2.5 Pro</div>
                  <div className="text-slate-400 text-xs">DeepMind</div>
                </div>
              </div>
              <div className="text-slate-500 text-xs font-mono">Jun 17, 2025 <span className="text-slate-600">• 5 months ago</span></div>
            </div>

            {/* Moonshot Kimi K2 */}
            <div className="group relative bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 border border-indigo-600/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-indigo-400/50" data-testid="badge-ai-kimi">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 200 200" fill="white" className="w-6 h-6">
                      <circle cx="100" cy="80" r="35"/>
                      <path d="M 65 100 Q 50 140 70 170 Q 85 185 100 180 Q 115 185 130 170 Q 150 140 135 100 Z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Moonshot AI Kimi K2</div>
                  <div className="text-indigo-200 text-xs">Open Source</div>
                </div>
              </div>
              <div className="text-indigo-700 text-xs font-mono">Jul 2025 <span className="text-indigo-800">• 4 months ago</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
