import { useState, useEffect } from 'react';
import { wsService, ConnectionStatus } from '../services/websocket';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function SyncIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    const unsubscribe = wsService.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Connected',
          pulse: false,
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          text: 'Connecting...',
          pulse: true,
        };
      case 'reconnecting':
        return {
          color: 'bg-yellow-500',
          text: 'Reconnecting...',
          pulse: true,
        };
      case 'disconnected':
        return {
          color: 'bg-red-500',
          text: 'Disconnected',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative flex items-center gap-2 cursor-help">
          <div className="relative">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                config.color,
                config.pulse && 'animate-pulse'
              )}
            />
            {config.pulse && (
              <div
                className={cn(
                  'absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-75',
                  config.color
                )}
              />
            )}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Sync
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm font-medium">{config.text}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time sync {status === 'connected' ? 'active' : 'inactive'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
