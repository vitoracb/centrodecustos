import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CostCenter = 'valenca' | 'cna' | 'cabralia';

interface CostCenterContextType {
  selectedCenter: CostCenter;
  setSelectedCenter: (center: CostCenter) => void;
}

const CostCenterContext = createContext<CostCenterContextType | undefined>(
  undefined
);

export const useCostCenter = () => {
  const context = useContext(CostCenterContext);
  if (!context) {
    throw new Error('useCostCenter must be used within CostCenterProvider');
  }
  return context;
};

interface CostCenterProviderProps {
  children: ReactNode;
}

export const CostCenterProvider = ({ children }: CostCenterProviderProps) => {
  const [selectedCenter, setSelectedCenter] = useState<CostCenter>('valenca');

  return (
    <CostCenterContext.Provider value={{ selectedCenter, setSelectedCenter }}>
      {children}
    </CostCenterContext.Provider>
  );
};
