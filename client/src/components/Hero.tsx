import { Button } from "@/components/ui/button";
import { Zap, Sparkles, Star } from "lucide-react";
import { CompactSavingsSummary } from "@/components/CompactSavingsSummary";

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 5) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

export function Hero() {
  const handleStartTrial = () => {
    window.location.href = "/api/login";
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" data-testid="section-hero">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-4" data-testid="badge-announcement">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Edit Unlimited Photoshoots With Our Risk Free Trial</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6 text-foreground max-w-5xl mx-auto" data-testid="text-hero-headline">
          Find All Your 5-Star <span className="inline-flex gap-1">⭐⭐⭐⭐⭐</span> Images In Seconds{" "}
          <span className="text-muted-foreground text-2xl md:text-3xl lg:text-4xl">even if you have</span>{" "}
          <span className="text-primary">10,000+ photos</span>{" "}
          <span className="text-muted-foreground text-2xl md:text-3xl lg:text-4xl">across multiple photoshoots</span>
        </h1>

        <div className="max-w-6xl mx-auto mb-8" data-testid="text-hero-subheadline">
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

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 border-2 border-background flex items-center justify-center text-white font-semibold text-xs">
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
        <div className="mt-10 pt-6 border-t border-border/40">
          <p className="text-sm text-muted-foreground mb-6 uppercase tracking-wide font-semibold">Powered by your preference from the latest AI models</p>
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
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
              <div className="text-white text-xs font-mono">Nov 12, 2025 <span className="text-white/80">• {getRelativeTime('2025-11-12')}</span></div>
            </div>

            {/* Anthropic Claude Sonnet 4.5 */}
            <div className="group relative bg-gradient-to-br from-orange-950 via-orange-900 to-orange-800 border border-orange-600/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-orange-400/50" data-testid="badge-ai-claude">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg p-2">
                    <svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 655" className="w-full h-full" fill="white">
                      <path d="m536.5 1.3l260 653.6h142.5l-260-653.6z"/>
                      <path fillRule="evenodd" d="m259.7 0.5h149.1l259.7 653.6h-145.3l-53.1-137.2h-271.7l-53.2 137.2h-145.2zm-14.4 394.9h178l-89-229.7z"/>
                    </svg>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shadow-lg">
                    <img src="/logos/Claude_AI_symbol.svg.png" alt="Claude" className="w-6 h-6 object-contain" />
                  </div>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Anthropic Claude Sonnet 4.5</div>
                  <div className="text-orange-200 text-xs">Constitutional AI</div>
                </div>
              </div>
              <div className="text-white text-xs font-mono">Sep 29, 2025 <span className="text-white/80">• {getRelativeTime('2025-09-29')}</span></div>
            </div>

            {/* Groq + Moonshot Kimi */}
            <div className="group relative bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-900 border border-purple-600/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-purple-400/50" data-testid="badge-ai-groq">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg p-2">
                    <svg fill="white" fillRule="evenodd" viewBox="0 0 24 24" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z"></path>
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Groq + Moonshot AI Kimi</div>
                  <div className="text-purple-200 text-xs">⚡ Ultra Fast Kimi k2 Instruct</div>
                </div>
              </div>
              <div className="text-white text-xs font-mono">Jul 2025 <span className="text-white/80">• {getRelativeTime('2025-07-15')}</span></div>
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
                  <div className="text-sky-200 text-xs">by xAI, owners of twitter lol</div>
                </div>
              </div>
              <div className="text-white text-xs font-mono">Nov 17, 2025 <span className="text-white/80">• {getRelativeTime('2025-11-17')}</span></div>
            </div>

            {/* Google Gemini 3 */}
            <div className="group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-600/50 rounded-2xl px-6 py-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:border-blue-400/50" data-testid="badge-ai-gemini">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-white">
                    <svg viewBox="0 0 24 24" className="w-6 h-6">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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
                  <div className="text-white font-bold text-sm">Google Gemini 3</div>
                  <div className="text-slate-400 text-xs">Google DeepMind</div>
                </div>
              </div>
              <div className="text-white text-xs font-mono">Nov 18, 2025 <span className="text-white/80">• {getRelativeTime('2025-11-18T09:00:00')}</span></div>
            </div>
          </div>
        </div>

        <CompactSavingsSummary />
      </div>
    </section>
  );
}
