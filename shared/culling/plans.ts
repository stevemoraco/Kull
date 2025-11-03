export type PlanId = "professional" | "studio";

type PlanConfig = {
  id: PlanId;
  displayName: string;
  billingCycle: "monthly" | "annual";
  monthlyCredits: number; // net credits after margin baked in
  annualCredits: number; // for lump-sum purchases
  estimatedCreditsPerShoot: number;
};

export const PLANS: Record<PlanId, PlanConfig> = {
  professional: {
    id: "professional",
    displayName: "Professional",
    billingCycle: "monthly",
    monthlyCredits: 1500,
    annualCredits: 18000,
    estimatedCreditsPerShoot: 30, // assumes ~30 credits per shoot (~1.5k images at GPT cost)
  },
  studio: {
    id: "studio",
    displayName: "Studio",
    billingCycle: "monthly",
    monthlyCredits: 6000,
    annualCredits: 72000,
    estimatedCreditsPerShoot: 60,
  },
};

export const CREDIT_TOP_UP_PACKAGES = [
  { id: "topup-500", label: "$500 credit pack", credits: 1000, priceUSD: 500 },
  { id: "topup-1000", label: "$1000 credit pack", credits: 2000, priceUSD: 1000 },
];

export const DEFAULT_PLAN_ID: PlanId = "professional";
