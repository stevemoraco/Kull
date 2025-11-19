import { Check, Gift, Shield, Cpu, Star, Zap, MonitorSmartphone, Smartphone, RefreshCw, TrendingUp, Lock, Filter, Sliders, Eye, FileOutput, LucideIcon } from "lucide-react";
import { CompactSavingsSummary } from "@/components/CompactSavingsSummary";
import { useState } from "react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

function FeatureCard({ feature, index, testId }: { feature: Feature; index: number; testId: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = feature.icon;

  return (
    <div
      data-testid={testId}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:border-transparent overflow-hidden"
      style={{
        animationDelay: `${index * 50}ms`
      }}
    >
      {/* Animated gradient border on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl blur-xl`} />
      <div className={`absolute inset-[2px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-[10px] z-10`} />

      {/* Content */}
      <div className="relative z-20">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg transition-transform duration-300 ${
          isHovered ? 'scale-110 rotate-6' : ''
        }`}>
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Title */}
        <h4 className="text-lg font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-emerald-400 transition-all duration-300">
          {feature.title}
        </h4>

        {/* Description */}
        <p className="text-sm text-slate-300 leading-relaxed group-hover:text-cyan-100 transition-colors duration-300">
          {feature.description}
        </p>
      </div>

      {/* Shine effect on hover */}
      {isHovered && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </div>
      )}
    </div>
  );
}

export function ValueStack() {
  const coreFeatures = [
    {
      icon: Cpu,
      title: "Your Choice of AI",
      description: "Freedom to use ONLY the model(s) YOU prefer or on-device local AI to cull images for you",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Star,
      title: "Smart Ratings",
      description: "Real-time 1-5 star ratings, titles, descriptions, tags, and color-coding",
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: Zap,
      title: "No Rate Limits",
      description: "Process unlimited photos without throttling or waiting",
      color: "from-yellow-500 to-amber-500"
    },
    {
      icon: MonitorSmartphone,
      title: "Universal Mac App",
      description: "Works with any folder on your Mac - no library imports needed",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Smartphone,
      title: "Mobile Companion",
      description: "iPhone &amp; iPad companion apps for on-the-go organization",
      color: "from-teal-500 to-emerald-500"
    },
    {
      icon: RefreshCw,
      title: "Auto Sync",
      description: "Automatic sync across all your devices in real-time",
      color: "from-green-500 to-teal-500"
    },
    {
      icon: TrendingUp,
      title: "Priority Queue",
      description: "Priority processing queue for faster results when you need them",
      color: "from-cyan-500 to-blue-500"
    },
    {
      icon: Lock,
      title: "Always Updated",
      description: "Regular AI model updates and improvements - always the latest tech",
      color: "from-indigo-500 to-purple-500"
    }
  ];

  const bonuses = [
    {
      icon: Filter,
      title: "Advanced Filtering",
      description: "Advanced filtering and batch processing for power users",
      color: "from-rose-500 to-pink-500"
    },
    {
      icon: Sliders,
      title: "Custom Presets",
      description: "Custom rating presets for different shoot types (weddings, portraits, etc.)",
      color: "from-fuchsia-500 to-purple-500"
    },
    {
      icon: Eye,
      title: "AI Insights",
      description: "Detailed AI insights and composition analysis for every photo",
      color: "from-violet-500 to-indigo-500"
    },
    {
      icon: FileOutput,
      title: "Universal Export",
      description: "Export ratings to any catalog format (Lightroom, Capture One, etc.)",
      color: "from-blue-500 to-cyan-500"
    }
  ];

  return (
    <section className="relative py-12 md:py-20 px-4 overflow-hidden bg-gradient-to-br from-black via-slate-900 to-[hsl(180,40%,10%)]" data-testid="section-value-stack">
      {/* Decorative background splotches */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-white" data-testid="text-value-headline">
            Everything You Get With Kull
          </h2>
          <p className="text-lg md:text-xl text-cyan-100/80">
            A complete AI-powered photo rating system that saves you hundreds of hours
          </p>
        </div>

        {/* Core features */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Check className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white">Core Features</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {coreFeatures.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} testId={`item-core-${index}`} />
            ))}
          </div>
        </div>

        {/* Bonus features */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white">Bonus Features <span className="text-emerald-400">(Included Free)</span></h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {bonuses.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} testId={`item-bonus-${index}`} />
            ))}
          </div>
        </div>

        {/* Total value */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-cyan-400/30 rounded-xl p-6 mb-8 text-center shadow-xl shadow-cyan-500/5">
          <p className="text-sm text-cyan-300/70 mb-2 font-semibold tracking-wide">TOTAL VALUE</p>
          <p className="text-3xl md:text-4xl font-bold text-white mb-2">
            <span className="line-through text-cyan-100/40">$2,400/year</span>
            <span className="text-cyan-400 ml-4">Starting at $99/mo</span>
          </p>
          <p className="text-sm text-cyan-200/70">Save 200+ hours annually</p>
        </div>

        {/* Risk reversal */}
        <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur-sm border border-emerald-400/30 rounded-xl p-6 text-center shadow-xl shadow-emerald-500/5">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Shield className="w-6 h-6 text-emerald-400" />
            <h4 className="font-bold text-lg text-white">Zero Risk Guarantee</h4>
          </div>
          <p className="text-emerald-100/80 leading-relaxed">
            Start with a <strong className="text-white">1-day unlimited free trial</strong>.
            Cancel anytime&mdash;no questions asked.
          </p>
        </div>

        <CompactSavingsSummary />
      </div>
    </section>
  );
}
