import { Users, Gift, Star, Crown } from "lucide-react";

export function ReferralSection() {
  const bonusTiers = [
    {
      referrals: 1,
      icon: Gift,
      reward: "Marketplace Access",
      description: "Share & search custom prompts"
    },
    {
      referrals: 3,
      icon: Star,
      reward: "1 Month Free",
      description: "Skip one month's payment"
    },
    {
      referrals: 5,
      icon: Users,
      reward: "Priority Support Upgrade",
      description: "Jump to the front of the queue"
    },
    {
      referrals: 10,
      icon: Crown,
      reward: "3 Months Free",
      description: "Save hundreds of dollars"
    }
  ];

  return (
    <section className="py-20 md:py-32 px-4" data-testid="section-referral">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground" data-testid="text-referral-headline">
            Refer Photographers,
            <br />
            <span className="text-primary">Unlock Incredible Bonuses</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Share Kull with your photography network during signup or checkout and stack rewards as your referrals grow
          </p>
        </div>

        {/* Referral tiers */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {bonusTiers.map((tier, index) => (
            <div
              key={index}
              className="bg-card border border-card-border rounded-xl p-6 text-center hover-elevate"
              data-testid={`card-referral-tier-${tier.referrals}`}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <tier.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-black text-primary mb-2">{tier.referrals}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Referrals</div>
              <h3 className="font-bold mb-2 text-card-foreground">{tier.reward}</h3>
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            </div>
          ))}
        </div>

        {/* Visual progress bar */}
        <div className="bg-card border border-card-border rounded-2xl p-8 max-w-4xl mx-auto">
          <h3 className="font-bold text-lg mb-6 text-center text-card-foreground">Referral Rewards Timeline</h3>
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-8 left-0 right-0 h-1 bg-muted" />
            <div className="absolute top-8 left-0 w-0 h-1 bg-primary transition-all duration-500" style={{ width: '0%' }} />
            
            {/* Milestones */}
            <div className="relative flex justify-between">
              {bonusTiers.map((tier, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-card border-2 border-muted flex items-center justify-center mb-2 z-10">
                    <span className="text-xl font-bold text-muted-foreground">{tier.referrals}</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-center max-w-[80px]">{tier.reward.split(' ').slice(0, 2).join(' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Your referrals get the same amazing free trial, and you get rewarded for spreading the word
        </p>
      </div>
    </section>
  );
}
