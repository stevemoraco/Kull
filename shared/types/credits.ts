// Credit system types for AI provider usage tracking

export type CreditTransactionType = 'purchase' | 'usage' | 'refund' | 'bonus';

export type AIProvider =
  | 'apple-intelligence'
  | 'google-gemini'
  | 'groq'
  | 'grok'
  | 'anthropic-claude'
  | 'openai';

export interface CreditBalance {
  userId: string;
  balance: number; // cents worth of credits
  lastUpdated: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number; // cents (negative for usage, positive for purchase/bonus)
  balance: number; // balance after transaction
  type: CreditTransactionType;
  provider?: AIProvider;
  shootId?: string;
  stripePaymentIntentId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CreditPurchasePackage {
  amount: number; // dollars
  credits: number; // cents
  bonus?: number; // additional cents
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPurchasePackage[] = [
  {
    amount: 500,
    credits: 50000, // $500 worth
    popular: false,
  },
  {
    amount: 1000,
    credits: 100000, // $1000 worth
    bonus: 10000, // $100 bonus
    popular: true,
  },
];

export interface CreditUsageByProvider {
  provider: AIProvider;
  totalSpent: number; // cents
  transactionCount: number;
  lastUsed?: Date;
}

export interface CreditUsageSummary {
  totalPurchased: number;
  totalSpent: number;
  currentBalance: number;
  byProvider: CreditUsageByProvider[];
}

export interface PurchaseCreditsData {
  packageAmount: number; // 500 or 1000
  paymentMethodId?: string; // Stripe payment method
}
