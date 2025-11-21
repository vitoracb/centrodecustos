import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CostCenter } from './CostCenterContext';

export type ContractCategory = 'principal' | 'terceirizados';

export interface ContractDocument {
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
}

export interface Contract {
  id: string;
  name: string;
  category: ContractCategory;
  date: string;
  docs: number;
  value?: number;
  center: CostCenter;
  documents?: ContractDocument[];
}

interface ContractContextType {
  contracts: Contract[];
  addContract: (contract: Omit<Contract, 'id'>) => void;
  getContractsByCenter: (center: CostCenter) => Contract[];
  addDocumentToContract: (contractId: string, document: ContractDocument) => void;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

export const useContracts = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContracts must be used within ContractProvider');
  }
  return context;
};

interface ContractProviderProps {
  children: ReactNode;
}

const initialContracts: Contract[] = [
  {
    id: 'ct-1',
    name: 'Serviços de TI',
    category: 'principal',
    date: '18/09/2024',
    docs: 3,
    center: 'valenca',
    documents: [],
  },
  {
    id: 'ct-2',
    name: 'Manutenção terceirizada',
    category: 'terceirizados',
    date: '02/10/2024',
    docs: 5,
    center: 'valenca',
    documents: [],
  },
];

export const ContractProvider = ({ children }: ContractProviderProps) => {
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);

  const addContract = useCallback((contract: Omit<Contract, 'id'>) => {
    const documents = contract.documents ?? [];
    const newContract: Contract = {
      ...contract,
      id: `ct-${Date.now()}`,
      documents,
      docs: documents.length, // Sempre usa o tamanho do array de documentos
    };
    setContracts((prev) => [newContract, ...prev]);
  }, []);

  const getContractsByCenter = useCallback(
    (center: CostCenter) => contracts.filter((contract) => contract.center === center),
    [contracts]
  );

  const addDocumentToContract = useCallback(
    (contractId: string, document: ContractDocument) => {
      setContracts((prev) =>
        prev.map((contract) => {
          if (contract.id !== contractId) return contract;
          const existingDocs = contract.documents ?? [];
          const updatedDocuments = [...existingDocs, document];
          return {
            ...contract,
            documents: updatedDocuments,
            docs: updatedDocuments.length,
          };
        })
      );
    },
    []
  );

  return (
    <ContractContext.Provider
      value={{ contracts, addContract, getContractsByCenter, addDocumentToContract }}
    >
      {children}
    </ContractContext.Provider>
  );
};

