import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface CalculatorValues {
  shootsPerWeek: number;
  hoursPerShoot: number;
  billableRate: number;
}

interface CalculatorContextType {
  shootsPerWeek: number;
  hoursPerShoot: number;
  billableRate: number;
  hasManuallyAdjusted: boolean;
  hasClickedPreset: boolean;
  setShootsPerWeek: (value: number) => void;
  setHoursPerShoot: (value: number) => void;
  setBillableRate: (value: number) => void;
  setHasManuallyAdjusted: (value: boolean) => void;
  setHasClickedPreset: (value: boolean) => void;
  onCalculatorChange?: (values: CalculatorValues) => void;
  registerChangeListener: (listener: (values: CalculatorValues) => void) => () => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [shootsPerWeek, setShootsPerWeekState] = useState(2);
  const [hoursPerShoot, setHoursPerShootState] = useState(1.5);
  const [billableRate, setBillableRateState] = useState(35);
  const [hasManuallyAdjusted, setHasManuallyAdjusted] = useState(false);
  const [hasClickedPreset, setHasClickedPreset] = useState(false);

  // Store change listeners
  const listenersRef = useRef<Set<(values: CalculatorValues) => void>>(new Set());

  // Notify all listeners when calculator values change
  const notifyListeners = useCallback((values: CalculatorValues) => {
    listenersRef.current.forEach(listener => {
      try {
        listener(values);
      } catch (error) {
        console.error('[Calculator] Error in change listener:', error);
      }
    });
  }, []);

  // Wrapped setters that notify listeners
  const setShootsPerWeek = useCallback((value: number) => {
    setShootsPerWeekState(prev => {
      if (prev !== value) {
        const newValues = { shootsPerWeek: value, hoursPerShoot, billableRate };
        // Notify listeners after state update
        setTimeout(() => notifyListeners(newValues), 0);
      }
      return value;
    });
  }, [hoursPerShoot, billableRate, notifyListeners]);

  const setHoursPerShoot = useCallback((value: number) => {
    setHoursPerShootState(prev => {
      if (prev !== value) {
        const newValues = { shootsPerWeek, hoursPerShoot: value, billableRate };
        setTimeout(() => notifyListeners(newValues), 0);
      }
      return value;
    });
  }, [shootsPerWeek, billableRate, notifyListeners]);

  const setBillableRate = useCallback((value: number) => {
    setBillableRateState(prev => {
      if (prev !== value) {
        const newValues = { shootsPerWeek, hoursPerShoot, billableRate: value };
        setTimeout(() => notifyListeners(newValues), 0);
      }
      return value;
    });
  }, [shootsPerWeek, hoursPerShoot, notifyListeners]);

  // Register a listener and return cleanup function
  const registerChangeListener = useCallback((listener: (values: CalculatorValues) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return (
    <CalculatorContext.Provider
      value={{
        shootsPerWeek,
        hoursPerShoot,
        billableRate,
        hasManuallyAdjusted,
        hasClickedPreset,
        setShootsPerWeek,
        setHoursPerShoot,
        setBillableRate,
        setHasManuallyAdjusted,
        setHasClickedPreset,
        registerChangeListener,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculator() {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return context;
}
