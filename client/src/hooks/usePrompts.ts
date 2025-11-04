import { useState, useEffect } from 'react';
import type { PromptTemplate, PromptSearchFilters } from '@shared/types/marketplace';
import { getPrompts } from '@/api/prompts';

export function usePrompts(filters?: PromptSearchFilters) {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPrompts(filters);
      setPrompts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch prompts');
      console.error('Error fetching prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [
    filters?.query,
    filters?.profile,
    filters?.sortBy,
    filters?.featured,
    filters?.authorId,
    filters?.tags?.join(','),
  ]);

  return {
    prompts,
    loading,
    error,
    refetch: fetchPrompts,
  };
}
