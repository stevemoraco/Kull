// Activity templates for each script step
// These templates weave user activity into script questions naturally
//
// ⚠️ NOTE: This file is currently NOT used in production.
// It was an experimental feature for activity-aware templating.
// The placeholders like {annualShoots} are never substituted in production code.
// If you want to use this, you MUST call fillTemplateVariables() before sending to AI.

export interface ActivityTemplate {
  pricing: string;
  calculator: string;
  features: string;
  security: string;
  testimonials: string;
}

/**
 * Activity templates for all 15 script steps
 *
 * Each template:
 * - Acknowledges the user's activity naturally
 * - Transitions smoothly to the script question
 * - Uses {variables} for personalization
 *
 * Variables available:
 * - {annualShoots} - Calculated from calculator data
 * - {hoursPerShoot} - From calculator
 * - {billableRate} - From calculator
 * - {annualCost} - Calculated cost
 * - {weeksSaved} - Calculated weeks
 */
export const activityTemplates: Record<number, ActivityTemplate> = {
  1: {
    pricing: "i see you checking pricing — we'll get there! first, i see you're doing about {annualShoots} shoots/year based on your calculator — is that accurate?",
    calculator: "nice! love when people play with the numbers. i see about {annualShoots} shoots/year in there — is that right?",
    features: "checking out features? the ai culling is the big one. speaking of, you're doing about {annualShoots} shoots/year — accurate?",
    security: "great question about security — your photos are safe (all encrypted, deleted after processing). first though: i see about {annualShoots} shoots/year — accurate?",
    testimonials: "reading what other photographers say? smart move. quick question first: i see about {annualShoots} shoots/year — is that right?",
  },

  2: {
    pricing: "pricing time soon! but first: what's your goal for next year? more shoots? less? more profitable? walk me through it.",
    calculator: "adjusting those numbers? cool. so what's your goal for next year? more shoots? less? more profitable?",
    features: "exploring features? perfect. quick question: what's your goal for next year? more shoots? less? more profitable?",
    security: "security matters, i get it. quick question: what's your goal for next year? more? less? more profitable? walk me through it.",
    testimonials: "checking testimonials from other pros? smart. so what's your goal for next year? more shoots? less? more profitable?",
  },

  3: {
    pricing: "we'll get to pricing soon, promise. first: how many hours are you working each week right now to sustain those {annualShoots} shoots?",
    calculator: "i see you playing with the calculator — love it. so how many hours per week are you working right now?",
    features: "features are cool, yeah. but real talk: how many hours per week are you working to handle {annualShoots} shoots?",
    security: "security is locked down, don't worry. quick question: how many hours per week are you working right now?",
    testimonials: "seeing what others say? nice. so how many hours per week are you working to sustain {annualShoots} shoots?",
  },

  4: {
    pricing: "pricing comes in a sec. but first: do you know how you'll grow those numbers without hiring or working even more hours?",
    calculator: "adjusting the math? smart. so do you know how you'll grow without hiring or working more?",
    features: "features help with this next question: do you know how you'll scale up without hiring or working more hours?",
    security: "security's solid. real question: how will you grow your shoot count without hiring or burning out?",
    testimonials: "other photographers had the same question. so how will YOU grow without hiring or working more?",
  },

  5: {
    pricing: "almost to pricing. but tell me: how do you expect to do that with your current workflow?",
    calculator: "i see you in the calculator. real talk: how does your current workflow support that growth?",
    features: "features are great, but how does your current workflow support scaling up?",
    security: "data's secure, promise. but how does your current workflow let you scale?",
    testimonials: "testimonials show it works. but how does YOUR current workflow support growth?",
  },

  6: {
    pricing: "pricing depends on your goal, so what's your actual target? annual shoots, revenue, or time off?",
    calculator: "playing with those numbers? good. what's your ACTUAL target — shoots, revenue, or time back?",
    features: "features enable this, but what's your real goal? more shoots? more revenue? more time off?",
    security: "security's handled. real question: what's your target? shoots? revenue? time off?",
    testimonials: "others hit their goals with kull. what's YOURS? shoots? revenue? time off?",
  },

  7: {
    pricing: "pricing makes sense when you know the why. so why that specific goal?",
    calculator: "i see you calculating... but WHY that specific target? what's driving you?",
    features: "features help achieve goals. but why THAT goal? what's behind it?",
    security: "data's safe. real question: why is that goal important to you?",
    testimonials: "other photographers had their reasons. what's YOURS for that goal?",
  },

  8: {
    pricing: "pricing shows the roi soon. but first: what changes in your business or life when you hit that goal?",
    calculator: "calculator shows the numbers. but what CHANGES when you actually hit that target?",
    features: "features unlock this. but what actually CHANGES in your life when you hit that goal?",
    security: "security's locked down. real question: what changes when you hit your goal?",
    testimonials: "testimonials show life-changing results. what changes for YOU when you hit it?",
  },

  9: {
    pricing: "pricing comes next. but first: what's kept you from hitting that goal already?",
    calculator: "you're looking at the numbers. but what's actually BLOCKED you from hitting this already?",
    features: "checking features? good. but what's the bottleneck keeping you from your goal?",
    security: "security's solid. real talk: what's stopped you from hitting that goal already?",
    testimonials: "others had bottlenecks too. what's YOURS? what's kept you stuck?",
  },

  10: {
    pricing: "almost to pricing. but here's the thing: this is exactly what i specialize in — removing the workflow block keeping you from those numbers.",
    calculator: "i see you running the math. this is what kull does: removes the exact bottleneck you just described.",
    features: "features solve this exact problem: removing the workflow block keeping you from your goal.",
    security: "data's encrypted and safe. now here's what kull does: removes that exact bottleneck you mentioned.",
    testimonials: "testimonials prove it works. kull removes the exact workflow block keeping you from your numbers.",
  },

  11: {
    pricing: "pricing makes sense when you're committed. so how committed are you to hitting that goal? 1-10.",
    calculator: "you're calculating the roi. but how committed are you to actually hitting it? 1-10.",
    features: "features are powerful. but how committed are YOU to the goal? 1-10.",
    security: "security's locked. real question: how committed are you? 1-10.",
    testimonials: "others were committed and hit it. how committed are YOU? 1-10.",
  },

  12: {
    pricing: "pricing time in a sec. first: when do you want this fixed so you can hit those numbers?",
    calculator: "calculator shows what's possible. when do you want to START hitting those numbers?",
    features: "features are ready now. when do you want this bottleneck FIXED?",
    security: "security's immediate. so when do you want your workflow fixed?",
    testimonials: "others started immediately. when do YOU want this fixed?",
  },

  13: {
    pricing: "checking out pricing — want the exact number?",
    calculator: "calculator's been showing you the math. want the actual price?",
    features: "features are worth it. want to know what it costs?",
    security: "everything's secure and encrypted. want the price?",
    testimonials: "testimonials show the value. ready for the price?",
  },

  14: {
    pricing: "here it is: everyday price is ${price}/month to solve exactly the problem you described. based on your {annualShoots} shoots at {hoursPerShoot}h each.",
    calculator: "based on your numbers ({annualShoots} shoots, {hoursPerShoot}h each), everyday price is ${price}/month.",
    features: "for all those features solving your bottleneck: ${price}/month based on {annualShoots} shoots.",
    security: "secure, encrypted, enterprise-grade for ${price}/month based on {annualShoots} shoots.",
    testimonials: "same price those photographers paid: ${price}/month for {annualShoots} shoots.",
  },

  15: {
    pricing: "you've been looking at pricing. here's the deal: everyday price is ${everydayPrice}, but if you'll commit to the goal you told me, i'll discount it to ${discountPrice}.",
    calculator: "based on those calculator numbers: everyday ${everydayPrice}, but i'll discount to ${discountPrice} if you commit to your goal.",
    features: "all features included: everyday ${everydayPrice}, discounted to ${discountPrice} if you commit.",
    security: "enterprise security included: ${everydayPrice} normally, ${discountPrice} if you commit to your goal.",
    testimonials: "same deal other photographers got: ${everydayPrice} everyday, ${discountPrice} with commitment to your goal.",
  },
};

/**
 * Get activity template for a specific step and activity type
 * Returns null if no template exists for this combination
 */
export function getActivityTemplate(
  step: number,
  activityType: string
): string | null {
  const stepTemplates = activityTemplates[step];
  if (!stepTemplates) return null;

  return stepTemplates[activityType as keyof ActivityTemplate] || null;
}

/**
 * Fill template variables with actual data
 */
export function fillTemplateVariables(
  template: string,
  data: {
    annualShoots?: number;
    hoursPerShoot?: number;
    billableRate?: number;
    annualCost?: number;
    weeksSaved?: number;
    price?: string;
    everydayPrice?: string;
    discountPrice?: string;
  }
): string {
  let filled = template;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
  });

  return filled;
}
