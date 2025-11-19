import { createContext, useContext, useState, ReactNode } from 'react';

interface CalculatorContextType {
  shootsPerWeek: number;
  hoursPerShoot: number;
  billableRate: number;
  hasManuallyAdjusted: boolean;
  setShootsPerWeek: (value: number) => void;
  setHoursPerShoot: (value: number) => void;
  setBillableRate: (value: number) => void;
  setHasManuallyAdjusted: (value: boolean) => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [shootsPerWeek, setShootsPerWeek] = useState(2);
  const [hoursPerShoot, setHoursPerShoot] = useState(1.5);
  const [billableRate, setBillableRate] = useState(35);
  const [hasManuallyAdjusted, setHasManuallyAdjusted] = useState(false);

  return (
    <CalculatorContext.Provider
      value={{
        shootsPerWeek,
        hoursPerShoot,
        billableRate,
        hasManuallyAdjusted,
        setShootsPerWeek,
        setHoursPerShoot,
        setBillableRate,
        setHasManuallyAdjusted,
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
