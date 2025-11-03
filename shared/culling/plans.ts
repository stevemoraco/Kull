export type Plan = {
  id: string;
  displayName: string;
  monthlyCredits: number;
  estimatedCreditsPerShoot: number;
};

export const PLANS: Record<string, Plan> = {
  professional: {
    id: "professional",
    displayName: "Professional",
    monthlyCredits: 2000,
    estimatedCreditsPerShoot: 25,
  },
  studio: {
    id: "studio",
    displayName: "Studio",
    monthlyCredits: 10000,
    estimatedCreditsPerShoot: 25,
  },
};

export const DEFAULT_PLAN_ID = "professional";

export const CREDIT_TOP_UP_PACKAGES = [
  { id: "topup-500", displayName: "$500 credits", credits: 500 },
  { id: "topup-1000", displayName: "$1,000 credits", credits: 1000 },
];
