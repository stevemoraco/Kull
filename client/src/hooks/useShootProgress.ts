import { useState } from 'react';
import { useWebSocket } from './useWebSocket';
import { ShootProgressData } from '@shared/types/sync';

export function useShootProgress(shootId: string) {
  const [progress, setProgress] = useState<ShootProgressData | null>(null);

  useWebSocket({
    onShootProgress: (data) => {
      if (data.shootId === shootId) {
        setProgress(data);
      }
    },
  });

  return {
    progress,
    isProcessing: progress?.status === 'processing',
    isCompleted: progress?.status === 'completed',
    isFailed: progress?.status === 'failed',
    isQueued: progress?.status === 'queued',
    progressPercentage: progress
      ? Math.round((progress.processedCount / progress.totalCount) * 100)
      : 0,
  };
}
