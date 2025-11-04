import { useState, useEffect, useCallback } from 'react';
import {
  getCreditsBalance,
  getCreditTransactions,
  getCreditUsageSummary,
  type CreditBalance,
  type CreditUsageSummary
} from '@/api/credits';
import type { CreditTransaction } from '@shared/schema';

export function useCredits() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCreditsBalance();
      setBalance(data.balance);
    } catch (err: any) {
      console.error('[useCredits] Error fetching balance:', err);
      setError(err.message || 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance
  };
}

export function useCreditTransactions(limit: number = 20) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchTransactions = useCallback(async (newOffset: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCreditTransactions(limit, newOffset);

      if (newOffset === 0) {
        setTransactions(data);
      } else {
        setTransactions(prev => [...prev, ...data]);
      }

      setHasMore(data.length === limit);
      setOffset(newOffset);
    } catch (err: any) {
      console.error('[useCreditTransactions] Error:', err);
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchTransactions(offset + limit);
    }
  }, [offset, limit, loading, hasMore, fetchTransactions]);

  const refetch = useCallback(() => {
    fetchTransactions(0);
  }, [fetchTransactions]);

  useEffect(() => {
    fetchTransactions(0);
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    hasMore,
    loadMore,
    refetch
  };
}

export function useCreditUsageSummary() {
  const [summary, setSummary] = useState<CreditUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCreditUsageSummary();
      setSummary(data);
    } catch (err: any) {
      console.error('[useCreditUsageSummary] Error:', err);
      setError(err.message || 'Failed to fetch usage summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary
  };
}
