import { useEffect, useRef, useState } from 'react';

/**
 * Section timing data structure
 * Each section tracks accumulated time in milliseconds
 */
export interface SectionTimingData {
  [sectionId: string]: number; // milliseconds
}

/**
 * Hook to track how much time users spend viewing each section of a page
 * Uses IntersectionObserver to detect when sections are visible
 * Persists data in sessionStorage to survive page navigation
 *
 * @param sectionIds - Array of section IDs to track (e.g., ['hero', 'calculator', 'pricing'])
 * @returns Object with current timing data and reset function
 */
export function useSectionTiming(sectionIds: string[]) {
  const STORAGE_KEY = 'kull_section_timing';

  // Load initial timing data from sessionStorage
  const [timingData, setTimingData] = useState<SectionTimingData>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[SectionTiming] Failed to load from sessionStorage:', error);
    }

    // Initialize all sections to 0
    const initial: SectionTimingData = {};
    sectionIds.forEach(id => {
      initial[id] = 0;
    });
    return initial;
  });

  // Track which sections are currently visible
  const visibleSectionsRef = useRef<Set<string>>(new Set());

  // Track last update time for calculating deltas
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Interval ref for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Find all section elements
    const sectionElements = new Map<string, Element>();
    sectionIds.forEach(id => {
      const element = document.querySelector(`[data-section="${id}"]`);
      if (element) {
        sectionElements.set(id, element);
      } else {
        console.warn(`[SectionTiming] Section element not found: data-section="${id}"`);
      }
    });

    if (sectionElements.size === 0) {
      console.warn('[SectionTiming] No section elements found. Make sure elements have data-section attributes.');
      return;
    }

    // Setup IntersectionObserver to track visibility
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const sectionId = entry.target.getAttribute('data-section');
          if (!sectionId) return;

          // Update visibility set
          if (entry.isIntersecting) {
            visibleSectionsRef.current.add(sectionId);
            console.log(`[SectionTiming] Section visible: ${sectionId}`);
          } else {
            visibleSectionsRef.current.delete(sectionId);
            console.log(`[SectionTiming] Section hidden: ${sectionId}`);
          }
        });
      },
      {
        threshold: 0.5, // Section is "visible" when 50% is in viewport
        rootMargin: '0px',
      }
    );

    // Observe all section elements
    sectionElements.forEach(element => {
      observer.observe(element);
    });

    // Update timing every 500ms
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = now;

      if (visibleSectionsRef.current.size > 0) {
        setTimingData(prevData => {
          const newData = { ...prevData };

          // If multiple sections are visible, split time equally
          const timePerSection = deltaTime / visibleSectionsRef.current.size;

          visibleSectionsRef.current.forEach(sectionId => {
            newData[sectionId] = (newData[sectionId] || 0) + timePerSection;
          });

          // Save to sessionStorage
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
          } catch (error) {
            console.error('[SectionTiming] Failed to save to sessionStorage:', error);
          }

          return newData;
        });
      }
    }, 500); // Update every 500ms

    // Cleanup
    return () => {
      observer.disconnect();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sectionIds]);

  // Function to reset all timing data
  const resetTiming = () => {
    const initial: SectionTimingData = {};
    sectionIds.forEach(id => {
      initial[id] = 0;
    });
    setTimingData(initial);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[SectionTiming] Failed to clear sessionStorage:', error);
    }
  };

  return {
    timingData,
    resetTiming,
  };
}

/**
 * Format timing data for human-readable display
 * @param timingData - Section timing data in milliseconds
 * @returns Formatted object with seconds
 */
export function formatTimingData(timingData: SectionTimingData): Record<string, string> {
  const formatted: Record<string, string> = {};

  Object.entries(timingData).forEach(([section, ms]) => {
    const seconds = Math.round(ms / 1000);
    formatted[section] = `${seconds}s`;
  });

  return formatted;
}
