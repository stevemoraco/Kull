import { useEffect, useState } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface ThinkingProgressProps {
  statusLogs: string;
}

export function ThinkingProgress({ statusLogs }: ThinkingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Smooth 20-second animation (0-100%)
    const startTime = Date.now();
    const duration = 20000; // 20 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
      }
    }, 50); // Update every 50ms for smooth animation

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-3 border-l-4 border-teal-500 pl-4 py-3 bg-gradient-to-r from-teal-50 to-transparent rounded-r shadow-sm">
      {/* Main progress section */}
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-teal-600 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-teal-800 mb-2">
            Kull is carefully considering the next response
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-teal-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-teal-600 mt-1">
            {Math.round(progress)}% • {Math.max(0, 20 - Math.round(progress / 5))}s remaining
          </div>
        </div>
      </div>

      {/* Collapsible status logs */}
      {statusLogs && statusLogs.length > 0 && (
        <div className="border-t border-teal-200 pt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs text-teal-700 hover:text-teal-900 transition-colors w-full"
          >
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            <span>{isExpanded ? 'Hide' : 'Show'} processing details</span>
          </button>

          {isExpanded && (
            <div className="mt-2 max-h-32 overflow-y-auto text-xs font-mono text-teal-700 whitespace-pre-wrap leading-relaxed bg-teal-50/50 p-2 rounded">
              {statusLogs}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
