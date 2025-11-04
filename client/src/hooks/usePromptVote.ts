import { useState, useEffect } from 'react';
import { votePrompt } from '@/api/prompts';
import { useAuth } from './useAuth';

export function usePromptVote(promptId: string, initialVote?: number) {
  const { isAuthenticated } = useAuth();
  const [vote, setVote] = useState<number>(initialVote || 0);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialVote !== undefined) {
      setVote(initialVote);
    }
  }, [initialVote]);

  const submitVote = async (value: 1 | -1) => {
    if (!isAuthenticated) {
      setError('You must be logged in to vote');
      return;
    }

    try {
      setIsVoting(true);
      setError(null);

      // Optimistic update
      const previousVote = vote;
      setVote(value);

      await votePrompt(promptId, value);
    } catch (err: any) {
      // Revert on error
      setVote(vote);
      setError(err.message || 'Failed to submit vote');
      console.error('Error voting:', err);
    } finally {
      setIsVoting(false);
    }
  };

  return {
    vote,
    isVoting,
    error,
    submitVote,
  };
}
