import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CostCenter } from './CostCenterContext';

export interface Receipt {
  id: string;
  name: string;
  date: string;
  value: number;
  center: CostCenter;
  category?: string;
  status?: string;
  method?: string;
  createdAt?: number; // Timestamp quando foi criado
}

export type ExpenseCategory = 'manutencao' | 'funcionario' | 'gestao' | 'terceirizados' | 'diversos';

export type GestaoSubcategory = 'aluguel' | 'carro' | 'salario' | 'combustivel' | 'diversos';

export interface ExpenseDocument {
  type: 'nota_fiscal' | 'recibo';
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
}

export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory;
  date: string;
  value: number;
  center: CostCenter;
  documents?: ExpenseDocument[];
  equipmentId?: string; // Para manutencao, funcionario, terceirizados
  gestaoSubcategory?: GestaoSubcategory; // Para gestao
  observations?: string; // Para diversos
  status?: string;
  method?: string;
  createdAt?: number; // Timestamp quando foi criado
}

interface FinancialContextType {
  receipts: Receipt[];
  expenses: Expense[];
  addReceipt: (receipt: Omit<Receipt, 'id'>) => void;
  updateReceipt: (receipt: Receipt) => void;
  deleteReceipt: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  getReceiptsByCenter: (center: CostCenter) => Receipt[];
  getExpensesByCenter: (center: CostCenter) => Expense[];
  getAllReceipts: () => Receipt[];
  getAllExpenses: () => Expense[];
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};

interface FinancialProviderProps {
  children: ReactNode;
}

const initialReceipts: Receipt[] = [
  {
    id: 'rec-1',
    name: 'Serviços prestados',
    date: '05/11/2024',
    value: 12500,
    center: 'valenca',
    category: 'Serviços',
    status: 'Confirmado',
    method: 'Transferência',
  },
  {
    id: 'rec-2',
    name: 'Venda de equipamento',
    date: '02/11/2024',
    value: 8100,
    center: 'valenca',
    category: 'Venda de equipamento',
    status: 'Previsto',
    method: 'Boleto',
  },
];

const initialExpenses: Expense[] = [
  {
    id: 'desp-1',
    name: 'Manutenção de equipamentos',
    date: '06/11/2024',
    value: 3250,
    center: 'valenca',
    category: 'manutencao',
    status: 'Pago',
    method: 'Cartão',
    documents: [],
  },
  {
    id: 'desp-2',
    name: 'Combustível',
    date: '03/11/2024',
    value: 4800,
    center: 'valenca',
    category: 'diversos',
    status: 'Previsto',
    method: 'Transferência',
    documents: [],
  },
];

export const FinancialProvider = ({ children }: FinancialProviderProps) => {
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  const addReceipt = useCallback((receipt: Omit<Receipt, 'id'>) => {
    const newReceipt: Receipt = {
      ...receipt,
      id: `rec-${Date.now()}`,
      createdAt: Date.now(),
    };
    setReceipts((prev) => [newReceipt, ...prev]);
  }, []);

  const updateReceipt = useCallback((receipt: Receipt) => {
    setReceipts((prev) =>
      prev.map((r) => (r.id === receipt.id ? receipt : r))
    );
  }, []);

  const deleteReceipt = useCallback((id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addExpense = useCallback((expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expense,
      id: `desp-${Date.now()}`,
      createdAt: Date.now(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
  }, []);

  const updateExpense = useCallback((expense: Expense) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === expense.id ? expense : e))
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getReceiptsByCenter = useCallback(
    (center: CostCenter) => receipts.filter((receipt) => receipt.center === center),
    [receipts]
  );

  const getExpensesByCenter = useCallback(
    (center: CostCenter) => expenses.filter((expense) => expense.center === center),
    [expenses]
  );

  const getAllReceipts = useCallback(() => receipts, [receipts]);
  const getAllExpenses = useCallback(() => expenses, [expenses]);

  return (
    <FinancialContext.Provider
      value={{
        receipts,
        expenses,
        addReceipt,
        updateReceipt,
        deleteReceipt,
        addExpense,
        updateExpense,
        deleteExpense,
        getReceiptsByCenter,
        getExpensesByCenter,
        getAllReceipts,
        getAllExpenses,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

