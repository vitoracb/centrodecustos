import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CostCenter } from './CostCenterContext';

export interface EmployeeDocument {
  id: string;
  employee: string;
  documentName: string;
  date: string;
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
  equipmentId: string;
  center: CostCenter;
  createdAt?: number; // Timestamp quando foi criado
}

type DocumentsByCenter = Record<CostCenter, Record<string, EmployeeDocument[]>>;

interface EmployeeContextType {
  documentsByCenter: DocumentsByCenter;
  addEmployeeDocument: (document: Omit<EmployeeDocument, 'id'>) => void;
  updateEmployeeDocument: (id: string, document: Partial<EmployeeDocument>) => void;
  deleteEmployeeDocument: (id: string) => void;
  getEmployeesByCenter: (center: CostCenter) => string[]; // Retorna array de nomes únicos de funcionários
  getEmployeesCountByCenter: (center: CostCenter) => number;
  getAllEmployeeDocuments: () => EmployeeDocument[];
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const useEmployees = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployees must be used within EmployeeProvider');
  }
  return context;
};

interface EmployeeProviderProps {
  children: ReactNode;
}

const initialDocuments: DocumentsByCenter = {
  valenca: {
    'eq-1': [
      {
        id: 'doc-1',
        employee: 'João Silva',
        documentName: 'ASO - Admissional',
        date: '05/11/2024',
        fileName: 'aso-admissional.pdf',
        fileUri: '',
        equipmentId: 'eq-1',
        center: 'valenca',
      },
    ],
  },
  cna: {},
  cabralia: {},
};

export const EmployeeProvider = ({ children }: EmployeeProviderProps) => {
  const [documentsByCenter, setDocumentsByCenter] = useState<DocumentsByCenter>(initialDocuments);

  const addEmployeeDocument = useCallback((document: Omit<EmployeeDocument, 'id'>) => {
    const newDocument: EmployeeDocument = {
      ...document,
      id: `doc-${Date.now()}`,
      createdAt: Date.now(),
    };
    
    setDocumentsByCenter((prev) => {
      const centerDocs = prev[document.center] ?? {};
      const equipmentDocs = centerDocs[document.equipmentId] ?? [];
      
      return {
        ...prev,
        [document.center]: {
          ...centerDocs,
          [document.equipmentId]: [newDocument, ...equipmentDocs],
        },
      };
    });
  }, []);

  const updateEmployeeDocument = useCallback((id: string, updates: Partial<EmployeeDocument>) => {
    setDocumentsByCenter((prev) => {
      const updated: DocumentsByCenter = { ...prev };
      
      Object.keys(updated).forEach((center) => {
        const centerKey = center as CostCenter;
        const centerDocs = updated[centerKey] ?? {};
        
        Object.keys(centerDocs).forEach((equipmentId) => {
          const equipmentDocs = centerDocs[equipmentId] ?? [];
          const index = equipmentDocs.findIndex((doc) => doc.id === id);
          
          if (index !== -1) {
            updated[centerKey] = {
              ...centerDocs,
              [equipmentId]: equipmentDocs.map((doc) =>
                doc.id === id ? { ...doc, ...updates } : doc
              ),
            };
          }
        });
      });
      
      return updated;
    });
  }, []);

  const deleteEmployeeDocument = useCallback((id: string) => {
    setDocumentsByCenter((prev) => {
      const updated: DocumentsByCenter = { ...prev };
      
      Object.keys(updated).forEach((center) => {
        const centerKey = center as CostCenter;
        const centerDocs = updated[centerKey] ?? {};
        
        Object.keys(centerDocs).forEach((equipmentId) => {
          const equipmentDocs = centerDocs[equipmentId] ?? [];
          const filtered = equipmentDocs.filter((doc) => doc.id !== id);
          
          if (filtered.length !== equipmentDocs.length) {
            updated[centerKey] = {
              ...centerDocs,
              [equipmentId]: filtered,
            };
          }
        });
      });
      
      return updated;
    });
  }, []);

  const getEmployeesByCenter = useCallback((center: CostCenter): string[] => {
    const centerDocs = documentsByCenter[center] ?? {};
    const allEmployees = new Set<string>();
    
    Object.values(centerDocs).forEach((equipmentDocs) => {
      equipmentDocs.forEach((doc) => {
        allEmployees.add(doc.employee);
      });
    });
    
    return Array.from(allEmployees);
  }, [documentsByCenter]);

  const getEmployeesCountByCenter = useCallback((center: CostCenter): number => {
    return getEmployeesByCenter(center).length;
  }, [getEmployeesByCenter]);

  const getAllEmployeeDocuments = useCallback((): EmployeeDocument[] => {
    const allDocuments: EmployeeDocument[] = [];
    Object.values(documentsByCenter).forEach((centerDocs) => {
      Object.values(centerDocs).forEach((equipmentDocs) => {
        allDocuments.push(...equipmentDocs);
      });
    });
    return allDocuments;
  }, [documentsByCenter]);

  return (
    <EmployeeContext.Provider
      value={{
        documentsByCenter,
        addEmployeeDocument,
        updateEmployeeDocument,
        deleteEmployeeDocument,
        getEmployeesByCenter,
        getEmployeesCountByCenter,
        getAllEmployeeDocuments,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
};

