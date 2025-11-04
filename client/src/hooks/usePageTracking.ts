import { useEffect } from 'react';

export function usePageTracking(pageName: string) {
  useEffect(() => {
    const trackVisit = async () => {
      try {
        // Generate a session ID if not already present
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          sessionStorage.setItem('sessionId', sessionId);
        }

        await fetch('/api/track-visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            page: pageName,
            sessionId,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
          }),
        });
      } catch (error) {
        console.error('Failed to track page visit:', error);
      }
    };

    trackVisit();
  }, [pageName]);
}
