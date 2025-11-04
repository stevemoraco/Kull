import type { CreditTransaction } from '@shared/schema';

export interface CreditBalance {
  balance: number;
}

export interface CreditUsageSummary {
  totalPurchased: number;
  totalSpent: number;
  currentBalance: number;
  byProvider: Record<string, {
    total: number;
    count: number;
    lastUsed: Date | null;
  }>;
}

export interface PurchaseResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface ConfirmPurchaseResponse {
  success: boolean;
  newBalance: number;
  message?: string;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get current credit balance
 */
export async function getCreditsBalance(): Promise<CreditBalance> {
  return fetchApi<CreditBalance>('/api/credits/balance');
}

/**
 * Get credit transaction history
 */
export async function getCreditTransactions(
  limit: number = 20,
  offset: number = 0
): Promise<CreditTransaction[]> {
  return fetchApi<CreditTransaction[]>(
    `/api/credits/transactions?limit=${limit}&offset=${offset}`
  );
}

/**
 * Get credit usage summary by provider
 */
export async function getCreditUsageSummary(): Promise<CreditUsageSummary> {
  return fetchApi<CreditUsageSummary>('/api/credits/usage-summary');
}

/**
 * Initiate a credit purchase
 */
export async function purchaseCredits(
  packageAmount: 500 | 1000
): Promise<PurchaseResponse> {
  return fetchApi<PurchaseResponse>('/api/credits/purchase', {
    method: 'POST',
    body: JSON.stringify({ packageAmount }),
  });
}

/**
 * Confirm a credit purchase after payment succeeds
 */
export async function confirmPurchase(
  paymentIntentId: string
): Promise<ConfirmPurchaseResponse> {
  return fetchApi<ConfirmPurchaseResponse>('/api/credits/purchase-confirm', {
    method: 'POST',
    body: JSON.stringify({ paymentIntentId }),
  });
}

/**
 * Deduct credits for AI usage
 */
export async function deductCredits(params: {
  amount: number;
  provider: string;
  shootId?: string;
  description: string;
}): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
  return fetchApi('/api/credits/deduct', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Process a refund (admin only)
 */
export async function refundCredits(params: {
  transactionId?: string;
  userId?: string;
  amount?: number;
  reason: string;
}): Promise<{ success: boolean; newBalance: number; refundAmount: number }> {
  return fetchApi('/api/credits/refund', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
