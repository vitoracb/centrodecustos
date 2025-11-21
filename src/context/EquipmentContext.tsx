import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CostCenter } from './CostCenterContext';

export interface Equipment {
  id: string;
  name: string;
  brand: string;
  year: number;
  purchaseDate: string;
  nextReview: string;
  center: CostCenter;
}

interface EquipmentContextType {
  equipments: Equipment[];
  addEquipment: (equipment: Omit<Equipment, 'id'>) => void;
  updateEquipment: (id: string, equipment: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;
  getEquipmentsByCenter: (center: CostCenter) => Equipment[];
}

const EquipmentContext = createContext<EquipmentContextType | undefined>(
  undefined
);

export const useEquipment = () => {
  const context = useContext(EquipmentContext);
  if (!context) {
    throw new Error('useEquipment must be used within EquipmentProvider');
  }
  return context;
};

interface EquipmentProviderProps {
  children: ReactNode;
}

// Mock inicial de equipamentos por centro de custo
const initialEquipments: Equipment[] = [
  {
    id: 'eq-1',
    name: 'Trator John Deere 5090E',
    brand: 'John Deere',
    year: 2021,
    purchaseDate: '12/05/2023',
    nextReview: '10/03/2025',
    center: 'valenca',
  },
  {
    id: 'eq-2',
    name: 'Colheitadeira Case IH 7150',
    brand: 'Case IH',
    year: 2020,
    purchaseDate: '03/11/2022',
    nextReview: '22/01/2025',
    center: 'valenca',
  },
  {
    id: 'eq-3',
    name: 'Caminhão Volvo VM 270',
    brand: 'Volvo',
    year: 2019,
    purchaseDate: '15/08/2021',
    nextReview: '15/08/2025',
    center: 'cna',
  },
];

export const EquipmentProvider = ({ children }: EquipmentProviderProps) => {
  const [equipments, setEquipments] = useState<Equipment[]>(initialEquipments);

  const addEquipment = (equipment: Omit<Equipment, 'id'>) => {
    const newEquipment: Equipment = {
      ...equipment,
      id: `eq-${Date.now()}`,
    };
    setEquipments((prev) => [newEquipment, ...prev]);
  };

  const updateEquipment = (id: string, updates: Partial<Equipment>) => {
    setEquipments((prev) =>
      prev.map((eq) => (eq.id === id ? { ...eq, ...updates } : eq))
    );
  };

  const deleteEquipment = (id: string) => {
    setEquipments((prev) => prev.filter((eq) => eq.id !== id));
  };

  const getEquipmentsByCenter = (center: CostCenter) => {
    return equipments.filter((eq) => eq.center === center);
  };

  return (
    <EquipmentContext.Provider
      value={{
        equipments,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        getEquipmentsByCenter,
      }}
    >
      {children}
    </EquipmentContext.Provider>
  );
};

