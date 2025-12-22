import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import dayjs from "dayjs";
import { Alert } from "react-native";
import { CostCenter, useCostCenter } from "./CostCenterContext";
import { supabase } from "@/src/lib/supabaseClient";
import { uploadMultipleFilesToStorage, uploadFileToStorage } from "@/src/lib/storageUtils";
import { useAuth } from "./AuthContext";
import { useRealtimeSync } from "@/src/hooks/useRealtimeSync";
import { financialCache } from "../lib/smartCache";
import usePaginatedQuery from "../hooks/usePaginatedQuery";
import { sanitizeName, sanitizeText, sanitizeCurrency, validateAndSanitize } from "@/src/lib/security";
import { logFinancialOperation } from "@/src/lib/auditLogger";
import { pushEvents } from "@/src/lib/pushEvents";

// ========================
// TIPOS
// ========================

export type ReceiptStatus =
  | "a_confirmar"
  | "confirmado"
  | "a_receber"
  | "recebido";

export interface Receipt {
  id: string;
  name: string;
  date: string; // dd/MM/yyyy
  value: number;
  center: CostCenter;
  category?: string;
  status?: ReceiptStatus;
  method?: string;
  createdAt?: number; // timestamp
  isFixed?: boolean; // Indica se é um recebimento fixo/recorrente
  fixedDurationMonths?: number; // Número de meses de duração (null = indefinido)
  installmentNumber?: number; // Número da parcela (1, 2, 3, etc)
}

export type ExpenseCategory =
  | "manutencao"
  | "funcionario"
  | "gestor"
  | "terceirizados"
  | "diversos"
  | "equipamentos"
  | "impostos";

export type ExpenseStatus =
  | "confirmar"
  | "confirmado"
  | "a_pagar"
  | "pago";

export type GestaoSubcategory =
  | "aluguel"
  | "carro"
  | "salario"
  | "combustivel"
  | "diversos";

export type ExpenseSector =
  | "now"
  | "felipe_viatransportes"
  | "terceirizados"
  | "gestao"
  | "ronaldo"
  | "variavel"
  | "parcela_patrol_ronaldo"
  | "particular"
  | "imposto";

export interface ExpenseDocument {
  type: "nota_fiscal" | "recibo" | "comprovante_pagamento" | "boleto";
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
}

export interface ExpenseDebitAdjustment {
  amount: number;
  description?: string;
}

export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory;
  date: string; // dd/MM/yyyy
  value: number;
  center: CostCenter;
  documents?: ExpenseDocument[];
  equipmentId?: string;
  gestaoSubcategory?: GestaoSubcategory;
  observations?: string;
  status?: ExpenseStatus;
  method?: string;
  createdAt?: number;
  isFixed?: boolean; // Indica se é uma despesa fixa/recorrente
  sector?: ExpenseSector; // Setor da despesa fixa
  fixedDurationMonths?: number; // Número de meses de duração (null = indefinido)
  installmentNumber?: number; // Número da parcela (1, 2, 3...)
  debitAdjustment?: ExpenseDebitAdjustment; // Abatimento/débito aplicado à despesa
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  manutencao: "Manutenção",
  funcionario: "Funcionário",
  gestor: "Gestor",
  terceirizados: "Terceirizados",
  diversos: "Diversos",
  equipamentos: "Equipamentos",
  impostos: "Impostos",
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

interface FinancialContextType {
  receipts: Receipt[];
  expenses: Expense[];
  loading: boolean;

  // 🚀 PAGINAÇÃO
  loadMoreExpenses: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  expensesLoading: boolean;
  hasMoreExpenses: boolean;

  loadMoreReceipts: () => Promise<void>;
  refreshReceipts: () => Promise<void>;
  receiptsLoading: boolean;
  hasMoreReceipts: boolean;

  addReceipt: (receipt: Omit<Receipt, "id">) => void;
  updateReceipt: (receipt: Receipt) => Promise<Receipt>;
  deleteReceipt: (id: string) => void;

  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  addDocumentToExpense: (expenseId: string, document: Omit<ExpenseDocument, "type"> & { type: "nota_fiscal" | "recibo" | "comprovante_pagamento" | "boleto" }) => Promise<ExpenseDocument>;
  deleteExpenseDocument: (expenseId: string, documentUri: string) => Promise<void>;

  getReceiptsByCenter: (center: CostCenter) => Receipt[];
  getExpensesByCenter: (center: CostCenter) => Expense[];

  getAllReceipts: () => Receipt[];
  getAllExpenses: () => Expense[];
  generateFixedExpenses: () => Promise<void>;

  getExpensesForDateRange: (startDate: string, endDate: string, centerId?: CostCenter) => Promise<Expense[]>;
  getReceiptsForDateRange: (startDate: string, endDate: string, centerId?: CostCenter) => Promise<Receipt[]>;
}

// Verifica se já existe uma despesa idêntica no mesmo mês
const isDuplicateExpense = (
  expenses: Expense[],
  newExpense: {
    name: string;
    value: number;
    category: ExpenseCategory;
    equipmentId?: string;
    date: string;
    center: CostCenter;
  },
): boolean => {
  const [, month, year] = newExpense.date.split("/").map(Number);

  return expenses.some((existing) => {
    const [, existingMonth, existingYear] = existing.date
      .split("/")
      .map(Number);

    const isSameMonth = existingMonth === month && existingYear === year;
    if (!isSameMonth) return false;

    return (
      existing.name.toLowerCase().trim() ===
      newExpense.name.toLowerCase().trim() &&
      existing.value === newExpense.value &&
      existing.category === newExpense.category &&
      (existing.equipmentId ?? undefined) === newExpense.equipmentId &&
      existing.center === newExpense.center
    );
  });
};

// ========================
// VALIDAÇÃO DE ENTRADA
// ========================

/**
 * Valida e sanitiza dados de uma despesa
 */
const validateAndSanitizeExpense = (expense: Omit<Expense, "id">): { isValid: boolean; sanitizedExpense?: Omit<Expense, "id">; error?: string } => {
  try {
    // Validação obrigatória
    if (!expense.name || !expense.date || !expense.value || !expense.category || !expense.center) {
      return { isValid: false, error: "Campos obrigatórios não preenchidos" };
    }

    // Sanitização
    const sanitizedExpense: Omit<Expense, "id"> = {
      ...expense,
      name: sanitizeName(expense.name),
      value: sanitizeCurrency(expense.value),
      observations: expense.observations ? sanitizeText(expense.observations, 500) : undefined,
      method: expense.method ? sanitizeName(expense.method) : undefined,
    };

    // Validação pós-sanitização
    if (!sanitizedExpense.name.trim()) {
      return { isValid: false, error: "Nome da despesa é obrigatório" };
    }

    if (sanitizedExpense.value <= 0) {
      return { isValid: false, error: "Valor deve ser maior que zero" };
    }

    return { isValid: true, sanitizedExpense };
  } catch (error) {
    return { isValid: false, error: "Erro na validação dos dados" };
  }
};

/**
 * Valida e sanitiza dados de um recebimento
 */
const validateAndSanitizeReceipt = (receipt: Omit<Receipt, "id">): { isValid: boolean; sanitizedReceipt?: Omit<Receipt, "id">; error?: string } => {
  try {
    // Validação obrigatória
    if (!receipt.name || !receipt.date || !receipt.value || !receipt.center) {
      return { isValid: false, error: "Campos obrigatórios não preenchidos" };
    }

    // Sanitização
    const sanitizedReceipt: Omit<Receipt, "id"> = {
      ...receipt,
      name: sanitizeName(receipt.name),
      value: sanitizeCurrency(receipt.value),
      category: receipt.category ? sanitizeName(receipt.category) : undefined,
      method: receipt.method ? sanitizeName(receipt.method) : undefined,
    };

    // Validação pós-sanitização
    if (!sanitizedReceipt.name.trim()) {
      return { isValid: false, error: "Nome do recebimento é obrigatório" };
    }

    if (sanitizedReceipt.value <= 0) {
      return { isValid: false, error: "Valor deve ser maior que zero" };
    }

    return { isValid: true, sanitizedReceipt };
  } catch (error) {
    return { isValid: false, error: "Erro na validação dos dados" };
  }
};

// ========================
// CONTEXTO / HOOK
// ========================

const FinancialContext = createContext<FinancialContextType | undefined>(
  undefined
);

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error("useFinancial must be used within a FinancialProvider");
  }
  return context;
};

// ========================
// HELPERS DE DATA
// ========================

// dd/MM/yyyy -> YYYY-MM-DD
const toDbDate = (value?: string): string | null => {
  if (!value) return null;
  const [d, m, y] = value.split("/");
  if (!d || !m || !y) return null;
  return `${y}-${m}-${d}`;
};

// YYYY-MM-DD -> dd/MM/yyyy
const fromDbDate = (value: string | null): string => {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
};

// Funções para serializar/deserializar débito no campo reference
const DEBIT_TAG = '__DEBIT__:';

function parseReferenceField(reference: string | null): {
  observations?: string;
  debitAdjustment?: ExpenseDebitAdjustment;
} {
  if (!reference) {
    return {};
  }

  const lines = reference.split('\n');
  let debitAdjustment: ExpenseDebitAdjustment | undefined;
  const observationsLines: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith(DEBIT_TAG)) {
      try {
        const jsonStr = line.replace(DEBIT_TAG, '');
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed.amount === 'number' && parsed.amount > 0) {
          debitAdjustment = {
            amount: parsed.amount,
            description: parsed.description || undefined,
          };
        }
      } catch {
        // Ignora erro de parse
      }
    } else {
      observationsLines.push(line);
    }
  });

  return {
    observations: observationsLines.join('\n').trim() || undefined,
    debitAdjustment,
  };
}

function buildReferenceField(observations?: string, debitAdjustment?: ExpenseDebitAdjustment): string | null {
  const parts: string[] = [];

  if (observations && observations.trim()) {
    parts.push(observations.trim());
  }

  if (debitAdjustment && debitAdjustment.amount > 0) {
    parts.push(`${DEBIT_TAG}${JSON.stringify({
      amount: debitAdjustment.amount,
      description: debitAdjustment.description || '',
    })}`);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

// ========================
// MAPEAMENTO: LINHA -> EXPENSE
// ========================

async function mapRowToExpense(row: any): Promise<Expense> {
  const centerCode = (row.cost_center_id ?? "valenca") as CostCenter;

  // Carrega documentos da despesa
  let documents: ExpenseDocument[] = [];
  try {
    const { data: docsData, error: docsError } = await supabase
      .from("expense_documents")
      .select("type, file_name, file_url, mime_type")
      .eq("expense_id", row.id)
      .order("created_at", { ascending: true });

    if (docsError) {
      if (
        docsError.code === "PGRST205" ||
        docsError.message?.includes("Could not find the table")
      ) {
        documents = [];
      } else {
        console.warn("⚠️ Erro ao carregar documentos da despesa:", docsError);
      }
    } else if (docsData) {
      documents = docsData.map((doc: any) => ({
        type: (doc.type ?? "recibo") as "nota_fiscal" | "recibo" | "comprovante_pagamento",
        fileName: doc.file_name ?? "",
        fileUri: doc.file_url ?? "",
        mimeType: doc.mime_type ?? null,
      }));
    }
  } catch (e) {
    console.warn("⚠️ Erro ao carregar documentos da despesa:", e);
  }

  // Determina o status: normaliza do banco para ExpenseStatus
  let expenseStatus: ExpenseStatus = "confirmar";
  if (row.status) {
    const normalizedStatus = row.status.toLowerCase().replace(/_/g, "_");
    if (normalizedStatus === "pago" || normalizedStatus === "PAGO") {
      // Só permite "pago" se houver documentos (comprovante)
      expenseStatus = documents.length > 0 ? "pago" : "confirmado";
    } else if (normalizedStatus === "confirmado" || normalizedStatus === "CONFIRMADO") {
      expenseStatus = "confirmado";
    } else if (normalizedStatus === "a_pagar" || normalizedStatus === "a pagar" || normalizedStatus === "A_PAGAR") {
      expenseStatus = "a_pagar";
    } else if (normalizedStatus === "confirmar" || normalizedStatus === "CONFIRMAR") {
      expenseStatus = "confirmar";
    }
  }

  // Parse reference field para obter observations e debitAdjustment
  const { observations, debitAdjustment } = parseReferenceField(row.reference ?? null);

  return {
    id: row.id,
    name: row.description ?? "",
    category: (row.category ?? "diversos") as ExpenseCategory,
    date: fromDbDate(row.date),
    value: Number(row.value ?? 0),
    center: centerCode,
    documents: documents.length > 0 ? documents : undefined,
    equipmentId: row.equipment_id ?? undefined,
    gestaoSubcategory: undefined,
    observations,
    status: expenseStatus,
    method: row.payment_method ?? undefined,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : undefined,
    isFixed: row.is_fixed ?? false,
    sector: row.sector ? (row.sector.toLowerCase() as ExpenseSector) : undefined,
    fixedDurationMonths: row.fixed_duration_months ?? undefined,
    installmentNumber: row.installment_number ?? undefined,
    debitAdjustment,
  };
}

// ========================
// MAPEAMENTO: LINHA -> RECEIPT
// ========================

function mapRowToReceipt(row: any): Receipt {
  const centerCode = (row.cost_center_id ?? "valenca") as CostCenter;

  // Mapeia o status do banco para o tipo ReceiptStatus
  let receiptStatus: ReceiptStatus = "a_confirmar";
  if (row.status) {
    const statusLower = row.status.toLowerCase();
    if (statusLower === "confirmado" || statusLower === "confirmada") {
      receiptStatus = "confirmado";
    } else if (statusLower === "a_receber" || statusLower === "a receber") {
      receiptStatus = "a_receber";
    } else if (statusLower === "recebido" || statusLower === "recebida") {
      receiptStatus = "recebido";
    } else if (statusLower === "a_confirmar" || statusLower === "a confirmar") {
      receiptStatus = "a_confirmar";
    }
  }

  const receipt = {
    id: row.id,
    name: row.description ?? "",
    date: fromDbDate(row.date),
    value: Number(row.value ?? 0),
    center: centerCode,
    category: row.category ?? undefined,
    status: receiptStatus,
    method: row.payment_method ?? undefined,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : undefined,
    isFixed: row.is_fixed ?? false,
    fixedDurationMonths: row.fixed_duration_months ?? undefined,
    installmentNumber: row.installment_number ?? undefined,
  };

  // Log para debug
  if (receipt.isFixed || receipt.installmentNumber) {
    console.log('📦 [DEBUG] Receita mapeada:', {
      name: receipt.name,
      isFixed: receipt.isFixed,
      installmentNumber: receipt.installmentNumber,
      fixedDurationMonths: receipt.fixedDurationMonths,
    });
  }

  return receipt;
}

// ========================
// PROVIDER
// ========================

interface FinancialProviderProps {
  children: ReactNode;
}

export const FinancialProvider = ({ children }: FinancialProviderProps) => {
  const { user } = useAuth();
  const { selectedCenter } = useCostCenter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================
  // 🚀 QUERIES PAGINADAS
  // ============================================

  // Query paginada para despesas
  const expenseQuery = useCallback((from: number, to: number) => {
    let query = supabase
      .from("financial_transactions")
      .select(
        `
        id,
        type,
        status,
        date,
        value,
        category,
        description,
        payment_method,
        reference,
        equipment_id,
        is_fixed,
        sector,
        fixed_duration_months,
        installment_number,
        created_at,
        cost_center_id
        `,
        { count: 'exact' }
      )
      .eq("type", "DESPESA")
      .is("deleted_at", null);

    if (selectedCenter) {
      query = query.eq("cost_center_id", selectedCenter);
    }

    return query
      .order("created_at", { ascending: false })
      .range(from, to);
  }, [user, selectedCenter]);


  // Hook paginado para despesas
  const {
    data: expensesData,
    loading: expensesLoading,
    error: expensesError,
    hasNextPage: hasMoreExpenses,
    loadMore: loadMoreExpenses,
    refresh: refreshExpenses,
  } = usePaginatedQuery(`financial_transactions_expenses:${user?.id}:${selectedCenter}`, expenseQuery, {
    pageSize: 20,
    prefetchNext: true,
    cacheStrategy: 'incremental',
    cacheTTL: 3 * 60 * 1000,
  });

  // Query paginada para receitas
  const receiptQuery = useCallback((from: number, to: number) => {
    let query = supabase
      .from("financial_transactions")
      .select(
        `
        id,
        type,
        status,
        date,
        value,
        category,
        description,
        payment_method,
        reference,
        is_fixed,
        fixed_duration_months,
        installment_number,
        created_at,
        cost_center_id
        `,
        { count: 'exact' }
      )
      .eq("type", "RECEITA")
      .is("deleted_at", null);

    if (selectedCenter) {
      query = query.eq("cost_center_id", selectedCenter);
    }

    return query
      .order("created_at", { ascending: false })
      .range(from, to);
  }, [user, selectedCenter]);

  // Hook paginado para receitas
  const {
    data: receiptsData,
    loading: receiptsLoading,
    error: receiptsError,
    hasNextPage: hasMoreReceipts,
    loadMore: loadMoreReceipts,
    refresh: refreshReceipts,
  } = usePaginatedQuery(`financial_transactions_receipts:${user?.id}:${selectedCenter}`, receiptQuery, {
    pageSize: 20,
    prefetchNext: true,
    cacheStrategy: 'incremental',
    cacheTTL: 3 * 60 * 1000,
  });

  // ============================================
  // 📊 PROCESSAR DADOS PAGINADOS
  // ============================================

  // Mapear dados de despesas
  useEffect(() => {
    const processExpenses = async () => {
      if (!user || !selectedCenter) {
        setExpenses([]);
        setLoading(false);
        return;
      }

      if (expensesData && expensesData.length > 0) {
        const mappedExpenses = await Promise.all(
          expensesData.map((row: any) => mapRowToExpense(row))
        );
        // 🚀 OPTIMISTIC: Preserva itens temporários ao mesclar com dados do servidor
        setExpenses((prev) => {
          // Mantém itens otimistas (com ID temp-)
          const optimisticItems = prev.filter((e) => e.id.startsWith('temp-'));
          // Mescla: otimistas primeiro, depois os dados do servidor
          return [...optimisticItems, ...mappedExpenses];
        });
      } else {
        // Preserva itens otimistas mesmo quando não há dados do servidor
        setExpenses((prev) => prev.filter((e) => e.id.startsWith('temp-')));
      }
      setLoading(expensesLoading);
    };

    processExpenses();
  }, [expensesData, expensesLoading, user, selectedCenter]);

  // Mapear dados de receitas
  useEffect(() => {
    const processReceipts = async () => {
      if (!user || !selectedCenter) {
        setReceipts([]);
        return;
      }

      if (receiptsData && receiptsData.length > 0) {
        const mappedReceipts = receiptsData.map((row: any) => mapRowToReceipt(row));
        setReceipts(mappedReceipts);
      } else {
        setReceipts([]);
      }
    };

    processReceipts();
  }, [receiptsData, receiptsLoading, user, selectedCenter]);

  // ============================================
  // 📦 CARREGAR DESPESAS (Cache + Banco) - COMENTADO (USANDO PAGINAÇÃO)
  // ============================================
  /*
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    if (!user || !selectedCenter) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const cacheKey = `financial_transactions:${user.id}:${selectedCenter}:DESPESA`;

    try {
      console.log("[Financial] 📦 Tentando carregar despesas do cache...");
      const cached = await financialCache.get<Expense[]>(cacheKey);
      if (cached && cached.length > 0) {
        console.log(`[Financial] ✅ ${cached.length} despesas carregadas do cache`);
        setExpenses(cached);
      }

      console.log("[Financial] 🌐 Carregando despesas do Supabase com limite otimizado...");
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(
          `
          id,
          type,
          status,
          date,
          value,
          category,
          description,
          payment_method,
          reference,
          documents,
          equipment_id,
          is_fixed,
          sector,
          fixed_duration_months,
          installment_number,
          created_at,
          cost_center_id
        `
        )
        .eq("type", "DESPESA")
        .order("created_at", { ascending: false })
        .limit(50); // 🚀 LIMITAR REGISTROS INICIAIS

      if (error) {
        console.warn("❌ Erro ao carregar despesas:", error);
        return;
      }

      const mapped: Expense[] = await Promise.all(
        (data ?? []).map((row: any) => mapRowToExpense(row))
      );

      setExpenses(mapped);
      await financialCache.set(cacheKey, mapped, 3 * 60 * 1000); // 🚀 TTL 3 minutos
      console.log("[Financial] 💾 Cache de despesas atualizado");
    } catch (e) {
      console.error("[Financial] ❌ Erro ao carregar despesas:", e);
    } finally {
      setLoading(false);
    }
  }, [user, selectedCenter]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);
  */

  // ============================================
  // 🔄 REALTIME SYNC - DESPESAS
  // ============================================
  useRealtimeSync<any>({
    table: "financial_transactions",
    filters:
      user && selectedCenter
        ? [
          { column: "type", value: "DESPESA" },
          { column: "cost_center_id", value: selectedCenter },
        ]
        : [],
    onInsert: async (row) => {
      if (row.type !== "DESPESA") return;
      console.log("[Financial] 📥 INSERT via Realtime:", row.description);

      const expense = await mapRowToExpense(row);
      setExpenses((prev) => {
        // Se já existe com mesmo ID, ignora
        if (prev.some((e) => e.id === expense.id)) return prev;
        // 🚀 OPTIMISTIC: Remove itens temporários com mesmo nome (o servidor confirmou)
        const withoutOptimistic = prev.filter((e) => {
          if (!e.id.startsWith('temp-')) return true;
          return e.name !== expense.name || e.date !== expense.date;
        });
        return [expense, ...withoutOptimistic];
      });

      if (user && selectedCenter) {
        const cacheKey = `financial_transactions:${user.id}:${selectedCenter}:DESPESA`;
        const next = await financialCache.get<Expense[]>(cacheKey);
        const base = next ?? [];
        const merged = [expense, ...base.filter((e) => e.id !== expense.id)];
        await financialCache.set(cacheKey, merged, 3 * 60 * 1000);
      }
    },
    onUpdate: async (row) => {
      if (row.type !== "DESPESA") return;
      console.log("[Financial] 📝 UPDATE via Realtime:", row.description);

      const expense = await mapRowToExpense(row);
      setExpenses((prev) => prev.map((e) => (e.id === expense.id ? expense : e)));

      if (user && selectedCenter) {
        const cacheKey = `financial_transactions:${user.id}:${selectedCenter}:DESPESA`;
        const current = (await financialCache.get<Expense[]>(cacheKey)) ?? [];
        const merged = current.map((e) => (e.id === expense.id ? expense : e));
        await financialCache.set(cacheKey, merged, 3 * 60 * 1000);
      }
    },
    onDelete: async (row) => {
      if (row.type !== "DESPESA") return;
      console.log("[Financial] 🗑️ DELETE via Realtime:", row.description);

      setExpenses((prev) => prev.filter((e) => e.id !== row.id));

      if (user && selectedCenter) {
        const cacheKey = `financial_transactions:${user.id}:${selectedCenter}:DESPESA`;
        const current = (await financialCache.get<Expense[]>(cacheKey)) ?? [];
        const next = current.filter((e) => e.id !== row.id);
        await financialCache.set(cacheKey, next, 3 * 60 * 1000);
      }
    },
  });

  // ============================================
  // 📦 CARREGAR RECEITAS (Cache + Banco) - COMENTADO (USANDO PAGINAÇÃO)
  // ============================================
  /*
  const loadReceipts = useCallback(async () => {
    if (!user || !selectedCenter) {
      setReceipts([]);
      return;
    }

    const cacheKey = `financial_transactions:${user.id}:${selectedCenter}:RECEITA`;

    try {
      console.log("[Financial] 📦 Tentando carregar receitas do cache...");
      const cached = await financialCache.get<Receipt[]>(cacheKey);
      if (cached && cached.length > 0) {
        console.log(`[Financial] ✅ ${cached.length} receitas carregadas do cache`);
        setReceipts(cached);
      }

      console.log("[Financial] 🌐 Carregando receitas do Supabase com limite otimizado...");
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(
          `
          id,
          type,
          status,
          date,
          value,
          category,
          description,
          payment_method,
          reference,
          is_fixed,
          fixed_duration_months,
          installment_number,
          created_at,
          cost_center_id
        `
        )
        .eq("type", "RECEITA")
        // Removido filtro por centro para carregar TODOS os centros (necessário para gráfico comparativo)
        .order("created_at", { ascending: false })
        .limit(50); // 🚀 LIMITAR REGISTROS INICIAIS

      if (error) {
        console.warn("❌ Erro ao carregar receitas:", error);
        return;
      }

      const mapped: Receipt[] = (data ?? []).map((row: any) =>
        mapRowToReceipt(row)
      );
      setReceipts(mapped);
      await financialCache.set(cacheKey, mapped, 3 * 60 * 1000);
      console.log("[Financial] 💾 Cache de receitas atualizado");
    } catch (e) {
      console.error("[Financial] ❌ Erro ao carregar receitas:", e);
    }
  }, [user, selectedCenter]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);
  */

  // ============================================
  // 🔄 REALTIME SYNC - RECEITAS
  // ============================================
  useRealtimeSync<any>({
    table: "financial_transactions",
    filters:
      user && selectedCenter
        ? [
          { column: "type", value: "RECEITA" },
          { column: "cost_center_id", value: selectedCenter },
        ]
        : [],
    onInsert: (row) => {
      if (row.type !== "RECEITA") return;
      console.log("[Financial] 📥 INSERT RECEITA via Realtime:", row.description);

      const receipt = mapRowToReceipt(row);
      setReceipts((prev) => {
        if (prev.some((r) => r.id === receipt.id)) return prev;
        return [receipt, ...prev];
      });

      if (user && selectedCenter) {
        const cacheKey = `financial_transactions:${user.id}:${selectedCenter}:RECEITA`;
        financialCache.get<Receipt[]>(cacheKey).then((current) => {
          const base = current ?? [];
          const merged = [receipt, ...base.filter((r) => r.id !== receipt.id)];
          financialCache.set(cacheKey, merged, 3 * 60 * 1000);
        });
      }
    },
    onUpdate: (row) => {
      if (row.type !== "RECEITA") return;
      console.log("[Financial] 📝 UPDATE RECEITA via Realtime:", row.description);

      const receipt = mapRowToReceipt(row);
      setReceipts((prev) => prev.map((r) => (r.id === receipt.id ? receipt : r)));

      if (user && selectedCenter) {
        const cacheKey = `financial_transactions:${user.id}:${selectedCenter}:RECEITA`;
        financialCache.get<Receipt[]>(cacheKey).then((current) => {
          const list = current ?? [];
          const merged = list.map((r) => (r.id === receipt.id ? receipt : r));
          financialCache.set(cacheKey, merged, 3 * 60 * 1000);
        });
      }
    },
    onDelete: (row) => {
      if (row.type !== "RECEITA") return;
      console.log("[Financial] 🗑️ DELETE RECEITA via Realtime:", row.description);

      setReceipts((prev) => prev.filter((r) => r.id !== row.id));

      if (user && selectedCenter) {
        const cacheKey = `financial_transactions:${user.id}:${selectedCenter}:RECEITA`;
        financialCache.get<Receipt[]>(cacheKey).then((current) => {
          const list = current ?? [];
          const next = list.filter((r) => r.id !== row.id);
          financialCache.set(cacheKey, next, 3 * 60 * 1000);
        });
      }
    },
  });

  // ========================
  // RECEITAS — CRUD
  // ========================

  const addReceipt = useCallback((receipt: Omit<Receipt, "id">) => {
    (async () => {
      try {
        // Validação e sanitização de entrada
        const validation = validateAndSanitizeReceipt(receipt);
        if (!validation.isValid) {
          Alert.alert("Erro de Validação", validation.error || "Dados inválidos");
          return;
        }

        const sanitizedReceipt = validation.sanitizedReceipt!;

        const dbDate = toDbDate(sanitizedReceipt.date);
        if (!dbDate) {
          console.error("❌ Data de receita inválida:", sanitizedReceipt.date);
          return;
        }

        const isFixed = sanitizedReceipt.isFixed ?? false;
        const fixedDurationMonths = sanitizedReceipt.fixedDurationMonths;

        const payload: any = {
          type: "RECEITA",
          status:
            sanitizedReceipt.status &&
              sanitizedReceipt.status.toLowerCase().startsWith("prev")
              ? "PREVISTO"
              : "CONFIRMADO",
          cost_center_id: sanitizedReceipt.center,
          value: sanitizedReceipt.value,
          date: dbDate,
          category: sanitizedReceipt.category ?? null,
          description: sanitizedReceipt.name,
          payment_method: sanitizedReceipt.method ?? null,
          reference: null,
          is_fixed: isFixed,
          fixed_duration_months: fixedDurationMonths ?? null,
          installment_number: isFixed ? 1 : null,
        };

        const { data, error } = await supabase
          .from("financial_transactions")
          .insert(payload)
          .select(
            `
            id,
            type,
            status,
            date,
            value,
            category,
            description,
            payment_method,
            reference,
            is_fixed,
            fixed_duration_months,
            installment_number,
            created_at,
            cost_center_id
          `
          )
          .single();

        if (error || !data) {
          console.error("❌ Erro ao criar receita:", error);

          // Verifica se é erro de rede
          if (error && (error.message?.includes('network') || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError'))) {
            Alert.alert(
              'Sem conexão',
              'Não foi possível salvar a receita. Verifique sua conexão com a internet e tente novamente.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Erro',
              'Não foi possível salvar a receita. Tente novamente.',
              [{ text: 'OK' }]
            );
          }
          return;
        }

        const newReceipt = mapRowToReceipt(data);
        setReceipts((prev) => [newReceipt, ...prev]);

        console.log('🔍 [DEBUG] Receita criada:', { isFixed, fixedDurationMonths, date: receipt.date });

        // Se for receita fixa, gera as parcelas recorrentes
        if (isFixed && fixedDurationMonths && fixedDurationMonths > 1) {
          console.log('✅ [DEBUG] Iniciando geração de parcelas fixas...');
          const dateParts = receipt.date.split("/");
          if (dateParts.length === 3) {
            const [day, month, year] = dateParts.map(Number);
            const creationMonth = month;
            const creationYear = year;
            const creationDay = day;

            for (let offset = 1; offset < fixedDurationMonths; offset++) {
              const targetMonth = creationMonth + offset;
              let targetYear = creationYear;
              let actualMonth = targetMonth;

              if (targetMonth > 12) {
                const yearOffset = Math.floor((targetMonth - 1) / 12);
                targetYear = creationYear + yearOffset;
                actualMonth = ((targetMonth - 1) % 12) + 1;
              }

              const lastDayOfMonth = new Date(targetYear, actualMonth, 0).getDate();
              const receiptDay = Math.min(creationDay, lastDayOfMonth);
              const newReceiptDate = `${String(receiptDay).padStart(2, "0")}/${String(actualMonth).padStart(2, "0")}/${targetYear}`;
              const installmentDbDate = toDbDate(newReceiptDate);

              if (installmentDbDate) {
                const installmentPayload: any = {
                  type: "RECEITA",
                  status: "CONFIRMADO",
                  cost_center_id: receipt.center,
                  value: receipt.value,
                  date: installmentDbDate,
                  category: receipt.category ?? null,
                  description: receipt.name,
                  payment_method: receipt.method ?? null,
                  reference: null,
                  is_fixed: false,
                  fixed_duration_months: null,
                  installment_number: offset + 1,
                };

                const { data: installmentData, error: installmentError } = await supabase
                  .from("financial_transactions")
                  .insert(installmentPayload)
                  .select()
                  .single();

                if (installmentError) {
                  console.error('❌ [DEBUG] Erro ao criar parcela:', installmentError);
                } else if (installmentData) {
                  console.log('✅ [DEBUG] Parcela criada:', { offset, date: newReceiptDate });
                  const installmentReceipt = mapRowToReceipt(installmentData);
                  setReceipts((prev) => [installmentReceipt, ...prev]);
                }
              }
            }
          }
        }
        console.log('🎉 [DEBUG] Processo de criação de receita fixa concluído');
      } catch (e) {
        console.error("❌ Erro inesperado ao criar receita:", e);
      }
    })();
  }, []);

  const updateReceipt = useCallback(async (receipt: Receipt): Promise<Receipt> => {
    try {
      // Se for um recebimento fixo, atualiza todas as parcelas (template + geradas)
      const isFixedReceipt = receipt.isFixed;

      const dbDate = toDbDate(receipt.date);
      if (!dbDate) {
        console.error("❌ Data de receita inválida:", receipt.date);
        throw new Error("Data de receita inválida");
      }

      // Mapeia ReceiptStatus para o formato do banco
      let statusValue = "A_CONFIRMAR";
      if (receipt.status) {
        switch (receipt.status) {
          case "a_confirmar":
            statusValue = "A_CONFIRMAR";
            break;
          case "confirmado":
            statusValue = "CONFIRMADO";
            break;
          case "a_receber":
            statusValue = "A_RECEBER";
            break;
          case "recebido":
            statusValue = "RECEBIDO";
            break;
          default:
            statusValue = "A_CONFIRMAR";
        }
      }

      if (isFixedReceipt) {
        // Busca o recebimento atual no banco (pode ou não ser fixo)
        const { data: currentReceipt, error: fetchError } = await supabase
          .from("financial_transactions")
          .select("*")
          .eq("id", receipt.id)
          .eq("type", "RECEITA")
          .single();

        if (fetchError) {
          console.error("❌ Erro ao buscar receita atual:", fetchError);
          throw new Error("Erro ao buscar receita atual");
        }

        const wasFixed = currentReceipt?.is_fixed === true;
        const isBecomingFixed = !wasFixed && isFixedReceipt;

        // CASO 1: Receita está SE TORNANDO FIXA pela primeira vez
        if (isBecomingFixed && receipt.fixedDurationMonths && receipt.fixedDurationMonths > 1) {
          console.log('🔄 Receita se tornando fixa pela primeira vez, gerando parcelas...');

          // Atualiza a receita atual para ser o template
          const templatePayload: any = {
            cost_center_id: receipt.center,
            value: receipt.value,
            date: dbDate,
            category: receipt.category ?? null,
            description: receipt.name,
            payment_method: receipt.method ?? null,
            status: statusValue,
            is_fixed: true,
            fixed_duration_months: receipt.fixedDurationMonths,
            installment_number: 1,
          };

          const { error: updateError } = await supabase
            .from("financial_transactions")
            .update(templatePayload)
            .eq("id", receipt.id)
            .eq("type", "RECEITA");

          if (updateError) {
            console.error("❌ Erro ao atualizar receita para fixa:", updateError);
            throw new Error("Erro ao atualizar receita para fixa");
          }

          // Gera as parcelas subsequentes (2, 3, etc)
          const dateParts = receipt.date.split("/");
          if (dateParts.length === 3) {
            const [day, month, year] = dateParts.map(Number);

            for (let offset = 1; offset < receipt.fixedDurationMonths; offset++) {
              const targetMonth = month + offset;
              let targetYear = year;
              let actualMonth = targetMonth;

              if (targetMonth > 12) {
                const yearOffset = Math.floor((targetMonth - 1) / 12);
                targetYear = year + yearOffset;
                actualMonth = ((targetMonth - 1) % 12) + 1;
              }

              const lastDayOfMonth = new Date(targetYear, actualMonth, 0).getDate();
              const receiptDay = Math.min(day, lastDayOfMonth);
              const newReceiptDate = `${String(receiptDay).padStart(2, "0")}/${String(actualMonth).padStart(2, "0")}/${targetYear}`;
              const installmentDbDate = toDbDate(newReceiptDate);

              if (installmentDbDate) {
                const installmentPayload: any = {
                  type: "RECEITA",
                  status: statusValue,
                  cost_center_id: receipt.center,
                  value: receipt.value,
                  date: installmentDbDate,
                  category: receipt.category ?? null,
                  description: receipt.name,
                  payment_method: receipt.method ?? null,
                  is_fixed: false,
                  fixed_duration_months: null,
                  installment_number: offset + 1,
                };

                const { error: installmentError } = await supabase
                  .from("financial_transactions")
                  .insert(installmentPayload);

                if (installmentError) {
                  console.error('❌ Erro ao criar parcela:', installmentError);
                } else {
                  console.log('✅ Parcela criada:', { offset: offset + 1, date: newReceiptDate });
                }
              }
            }
          }

          // Recarrega todas as receitas
          const { data: reloadedReceipts, error: reloadError } = await supabase
            .from("financial_transactions")
            .select(
              `
                id,
                type,
                status,
                date,
                value,
                category,
                description,
                payment_method,
                reference,
                is_fixed,
                fixed_duration_months,
                installment_number,
                created_at,
                cost_center_id
              `
            )
            .eq("type", "RECEITA")
            .order("date", { ascending: false });

          if (!reloadError && reloadedReceipts) {
            const mapped: Receipt[] = await Promise.all(
              (reloadedReceipts ?? []).map((row: any) => mapRowToReceipt(row))
            );
            setReceipts(mapped);

            const updatedTemplate = mapped.find((r) => r.id === receipt.id);
            if (updatedTemplate) {
              return updatedTemplate;
            }
          }

          throw new Error("Erro ao recarregar receitas após conversão para fixa");
        }

        // CASO 2: Receita JÁ ERA FIXA, atualiza template e parcelas
        // Busca o recebimento template atual no banco
        const { data: currentTemplate, error: templateError } = await supabase
          .from("financial_transactions")
          .select("*")
          .eq("id", receipt.id)
          .eq("is_fixed", true)
          .eq("type", "RECEITA")
          .single();

        if (templateError) {
          // Caso especial: nenhum template encontrado (PGRST116)
          if ((templateError as any).code === "PGRST116") {
            console.warn(
              "⚠️ Nenhum template de recebimento fixo encontrado para este ID; tratando como recebimento pontual.",
              templateError
            );
          } else {
            console.error("❌ Erro ao buscar template do recebimento fixo:", templateError);
            throw new Error("Erro ao buscar template do recebimento fixo");
          }
        }

        if (currentTemplate) {
          const oldDuration = currentTemplate.fixed_duration_months;
          const newDuration = receipt.fixedDurationMonths;

          // Busca todas as parcelas relacionadas (template + geradas)
          const { data: allInstallments, error: installmentsError } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("type", "RECEITA")
            .eq("description", receipt.name)
            .eq("cost_center_id", receipt.center)
            .order("date", { ascending: true });

          if (installmentsError) {
            console.error("❌ Erro ao buscar parcelas do recebimento fixo:", installmentsError);
            throw new Error("Erro ao buscar parcelas do recebimento fixo");
          }

          // Atualiza o template
          const templatePayload: any = {
            cost_center_id: receipt.center,
            value: receipt.value,
            date: dbDate,
            category: receipt.category ?? null,
            description: receipt.name,
            payment_method: receipt.method ?? null,
            status: statusValue,
            is_fixed: true,
            fixed_duration_months: receipt.fixedDurationMonths ?? null,
          };

          const { error: templateUpdateError } = await supabase
            .from("financial_transactions")
            .update(templatePayload)
            .eq("id", receipt.id)
            .eq("type", "RECEITA");

          if (templateUpdateError) {
            console.error("❌ Erro ao atualizar template:", templateUpdateError);
            throw new Error("Erro ao atualizar template");
          }

          // Atualiza todas as parcelas geradas existentes
          const generatedInstallments = allInstallments?.filter((inst) => !inst.is_fixed) || [];

          for (const installment of generatedInstallments) {
            const installmentPayload: any = {
              value: receipt.value,
              category: receipt.category ?? null,
              description: receipt.name,
              payment_method: receipt.method ?? null,
            };

            await supabase
              .from("financial_transactions")
              .update(installmentPayload)
              .eq("id", installment.id)
              .eq("type", "RECEITA");
          }

          // Se a duração mudou, ajusta as parcelas
          if (oldDuration !== newDuration && newDuration) {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();

            // Parse da data do template
            const dateParts = receipt.date.split("/");
            if (dateParts.length === 3) {
              const [day, month, year] = dateParts.map(Number);
              const creationMonth = month;
              const creationYear = year;
              const creationDay = day;

              if (newDuration > oldDuration) {
                // Aumentou a duração: cria novas parcelas
                const existingCount = generatedInstallments.length;
                for (let offset = existingCount; offset < newDuration; offset++) {
                  const targetMonth = creationMonth + offset;
                  let targetYear = creationYear;
                  let actualMonth = targetMonth;

                  if (targetMonth > 12) {
                    const yearOffset = Math.floor((targetMonth - 1) / 12);
                    targetYear = creationYear + yearOffset;
                    actualMonth = ((targetMonth - 1) % 12) + 1;
                  }

                  const lastDayOfMonth = new Date(targetYear, actualMonth, 0).getDate();
                  const receiptDay = Math.min(creationDay, lastDayOfMonth);
                  const newReceiptDate = `${String(receiptDay).padStart(2, "0")}/${String(actualMonth).padStart(2, "0")}/${targetYear}`;
                  const installmentDbDate = toDbDate(newReceiptDate);

                  if (installmentDbDate) {
                    // Verifica se já existe
                    const { data: existing } = await supabase
                      .from("financial_transactions")
                      .select("id")
                      .eq("type", "RECEITA")
                      .eq("description", receipt.name)
                      .eq("cost_center_id", receipt.center)
                      .eq("is_fixed", false)
                      .eq("date", installmentDbDate)
                      .maybeSingle();

                    if (!existing) {
                      const installmentPayload: any = {
                        type: "RECEITA",
                        status: statusValue,
                        cost_center_id: receipt.center,
                        value: receipt.value,
                        date: installmentDbDate,
                        category: receipt.category ?? null,
                        description: receipt.name,
                        payment_method: receipt.method ?? null,
                        is_fixed: false,
                        fixed_duration_months: null,
                      };

                      await supabase
                        .from("financial_transactions")
                        .insert(installmentPayload);
                    }
                  }
                }
              } else if (newDuration < oldDuration) {
                // Diminuiu a duração: remove parcelas excedentes
                // Parse da data do template para calcular corretamente
                const templateDateParts = receipt.date.split("/");
                if (templateDateParts.length === 3) {
                  const [templateDay, templateMonth, templateYear] = templateDateParts.map(Number);
                  const templateDate = dayjs(`${templateYear}-${String(templateMonth).padStart(2, "0")}-${String(templateDay).padStart(2, "0")}`);

                  const installmentsToDelete = generatedInstallments.filter(
                    (inst) => {
                      // inst.date vem do banco no formato YYYY-MM-DD
                      const instDate = dayjs(inst.date);
                      const monthsDiff = instDate.diff(templateDate, 'month');
                      return monthsDiff + 1 > newDuration;
                    }
                  );

                  for (const instToDelete of installmentsToDelete) {
                    await supabase
                      .from("financial_transactions")
                      .delete()
                      .eq("id", instToDelete.id)
                      .eq("type", "RECEITA");
                  }
                }
              }
            }
          }

          // Recarrega todas as receitas
          const { data: reloadedReceipts, error: reloadError } = await supabase
            .from("financial_transactions")
            .select(
              `
                id,
                type,
                status,
                date,
                value,
                category,
                description,
                payment_method,
                reference,
                is_fixed,
                fixed_duration_months,
                installment_number,
                created_at,
                cost_center_id
              `
            )
            .eq("type", "RECEITA")
            .order("date", { ascending: false });

          if (!reloadError && reloadedReceipts) {
            const mapped: Receipt[] = await Promise.all(
              (reloadedReceipts ?? []).map((row: any) => mapRowToReceipt(row))
            );
            setReceipts(mapped);

            // Retorna o template atualizado
            const updatedTemplate = mapped.find((r) => r.id === receipt.id);
            if (updatedTemplate) {
              return updatedTemplate;
            }
          }

          throw new Error("Erro ao recarregar receitas após atualização");
        }
      }

      // Se não for fixo, atualiza apenas o registro específico
      const payload: any = {
        cost_center_id: receipt.center,
        value: receipt.value,
        date: dbDate,
        category: receipt.category ?? null,
        description: receipt.name,
        payment_method: receipt.method ?? null,
        status: statusValue,
        is_fixed: false,
        fixed_duration_months: null,
      };

      const { data, error } = await supabase
        .from("financial_transactions")
        .update(payload)
        .eq("id", receipt.id)
        .eq("type", "RECEITA") // Garante que só atualiza receitas
        .select(
          `
            id,
            type,
            status,
            date,
            value,
            category,
            description,
            payment_method,
            reference,
            is_fixed,
            fixed_duration_months,
            installment_number,
            created_at,
            cost_center_id
          `
        )
        .single();

      if (error) {
        console.error("❌ Erro ao atualizar receita:", error);
        console.error("❌ Status tentado:", statusValue);
        console.error("❌ Payload completo:", payload);
        throw new Error(`Erro ao atualizar receita: ${error.message || 'Erro desconhecido'}`);
      }

      if (!data) {
        console.error("❌ Nenhum dado retornado ao atualizar receita");
        throw new Error('Nenhum dado retornado ao atualizar receita');
      }

      const updated = mapRowToReceipt(data);

      // Atualiza o estado local
      setReceipts((prev) =>
        prev.map((r) => (r.id === receipt.id ? updated : r))
      );

      console.log("✅ Receita atualizada com sucesso:", updated);
      return updated as Receipt;
    } catch (e) {
      console.error("❌ Erro inesperado ao atualizar receita:", e);
      throw e;
    }
  }, []);

  const deleteReceipt = useCallback((id: string) => {
    (async () => {
      try {
        // Primeiro, busca a receita alvo para entender se faz parte de um conjunto de parcelas
        const { data: target, error: fetchError } = await supabase
          .from("financial_transactions")
          .select("id, description, cost_center_id, is_fixed, installment_number, type")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) {
          console.warn("⚠️ Erro ao buscar receita antes de deletar:", fetchError);
        }

        // Por padrão, remove apenas o ID informado
        let idsToDelete: string[] = [id];

        // Se for uma RECEITA fixa ou fizer parte de uma série de parcelas, remove o grupo inteiro
        if (target && target.type === "RECEITA" && (target.is_fixed || target.installment_number != null)) {
          const { data: group, error: groupError } = await supabase
            .from("financial_transactions")
            .select("id")
            .eq("type", "RECEITA")
            .eq("description", target.description)
            .eq("cost_center_id", target.cost_center_id);

          if (groupError) {
            console.warn("⚠️ Erro ao buscar grupo de parcelas para deletar:", groupError);
          } else if (group && group.length > 0) {
            idsToDelete = group.map((g: any) => g.id as string);
            console.log(`🗑️ Deletando ${idsToDelete.length} parcelas de receita fixa`);
          }
        }

        // Deleta as receitas
        const { error } = await supabase
          .from("financial_transactions")
          .delete()
          .in("id", idsToDelete);

        if (error) {
          console.error("❌ Erro ao deletar receita(s):", error);
          return;
        }

        setReceipts((prev) => prev.filter((r) => !idsToDelete.includes(r.id)));
      } catch (e) {
        console.error("❌ Erro inesperado ao deletar receita:", e);
      }
    })();
  }, []);

  // ========================
  // DESPESAS — CRUD
  // ========================

  const addExpense = useCallback((expense: Omit<Expense, "id">) => {
    // 🚀 OPTIMISTIC UPDATE: Adiciona imediatamente com ID temporário
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticExpense: Expense = {
      ...expense,
      id: tempId,
      createdAt: Date.now(),
    };

    // Adiciona imediatamente ao estado (feedback instantâneo)
    if (!expense.isFixed || !expense.fixedDurationMonths || expense.fixedDurationMonths <= 1) {
      setExpenses((prev) => [optimisticExpense, ...prev]);
    }

    (async () => {
      try {
        // Validação e sanitização de entrada
        const validation = validateAndSanitizeExpense(expense);
        if (!validation.isValid) {
          // Remove o item otimista se validação falhar
          setExpenses((prev) => prev.filter((e) => e.id !== tempId));
          Alert.alert("Erro de Validação", validation.error || "Dados inválidos");
          return;
        }

        const sanitizedExpense = validation.sanitizedExpense!;

        // Evita cadastrar despesas duplicadas no mesmo mês
        const allExpenses = getAllExpenses().filter((e) => e.id !== tempId); // Exclui o otimista da verificação
        if (
          isDuplicateExpense(allExpenses, {
            name: sanitizedExpense.name,
            value: sanitizedExpense.value,
            category: sanitizedExpense.category,
            equipmentId: sanitizedExpense.equipmentId,
            date: sanitizedExpense.date,
            center: sanitizedExpense.center,
          })
        ) {
          // Remove o item otimista
          setExpenses((prev) => prev.filter((e) => e.id !== tempId));
          Alert.alert(
            "Despesa Duplicada",
            `Já existe uma despesa idêntica cadastrada em ${expense.date}:\n\n` +
            `• ${expense.name}\n` +
            `• ${formatCurrency(expense.value)}\n` +
            `• ${CATEGORY_LABELS[expense.category]}\n\n` +
            "Não é possível cadastrar despesas duplicadas no mesmo mês.",
            [{ text: "OK" }],
          );
          return;
        }

        const dbDate = toDbDate(expense.date);
        if (!dbDate) {
          setExpenses((prev) => prev.filter((e) => e.id !== tempId));
          console.error("❌ Data de despesa inválida:", expense.date);
          return;
        }

        // Converte ExpenseStatus para formato do banco
        const statusToDb = (status?: ExpenseStatus): string => {
          if (!status) return "CONFIRMAR";
          switch (status) {
            case "confirmar":
              return "CONFIRMAR";
            case "confirmado":
              return "CONFIRMADO";
            case "a_pagar":
              return "A_PAGAR";
            case "pago":
              return "PAGO";
            default:
              return "CONFIRMAR";
          }
        };

        // Se for despesa fixa, sempre começa como CONFIRMADO
        // Se não for fixa, usa o status informado ou CONFIRMAR como padrão
        const finalStatus = expense.isFixed
          ? "CONFIRMADO"
          : statusToDb(expense.status);

        const payload: any = {
          type: "DESPESA",
          status: finalStatus,
          cost_center_id: expense.center,
          equipment_id: expense.equipmentId ?? null,
          value: expense.value,
          date: dbDate,
          category: expense.category ?? "diversos",
          description: expense.name,
          payment_method: expense.method ?? null,
          reference: buildReferenceField(expense.observations, expense.debitAdjustment),
          is_fixed: expense.isFixed ?? false,
          sector: expense.sector ?? null,
          fixed_duration_months: expense.fixedDurationMonths ?? null,
          installment_number:
            expense.installmentNumber != null
              ? expense.installmentNumber
              : expense.isFixed
                ? 1
                : null,
        };

        const { data, error } = await supabase
          .from("financial_transactions")
          .insert(payload)
          .select(
            `
            id,
            type,
            status,
            date,
            value,
            category,
            description,
            payment_method,
            reference,
          equipment_id,
          is_fixed,
          sector,
          fixed_duration_months,
          installment_number,
          created_at,
          cost_center_id
        `
          )
          .single();

        if (error || !data) {
          // 🚀 OPTIMISTIC ROLLBACK: Remove o item temporário em caso de erro
          setExpenses((prev) => prev.filter((e) => e.id !== tempId));
          console.error("❌ Erro ao criar despesa:", error);

          // Verifica se é erro de rede
          if (error && (error.message?.includes('network') || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError'))) {
            Alert.alert(
              'Sem conexão',
              'Não foi possível salvar a despesa. Verifique sua conexão com a internet e tente novamente.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Erro',
              'Não foi possível salvar a despesa. Tente novamente.',
              [{ text: 'OK' }]
            );
          }
          return;
        }

        // Validação: Se for despesa fixa, a duração é obrigatória
        if (expense.isFixed && !expense.fixedDurationMonths) {
          console.error(
            `❌ ERRO: Despesa fixa "${expense.name}" precisa ter duração definida!`
          );
          // Não cria a despesa se não tiver duração
          return;
        }

        // Log informativo sobre a despesa criada
        if (expense.isFixed && expense.fixedDurationMonths) {
          console.log(
            `✅ Despesa fixa "${expense.name}" criada com duração: ${expense.fixedDurationMonths} meses`
          );
        }

        // Envia notificação push para admins/editores (assíncrono, não bloqueia)
        pushEvents.notifyNewExpense(
          expense.name,
          expense.value,
          expense.category,
          expense.center
        );

        // Se for despesa fixa, gera as cópias imediatamente
        if (expense.isFixed) {
          // Despesa fixa sempre tem duração definida (validação acima)
          if (expense.fixedDurationMonths && expense.fixedDurationMonths > 1) {
            if (!expense.date || typeof expense.date !== 'string') {
              console.error("❌ Data de despesa inválida para gerar parcelas:", expense.date);
              return;
            }

            const dateParts = expense.date.split("/");
            if (dateParts.length !== 3) {
              console.error("❌ Formato de data inválido:", expense.date);
              return;
            }

            const [day, month, year] = dateParts.map(Number);
            if (isNaN(day) || isNaN(month) || isNaN(year)) {
              console.error("❌ Data de despesa contém valores inválidos:", expense.date);
              return;
            }

            const expenseDate = new Date(year, month - 1, day);
            if (isNaN(expenseDate.getTime())) {
              console.error("❌ Data de despesa inválida:", expense.date);
              return;
            }

            const creationMonth = expenseDate.getMonth() + 1;
            const creationYear = expenseDate.getFullYear();
            const creationDay = expenseDate.getDate();

            // Gera as parcelas restantes (começando do mês seguinte ao template)
            for (let offset = 1; offset < expense.fixedDurationMonths; offset++) {
              const targetMonth = creationMonth + offset;
              let targetYear = creationYear;
              let actualMonth = targetMonth;

              if (targetMonth > 12) {
                const yearOffset = Math.floor((targetMonth - 1) / 12);
                targetYear = creationYear + yearOffset;
                actualMonth = ((targetMonth - 1) % 12) + 1;
              }

              const lastDayOfMonth = new Date(targetYear, actualMonth, 0).getDate();
              const expenseDay = Math.min(creationDay, lastDayOfMonth);
              const newExpenseDate = `${String(expenseDay).padStart(2, "0")}/${String(actualMonth).padStart(2, "0")}/${targetYear}`;
              const dbDate = toDbDate(newExpenseDate);

              if (!dbDate) {
                console.error("❌ Erro ao gerar data para parcela:", newExpenseDate);
                continue;
              }

              const installmentPayload: any = {
                type: "DESPESA",
                status: "CONFIRMADO",
                cost_center_id: expense.center,
                equipment_id: expense.equipmentId ?? null,
                value: expense.value,
                date: dbDate,
                category: expense.category ?? "diversos",
                description: expense.name,
                payment_method: expense.method ?? null,
                reference: buildReferenceField(expense.observations, expense.debitAdjustment),
                is_fixed: false,
                sector: expense.sector ?? null,
                fixed_duration_months: null,
                installment_number: offset + 1, // Parcela 2, 3, 4... (template é parcela 1)
              };

              const { error: installError } = await supabase
                .from("financial_transactions")
                .insert(installmentPayload);

              if (installError) {
                console.error(`❌ Erro ao gerar parcela ${offset + 1}/${expense.fixedDurationMonths}:`, installError);
              }
            }

            // Recarrega todas as despesas para incluir as parcelas geradas
            const { data: allExpensesData, error: reloadError } = await supabase
              .from("financial_transactions")
              .select(
                `
              id,
              type,
              status,
              date,
              value,
              category,
              description,
              payment_method,
              reference,
              equipment_id,
              is_fixed,
              sector,
              fixed_duration_months,
              installment_number,
              created_at,
              cost_center_id
            `
              )
              .eq("type", "DESPESA")
              .order("created_at", { ascending: false });

            if (!reloadError && allExpensesData) {
              const mapped: Expense[] = await Promise.all(
                (allExpensesData ?? []).map((row: any) => mapRowToExpense(row))
              );
              setExpenses(mapped);
              return; // Não adiciona ao estado novamente (já recarregou todas)
            }
          }
          // Não adiciona a template ao estado (ela não deve aparecer na lista)
          return;
        }

        // DOCUMENTOS DA DESPESA
        if (expense.documents && expense.documents.length > 0) {
          try {
            console.log(
              "📤 Fazendo upload de",
              expense.documents.length,
              "documento(s) para o Supabase Storage..."
            );

            const uploadResults = await uploadMultipleFilesToStorage(
              expense.documents.map((doc) => ({
                fileUri: doc.fileUri,
                fileName: doc.fileName,
                mimeType: doc.mimeType,
              })),
              "expense-documents"
            );

            const documentsPayload = expense.documents.map((doc, index) => {
              const storageUrl = uploadResults[index];
              return {
                expense_id: data.id,
                type: doc.type ?? "recibo",
                file_name: doc.fileName,
                file_url: storageUrl || doc.fileUri,
                mime_type: doc.mimeType ?? null,
              };
            });

            const { error: docsError } = await supabase
              .from("expense_documents")
              .insert(documentsPayload);

            if (docsError) {
              if (
                docsError.code === "PGRST205" ||
                docsError.message?.includes("Could not find the table")
              ) {
                console.warn(
                  "⚠️ Tabela expense_documents não existe. Crie a tabela para salvar documentos."
                );
              } else {
                console.error(
                  "❌ Erro ao salvar documentos da despesa:",
                  docsError
                );
              }
            } else {
              console.log("✅ Documentos da despesa salvos com sucesso");
            }
          } catch (e) {
            console.warn("⚠️ Erro ao tentar salvar documentos:", e);
          }
        }

        // Só atualiza ao estado se não gerou parcelas (para evitar duplicatas)
        if (!expense.isFixed || !expense.fixedDurationMonths || expense.fixedDurationMonths <= 1) {
          const newExpense = await mapRowToExpense(data);
          // 🚀 OPTIMISTIC UPDATE: Substitui o item temporário pelo real
          setExpenses((prev) => prev.map((e) => e.id === tempId ? newExpense : e));

          // Audit logging para operação crítica
          if (user?.id) {
            await logFinancialOperation(
              user.id,
              'CREATE',
              'EXPENSE',
              data.id,
              sanitizedExpense.center,
              undefined, // oldData
              sanitizedExpense // newData
            );
          }
        } else {
          // Se gerou parcelas, remove o otimista (as parcelas serão carregadas via realtime)
          setExpenses((prev) => prev.filter((e) => e.id !== tempId));
        }
      } catch (e) {
        // 🚀 OPTIMISTIC ROLLBACK: Remove o item temporário em caso de erro
        setExpenses((prev) => prev.filter((exp) => exp.id !== tempId));
        console.error("❌ Erro inesperado ao criar despesa:", e);
      }
    })();
  }, []);

  const updateExpense = useCallback((expense: Expense) => {
    (async () => {
      try {
        const dbDate = toDbDate(expense.date);
        if (!dbDate) {
          console.error("❌ Data de despesa inválida:", expense.date);
          return;
        }

        // Busca a despesa atual no banco para verificar se era fixa antes
        const { data: currentExpense, error: currentError } = await supabase
          .from("financial_transactions")
          .select("*")
          .eq("id", expense.id)
          .maybeSingle();

        if (currentError) {
          console.error("❌ Erro ao buscar despesa atual:", currentError);
          return;
        }

        if (!currentExpense) {
          console.error("❌ Despesa não encontrada no banco");
          return;
        }

        const wasFixed = currentExpense.is_fixed === true;
        const isFixedExpense = expense.isFixed === true;

        // Converte ExpenseStatus para formato do banco
        const statusToDb = (status?: ExpenseStatus): string => {
          if (!status) return "CONFIRMAR";
          switch (status) {
            case "confirmar":
              return "CONFIRMAR";
            case "confirmado":
              return "CONFIRMADO";
            case "a_pagar":
              return "A_PAGAR";
            case "pago":
              return "PAGO";
            default:
              return "CONFIRMAR";
          }
        };

        // Se estava fixa e agora não está, remove as parcelas e atualiza como normal
        if (wasFixed && !isFixedExpense) {
          // Busca e remove todas as parcelas relacionadas
          const { data: allInstallments } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("type", "DESPESA")
            .eq("description", currentExpense.description)
            .eq("cost_center_id", currentExpense.cost_center_id);

          if (allInstallments) {
            const installmentsToDelete = allInstallments.filter(
              (inst) => inst.id !== expense.id && (inst.is_fixed === false || inst.installment_number !== null)
            );

            for (const inst of installmentsToDelete) {
              await supabase
                .from("financial_transactions")
                .delete()
                .eq("id", inst.id);
            }
          }

          // Atualiza a despesa como normal
          const payload: any = {
            cost_center_id: expense.center,
            equipment_id: expense.equipmentId ?? null,
            value: expense.value,
            date: dbDate,
            category: expense.category ?? "diversos",
            description: expense.name,
            payment_method: expense.method ?? null,
            reference: buildReferenceField(expense.observations, expense.debitAdjustment),
            status: statusToDb(expense.status),
            is_fixed: false,
            sector: null,
            fixed_duration_months: null,
            installment_number: null,
          };

          const { error: updateError } = await supabase
            .from("financial_transactions")
            .update(payload)
            .eq("id", expense.id);

          if (updateError) {
            console.error("❌ Erro ao atualizar despesa:", updateError);
            return;
          }

          // Recarrega todas as despesas
          const { data: reloadedExpenses, error: reloadError } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("type", "DESPESA")
            .order("created_at", { ascending: false });

          if (!reloadError && reloadedExpenses) {
            const mapped: Expense[] = await Promise.all(
              (reloadedExpenses ?? []).map((row: any) => mapRowToExpense(row))
            );
            setExpenses(mapped);
          }

          return;
        }

        // Se não estava fixa e agora está fixa, cria o template e gera as parcelas
        if (!wasFixed && isFixedExpense) {
          // Validação: se for despesa fixa, setor e duração são obrigatórios
          if (!expense.sector || !expense.fixedDurationMonths) {
            console.error("❌ Despesa fixa precisa ter setor e duração definidos");
            return;
          }

          // Atualiza a despesa atual como template
          const templatePayload: any = {
            cost_center_id: expense.center,
            equipment_id: expense.equipmentId ?? null,
            value: expense.value,
            date: dbDate,
            category: expense.category ?? "diversos",
            description: expense.name,
            payment_method: expense.method ?? null,
            reference: buildReferenceField(expense.observations, expense.debitAdjustment),
            status: "CONFIRMADO", // Despesas fixas sempre começam como CONFIRMADO
            is_fixed: true,
            sector: expense.sector,
            fixed_duration_months: expense.fixedDurationMonths,
            installment_number: 1,
          };

          const { error: templateUpdateError } = await supabase
            .from("financial_transactions")
            .update(templatePayload)
            .eq("id", expense.id);

          if (templateUpdateError) {
            console.error("❌ Erro ao atualizar template:", templateUpdateError);
            return;
          }

          // Gera as parcelas
          if (expense.fixedDurationMonths && expense.fixedDurationMonths > 1) {
            const dateParts = expense.date.split("/");
            if (dateParts.length === 3) {
              const [day, month, year] = dateParts.map(Number);
              const creationMonth = month;
              const creationYear = year;
              const creationDay = day;

              for (let offset = 1; offset < expense.fixedDurationMonths; offset++) {
                const targetMonth = creationMonth + offset;
                let targetYear = creationYear;
                let actualMonth = targetMonth;

                if (targetMonth > 12) {
                  const yearOffset = Math.floor((targetMonth - 1) / 12);
                  targetYear = creationYear + yearOffset;
                  actualMonth = ((targetMonth - 1) % 12) + 1;
                }

                const lastDayOfMonth = new Date(targetYear, actualMonth, 0).getDate();
                const expenseDay = Math.min(creationDay, lastDayOfMonth);
                const newExpenseDate = `${String(expenseDay).padStart(2, "0")}/${String(actualMonth).padStart(2, "0")}/${targetYear}`;
                const installmentDbDate = toDbDate(newExpenseDate);

                if (installmentDbDate) {
                  const installmentPayload: any = {
                    type: "DESPESA",
                    status: "CONFIRMADO",
                    cost_center_id: expense.center,
                    equipment_id: expense.equipmentId ?? null,
                    value: expense.value,
                    date: installmentDbDate,
                    category: expense.category ?? "diversos",
                    description: expense.name,
                    payment_method: expense.method ?? null,
                    reference: buildReferenceField(expense.observations, expense.debitAdjustment),
                    is_fixed: false,
                    sector: expense.sector ?? null,
                    fixed_duration_months: null,
                    installment_number: offset + 1,
                  };

                  await supabase
                    .from("financial_transactions")
                    .insert(installmentPayload);
                }
              }
            }
          }

          // Recarrega todas as despesas
          const { data: reloadedExpenses, error: reloadError } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("type", "DESPESA")
            .order("created_at", { ascending: false });

          if (!reloadError && reloadedExpenses) {
            const mapped: Expense[] = await Promise.all(
              (reloadedExpenses ?? []).map((row: any) => mapRowToExpense(row))
            );
            setExpenses(mapped);
          }

          return;
        }

        // Se já era fixa e continua fixa, atualiza normalmente
        if (isFixedExpense) {
          // Verifica se é uma parcela gerada (não template)
          const isGeneratedInstallment = currentExpense.is_fixed === false && currentExpense.installment_number && currentExpense.installment_number > 1;

          if (isGeneratedInstallment) {
            // Se é uma parcela gerada, apenas atualiza ela sem mexer no installment_number
            console.log(`📝 Atualizando parcela ${currentExpense.installment_number} sem alterar numeração`);

            const installmentPayload: any = {
              cost_center_id: expense.center,
              equipment_id: expense.equipmentId ?? null,
              value: expense.value,
              date: dbDate,
              category: expense.category ?? "diversos",
              description: expense.name,
              payment_method: expense.method ?? null,
              reference: buildReferenceField(expense.observations, expense.debitAdjustment),
              status: statusToDb(expense.status),
              is_fixed: false,
              sector: expense.sector ?? null,
              fixed_duration_months: null,
              installment_number: currentExpense.installment_number, // Mantém o número original
            };

            const { error: updateError } = await supabase
              .from("financial_transactions")
              .update(installmentPayload)
              .eq("id", expense.id);

            if (updateError) {
              console.error("❌ Erro ao atualizar parcela:", updateError);
              return;
            }

            // Recarrega todas as despesas
            const { data: reloadedExpenses, error: reloadError } = await supabase
              .from("financial_transactions")
              .select("*")
              .eq("type", "DESPESA")
              .order("created_at", { ascending: false });

            if (!reloadError && reloadedExpenses) {
              const mapped: Expense[] = await Promise.all(
                (reloadedExpenses ?? []).map((row: any) => mapRowToExpense(row))
              );
              setExpenses(mapped);
            }

            return;
          }

          // Busca a despesa template atual no banco
          const { data: currentTemplate, error: templateError } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("id", expense.id)
            .eq("is_fixed", true)
            .maybeSingle();

          if (templateError) {
            console.error("❌ Erro ao buscar template da despesa fixa:", templateError);
            return;
          }

          if (!currentTemplate) {
            console.warn("⚠️ Template da despesa fixa não encontrado. Criando novo template.");
            // Se não encontrar o template mas a despesa está marcada como fixa, cria o template
            const templatePayload: any = {
              cost_center_id: expense.center,
              equipment_id: expense.equipmentId ?? null,
              value: expense.value,
              date: dbDate,
              category: expense.category ?? "diversos",
              description: expense.name,
              payment_method: expense.method ?? null,
              reference: buildReferenceField(expense.observations, expense.debitAdjustment),
              status: "CONFIRMADO",
              is_fixed: true,
              sector: expense.sector ?? null,
              fixed_duration_months: expense.fixedDurationMonths ?? null,
              installment_number: 1,
            };

            const { error: templateUpdateError } = await supabase
              .from("financial_transactions")
              .update(templatePayload)
              .eq("id", expense.id);

            if (templateUpdateError) {
              console.error("❌ Erro ao criar template:", templateUpdateError);
              return;
            }

            // Gera as parcelas se necessário
            if (expense.fixedDurationMonths && expense.fixedDurationMonths > 1) {
              const dateParts = expense.date.split("/");
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts.map(Number);
                const creationMonth = month;
                const creationYear = year;
                const creationDay = day;

                for (let offset = 1; offset < expense.fixedDurationMonths; offset++) {
                  const targetMonth = creationMonth + offset;
                  let targetYear = creationYear;
                  let actualMonth = targetMonth;

                  if (targetMonth > 12) {
                    const yearOffset = Math.floor((targetMonth - 1) / 12);
                    targetYear = creationYear + yearOffset;
                    actualMonth = ((targetMonth - 1) % 12) + 1;
                  }

                  const lastDayOfMonth = new Date(targetYear, actualMonth, 0).getDate();
                  const expenseDay = Math.min(creationDay, lastDayOfMonth);
                  const newExpenseDate = `${String(expenseDay).padStart(2, "0")}/${String(actualMonth).padStart(2, "0")}/${targetYear}`;
                  const installmentDbDate = toDbDate(newExpenseDate);

                  if (installmentDbDate) {
                    const installmentPayload: any = {
                      type: "DESPESA",
                      status: "CONFIRMADO",
                      cost_center_id: expense.center,
                      equipment_id: expense.equipmentId ?? null,
                      value: expense.value,
                      date: installmentDbDate,
                      category: expense.category ?? "diversos",
                      description: expense.name,
                      payment_method: expense.method ?? null,
                      reference: buildReferenceField(expense.observations, expense.debitAdjustment),
                      is_fixed: false,
                      sector: expense.sector ?? null,
                      fixed_duration_months: null,
                      installment_number: offset + 1,
                    };

                    await supabase
                      .from("financial_transactions")
                      .insert(installmentPayload);
                  }
                }
              }
            }

            // Recarrega todas as despesas
            const { data: reloadedExpenses, error: reloadError } = await supabase
              .from("financial_transactions")
              .select("*")
              .eq("type", "DESPESA")
              .order("created_at", { ascending: false });

            if (!reloadError && reloadedExpenses) {
              const mapped: Expense[] = await Promise.all(
                (reloadedExpenses ?? []).map((row: any) => mapRowToExpense(row))
              );
              setExpenses(mapped);
            }

            return;
          } else {
            // Só processa parcelas se encontrou o template
            const oldDuration = currentTemplate.fixed_duration_months;
            const newDuration = expense.fixedDurationMonths;

            // Busca todas as parcelas relacionadas (template + geradas)
            // Usa o nome ANTIGO do template para encontrar todas as parcelas
            const oldName = currentTemplate.description;
            const { data: allInstallments, error: installmentsError } = await supabase
              .from("financial_transactions")
              .select("*")
              .eq("type", "DESPESA")
              .eq("description", oldName)
              .eq("cost_center_id", expense.center)
              .order("created_at", { ascending: false });

            if (installmentsError) {
              console.error("❌ Erro ao buscar parcelas da despesa fixa:", installmentsError);
              return;
            }

            // Atualiza o template
            const templatePayload: any = {
              cost_center_id: expense.center,
              equipment_id: expense.equipmentId ?? null,
              value: expense.value,
              date: dbDate,
              category: expense.category ?? "diversos",
              description: expense.name,
              payment_method: expense.method ?? null,
              reference: buildReferenceField(expense.observations, expense.debitAdjustment),
              status: statusToDb(expense.status),
              is_fixed: true,
              sector: expense.sector ?? null,
              fixed_duration_months: expense.fixedDurationMonths ?? null,
              installment_number: 1,
            };

            const { data: updatedTemplate, error: templateUpdateError } = await supabase
              .from("financial_transactions")
              .update(templatePayload)
              .eq("id", expense.id)
              .select(
                `
              id,
              type,
              status,
              date,
              value,
              category,
              description,
              payment_method,
              reference,
              equipment_id,
              is_fixed,
              sector,
              fixed_duration_months,
              installment_number,
              created_at,
              cost_center_id
            `
              )
              .single();

            if (templateUpdateError || !updatedTemplate) {
              console.error("❌ Erro ao atualizar template:", templateUpdateError);
              return;
            }

            // Verifica se a data do template foi alterada
            const oldTemplateDate = currentTemplate.date;
            const dateChanged = oldTemplateDate !== dbDate;

            // Atualiza todas as parcelas geradas existentes
            const generatedInstallments = allInstallments?.filter((inst) => !inst.is_fixed) || [];
            const updatedInstallments: any[] = [];

            // Se a data mudou, calcula a nova data base (dia/mês/ano)
            let newDay = 0, newMonth = 0, newYear = 0;
            if (dateChanged) {
              const [day, month, year] = expense.date.split('/').map(Number);
              newDay = day;
              newMonth = month;
              newYear = year;
            }

            for (const installment of generatedInstallments) {
              const installmentPayload: any = {
                value: expense.value,
                category: expense.category ?? "diversos",
                description: expense.name,
                payment_method: expense.method ?? null,
                reference: buildReferenceField(expense.observations, expense.debitAdjustment),
                sector: expense.sector ?? null,
              };

              // Se a data do template mudou, atualiza a data da parcela
              if (dateChanged) {
                const installmentNumber = installment.installment_number ?? 1;
                // Calcula nova data (mês base + offset da parcela - 1, pois a primeira parcela é o template)
                let targetMonth = newMonth + (installmentNumber - 1);
                let targetYear = newYear;

                while (targetMonth > 12) {
                  targetMonth -= 12;
                  targetYear++;
                }

                const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
                const day = Math.min(newDay, lastDayOfMonth);
                const newDateStr = `${String(day).padStart(2, '0')}/${String(targetMonth).padStart(2, '0')}/${targetYear}`;
                const newDateDb = toDbDate(newDateStr);

                if (newDateDb) {
                  installmentPayload.date = newDateDb;
                }
              }

              const { data: updatedInstallment } = await supabase
                .from("financial_transactions")
                .update(installmentPayload)
                .eq("id", installment.id)
                .select(
                  `
                id,
                type,
                status,
                date,
                value,
                category,
                description,
                payment_method,
                reference,
                equipment_id,
                is_fixed,
                sector,
                fixed_duration_months,
                installment_number,
                created_at,
                cost_center_id
              `
                )
                .single();

              if (updatedInstallment) {
                updatedInstallments.push(updatedInstallment);
              }
            }

            // Nota: O estado será atualizado ao recarregar todas as despesas no final

            // Se a duração mudou, ajusta as parcelas
            if (oldDuration !== newDuration && newDuration) {
              const currentDate = new Date();
              const currentMonth = currentDate.getMonth() + 1;
              const currentYear = currentDate.getFullYear();

              // Parse da data do template
              const dateParts = expense.date.split("/");
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts.map(Number);
                const creationMonth = month;
                const creationYear = year;
                const creationDay = day;

                if (newDuration > oldDuration) {
                  // Aumentou a duração: cria novas parcelas
                  const existingCount = generatedInstallments.length;
                  for (let offset = existingCount; offset < newDuration; offset++) {
                    const targetMonth = creationMonth + offset;
                    let targetYear = creationYear;
                    let actualMonth = targetMonth;

                    if (targetMonth > 12) {
                      const yearOffset = Math.floor((targetMonth - 1) / 12);
                      targetYear = creationYear + yearOffset;
                      actualMonth = ((targetMonth - 1) % 12) + 1;
                    }

                    const lastDayOfMonth = new Date(targetYear, actualMonth, 0).getDate();
                    const expenseDay = Math.min(creationDay, lastDayOfMonth);
                    const newExpenseDate = `${String(expenseDay).padStart(2, "0")}/${String(actualMonth).padStart(2, "0")}/${targetYear}`;
                    const installmentDbDate = toDbDate(newExpenseDate);

                    if (installmentDbDate) {
                      // Verifica se já existe
                      // Usa o novo nome para verificar se já existe uma parcela com o novo nome
                      // (se o nome mudou, não vai encontrar, então cria nova)
                      const { data: existing } = await supabase
                        .from("financial_transactions")
                        .select("id")
                        .eq("type", "DESPESA")
                        .eq("description", expense.name)
                        .eq("cost_center_id", expense.center)
                        .eq("is_fixed", false)
                        .eq("date", installmentDbDate)
                        .maybeSingle();

                      if (!existing) {
                        const installmentPayload: any = {
                          type: "DESPESA",
                          status: "CONFIRMADO",
                          cost_center_id: expense.center,
                          equipment_id: expense.equipmentId ?? null,
                          value: expense.value,
                          date: installmentDbDate,
                          category: expense.category ?? "diversos",
                          description: expense.name,
                          payment_method: expense.method ?? null,
                          reference: buildReferenceField(expense.observations, expense.debitAdjustment),
                          is_fixed: false,
                          sector: expense.sector ?? null,
                          fixed_duration_months: null,
                          installment_number: offset + 1,
                        };

                        const { data: newInstallment } = await supabase
                          .from("financial_transactions")
                          .insert(installmentPayload)
                          .select(
                            `
                          id,
                          type,
                          status,
                          date,
                          value,
                          category,
                          description,
                          payment_method,
                          reference,
                          equipment_id,
                          is_fixed,
                          sector,
                          fixed_duration_months,
                          installment_number,
                          created_at,
                          cost_center_id
                        `
                          )
                          .single();

                        // Nota: O estado será atualizado ao recarregar todas as despesas no final
                      }
                    }
                  }
                } else if (newDuration < oldDuration) {
                  // Diminuiu a duração: remove parcelas excedentes
                  const installmentsToDelete = generatedInstallments.filter(
                    (inst) => (inst.installment_number ?? 0) > newDuration
                  );

                  for (const instToDelete of installmentsToDelete) {
                    await supabase
                      .from("financial_transactions")
                      .delete()
                      .eq("id", instToDelete.id);

                    // Nota: O estado será atualizado ao recarregar todas as despesas no final
                  }
                }
              }
            }

            // ✅ RECARREGA TODAS AS DESPESAS (evita duplicatas)
            console.log("🔄 Recarregando todas as despesas após edição de despesa fixa...");

            const { data: reloadedExpenses, error: reloadError } = await supabase
              .from("financial_transactions")
              .select(`
              id, type, status, date, value, category, description,
              payment_method, reference, equipment_id, is_fixed,
              sector, fixed_duration_months, installment_number,
              created_at, cost_center_id
            `)
              .eq("type", "DESPESA")
              .order("created_at", { ascending: false });

            if (!reloadError && reloadedExpenses) {
              const mapped: Expense[] = await Promise.all(
                reloadedExpenses.map((row: any) => mapRowToExpense(row))
              );
              setExpenses(mapped);
              console.log(`✅ ${mapped.length} despesas recarregadas com sucesso`);
            }

            return;
          } // Fecha o else do currentTemplate
        } // Fecha o if (isFixedExpense)

        // Se não for fixa (ou se o template não foi encontrado), atualiza apenas o registro específico
        if (!isFixedExpense) {
          // Se esta despesa faz parte de um grupo parcelado (não fixo),
          // propaga categoria e setor para todas as parcelas irmãs
          const isInstallmentGroup =
            currentExpense.installment_number != null &&
            currentExpense.is_fixed === false;

          if (isInstallmentGroup) {
            try {
              await supabase
                .from("financial_transactions")
                .update({
                  category: expense.category ?? "diversos",
                  sector: expense.sector ?? null,
                })
                .eq("type", "DESPESA")
                .eq("description", currentExpense.description)
                .eq("cost_center_id", currentExpense.cost_center_id)
                .eq("is_fixed", false)
                .not("installment_number", "is", null);
            } catch (propagateError) {
              console.error(
                "❌ Erro ao propagar categoria/setor para parcelas da despesa:",
                propagateError
              );
            }
          }

          // Sincroniza documentos (para despesas não fixas)
          if (Array.isArray(expense.documents)) {
            try {
              const desiredDocs = (expense.documents ?? []).filter(
                (doc) => !!doc.fileUri
              );

              const { data: existingDocs, error: existingDocsError } =
                await supabase
                  .from("expense_documents")
                  .select("id, file_url, file_name, mime_type, type")
                  .eq("expense_id", expense.id);

              if (existingDocsError) {
                if (
                  existingDocsError.code === "PGRST205" ||
                  existingDocsError.message?.includes("Could not find the table")
                ) {
                  console.warn(
                    "⚠️ Tabela expense_documents não existe. Execute o script correspondente para criar a tabela."
                  );
                } else {
                  console.error(
                    "❌ Erro ao carregar documentos da despesa:",
                    existingDocsError
                  );
                }
              } else if (existingDocs) {
                // 1) Descobre quais docs remover
                const docsToDelete = existingDocs.filter(
                  (doc) =>
                    !desiredDocs.some(
                      (desired) => desired.fileUri === doc.file_url
                    )
                );

                if (docsToDelete.length > 0) {
                  const { error: deleteError } = await supabase
                    .from("expense_documents")
                    .delete()
                    .eq("expense_id", expense.id)
                    .in(
                      "file_url",
                      docsToDelete
                        .map((doc) => doc.file_url)
                        .filter((uri): uri is string => !!uri)
                    );

                  if (deleteError) {
                    console.error(
                      "❌ Erro ao remover documentos da despesa:",
                      deleteError
                    );
                  }
                }

                // 2) Descobre quais docs adicionar
                const docsToAdd = desiredDocs.filter(
                  (doc) =>
                    !existingDocs.some(
                      (existing) => existing.file_url === doc.fileUri
                    )
                );

                for (const doc of docsToAdd) {
                  let fileUrl = doc.fileUri;

                  const isRemote =
                    fileUrl.startsWith("http://") ||
                    fileUrl.startsWith("https://");

                  if (!isRemote) {
                    const uploadedUrl = await uploadFileToStorage(
                      doc.fileUri,
                      doc.fileName,
                      doc.mimeType,
                      "expense-documents"
                    );

                    if (!uploadedUrl) {
                      console.warn(
                        "⚠️ Falha ao fazer upload de documento adicional da despesa"
                      );
                      continue;
                    }

                    fileUrl = uploadedUrl;
                  }

                  const { error: insertError } = await supabase
                    .from("expense_documents")
                    .insert({
                      expense_id: expense.id,
                      type: doc.type ?? "recibo",
                      file_name: doc.fileName,
                      file_url: fileUrl,
                      mime_type: doc.mimeType ?? null,
                    });

                  if (insertError) {
                    if (
                      insertError.code === "PGRST205" ||
                      insertError.message?.includes("Could not find the table")
                    ) {
                      console.warn(
                        "⚠️ Tabela expense_documents não existe. Execute o script correspondente para criar a tabela."
                      );
                      break;
                    }
                    console.error(
                      "❌ Erro ao adicionar documento à despesa:",
                      insertError
                    );
                  }
                }
              }
            } catch (docsError) {
              console.error(
                "❌ Erro ao sincronizar documentos da despesa:",
                docsError
              );
            }
          }

          // Atualiza o registro da despesa
          const payload: any = {
            cost_center_id: expense.center,
            equipment_id: expense.equipmentId ?? null,
            value: expense.value,
            date: dbDate,
            category: expense.category ?? "diversos",
            description: expense.name,
            payment_method: expense.method ?? null,
            reference: buildReferenceField(expense.observations, expense.debitAdjustment),
            status: statusToDb(expense.status),
            is_fixed: false,
            sector: expense.sector ?? null,
            fixed_duration_months: null,
          };

          const { data, error } = await supabase
            .from("financial_transactions")
            .update(payload)
            .eq("id", expense.id)
            .select(
              `
              id,
              type,
              status,
              date,
              value,
              category,
              description,
              payment_method,
              reference,
              equipment_id,
              is_fixed,
              sector,
              fixed_duration_months,
              installment_number,
              created_at,
              cost_center_id
            `
            )
            .single();

          if (error || !data) {
            console.error("❌ Erro ao atualizar despesa:", error);
            return;
          }

          // ✅ CORREÇÃO PRINCIPAL: Recarrega TODAS as despesas
          console.log("🔄 Recarregando todas as despesas após edição...");

          const { data: allExpenses, error: reloadError } = await supabase
            .from("financial_transactions")
            .select(`
              id, type, status, date, value, category, description,
              payment_method, reference, equipment_id, is_fixed,
              sector, fixed_duration_months, installment_number,
              created_at, cost_center_id
            `)
            .eq("type", "DESPESA")
            .order("created_at", { ascending: false });

          if (reloadError) {
            console.error("❌ Erro ao recarregar despesas:", reloadError);
            return;
          }

          if (allExpenses) {
            const mapped: Expense[] = await Promise.all(
              allExpenses.map((row: any) => mapRowToExpense(row))
            );

            // ✅ SUBSTITUI TODA A LISTA (evita duplicatas)
            setExpenses(mapped);
            console.log(`✅ ${mapped.length} despesas recarregadas com sucesso`);
          }

          return;
        }
      } catch (e) {
        console.error("❌ Erro inesperado ao atualizar despesa:", e);
      }
    })();
  }, []);

  const deleteExpense = useCallback((id: string) => {
    // Otimização: Encontra o alvo apenas uma vez
    const target = expenses.find((exp) => exp.id === id);

    // Identifica IDs para remover (otimizado para O(N))
    const idsToRemove = new Set<string>();
    if (target) {
      if (target.isFixed || target.installmentNumber != null) {
        // Se for grupo, adiciona todos do grupo
        expenses.forEach((e) => {
          if (e.center === target.center && e.name === target.name) {
            idsToRemove.add(e.id);
          }
        });
      } else {
        // Se for única, apenas ela
        idsToRemove.add(id);
      }
    } else {
      // Fallback se não encontrar (raro), tenta remover pelo ID passado
      idsToRemove.add(id);
    }

    // 🚀 OPTIMISTIC UPDATE: Guarda snapshot para rollback
    const expensesSnapshot = expenses.filter((e) => idsToRemove.has(e.id));

    // Remove imediatamente da UI (Set.has é O(1))
    setExpenses((prev) => prev.filter((e) => !idsToRemove.has(e.id)));

    (async () => {
      try {
        // Primeiro, busca a despesa alvo para entender se faz parte de um conjunto de parcelas
        const { data: target, error: fetchError } = await supabase
          .from("financial_transactions")
          .select("id, description, cost_center_id, is_fixed, installment_number, type")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) {
          console.warn("⚠️ Erro ao buscar despesa antes de deletar:", fetchError);
        }

        // Por padrão, remove apenas o ID informado
        let idsToDelete: string[] = [id];

        // Se for uma DESPESA fixa ou fizer parte de uma série de parcelas, remove o grupo inteiro
        if (target && target.type === "DESPESA" && (target.is_fixed || target.installment_number != null)) {
          const { data: group, error: groupError } = await supabase
            .from("financial_transactions")
            .select("id")
            .eq("type", "DESPESA")
            .eq("description", target.description)
            .eq("cost_center_id", target.cost_center_id);

          if (groupError) {
            console.warn("⚠️ Erro ao buscar grupo de parcelas para deletar:", groupError);
          } else if (group && group.length > 0) {
            idsToDelete = group.map((g: any) => g.id as string);
          }
        }

        // Deleta documentos de todas as despesas relacionadas
        const { error: docsError } = await supabase
          .from("expense_documents")
          .delete()
          .in("expense_id", idsToDelete);

        if (docsError && docsError.code !== "PGRST205") {
          console.warn("⚠️ Erro ao deletar documentos da(s) despesa(s):", docsError);
        }

        // Deleta as próprias despesas
        const { error } = await supabase
          .from("financial_transactions")
          .delete()
          .in("id", idsToDelete);

        if (error) {
          // 🚀 OPTIMISTIC ROLLBACK: Restaura os itens em caso de erro
          setExpenses((prev) => [...expensesSnapshot, ...prev]);
          console.error("❌ Erro ao deletar despesa(s):", error);
          Alert.alert('Erro', 'Não foi possível excluir a despesa. Tente novamente.');
          return;
        }

        // Sucesso - os itens já foram removidos otimisticamente
      } catch (e) {
        // 🚀 OPTIMISTIC ROLLBACK: Restaura os itens em caso de erro
        setExpenses((prev) => [...expensesSnapshot, ...prev]);
        console.error("❌ Erro inesperado ao deletar despesa:", e);
        Alert.alert('Erro', 'Não foi possível excluir a despesa. Tente novamente.');
      }
    })();
  }, [expenses]);

  const addDocumentToExpense = useCallback(
    async (expenseId: string, document: Omit<ExpenseDocument, "type"> & { type: "nota_fiscal" | "recibo" | "comprovante_pagamento" | "boleto" }): Promise<ExpenseDocument> => {
      try {
        // Faz upload do arquivo para o Supabase Storage
        const fileUrl = await uploadFileToStorage(
          document.fileUri,
          document.fileName,
          document.mimeType,
          "expense-documents",
          "expenses"
        );

        if (!fileUrl) {
          throw new Error("Não foi possível fazer upload do arquivo.");
        }

        // Insere o documento na tabela expense_documents
        const { data, error } = await supabase
          .from("expense_documents")
          .insert({
            expense_id: expenseId,
            type: document.type,
            file_name: document.fileName,
            file_url: fileUrl,
            mime_type: document.mimeType ?? null,
          })
          .select("type, file_name, file_url, mime_type")
          .maybeSingle();

        if (error || !data) {
          throw error ?? new Error("Erro ao salvar documento");
        }

        // Atualiza o estado local
        const newDocument: ExpenseDocument = {
          type: (data.type ?? document.type) as "nota_fiscal" | "recibo" | "comprovante_pagamento" | "boleto",
          fileName: data.file_name,
          fileUri: data.file_url,
          mimeType: data.mime_type ?? null,
        };

        setExpenses((prev) =>
          prev.map((expense) => {
            if (expense.id !== expenseId) return expense;
            const existingDocs = expense.documents ?? [];
            return {
              ...expense,
              documents: [...existingDocs, newDocument],
            };
          })
        );

        // Retorna o documento adicionado para atualização imediata na UI
        return newDocument;
      } catch (err: any) {
        console.error("❌ Erro em addDocumentToExpense:", err);
        throw err;
      }
    },
    []
  );

  const deleteExpenseDocument = useCallback(
    async (expenseId: string, documentUri: string) => {
      try {
        // Deleta o documento da tabela expense_documents
        const { error } = await supabase
          .from("expense_documents")
          .delete()
          .eq("expense_id", expenseId)
          .eq("file_url", documentUri);

        if (error) {
          throw error ?? new Error("Erro ao deletar documento");
        }

        // Atualiza o estado local removendo o documento
        setExpenses((prev) =>
          prev.map((expense) => {
            if (expense.id !== expenseId) return expense;
            const existingDocs = expense.documents ?? [];
            return {
              ...expense,
              documents: existingDocs.filter((doc) => doc.fileUri !== documentUri),
            };
          })
        );
      } catch (err: any) {
        console.error("❌ Erro em deleteExpenseDocument:", err);
        throw err;
      }
    },
    []
  );

  // ========================
  // SELECTORS
  // ========================

  const getReceiptsByCenter = useCallback(
    (center: CostCenter) =>
      receipts.filter((receipt) => receipt.center === center),
    [receipts]
  );

  const getExpensesByCenter = useCallback(
    (center: CostCenter) =>
      expenses.filter((expense) => expense.center === center),
    [expenses]
  );

  const getAllReceipts = useCallback(() => receipts, [receipts]);
  const getAllExpenses = useCallback(() => expenses, [expenses]);

  // ========================
  // GERAÇÃO DE DESPESAS FIXAS
  // ========================
  const generateFixedExpenses = useCallback(async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();

      // Busca todas as despesas fixas
      const { data: fixedExpensesData, error: fixedError } = await supabase
        .from("financial_transactions")
        .select(
          `
          id,
          type,
          status,
          date,
          value,
          category,
          description,
          payment_method,
          reference,
          equipment_id,
          is_fixed,
          sector,
          fixed_duration_months,
          cost_center_id,
          created_at,
          cost_center_id
        `
        )
        .eq("type", "DESPESA")
        .eq("is_fixed", true);

      if (fixedError) {
        console.warn("❌ Erro ao buscar despesas fixas:", fixedError);
        return;
      }

      if (!fixedExpensesData || fixedExpensesData.length === 0) {
        return; // Não há despesas fixas
      }

      // Para cada despesa fixa, verifica se precisa gerar parcelas
      for (const fixedExpense of fixedExpensesData) {
        const centerCode = (fixedExpense.cost_center_id ?? "valenca") as CostCenter;

        if (!centerCode) continue;

        // Validação: Despesa fixa SEMPRE tem duração
        if (!fixedExpense.fixed_duration_months) {
          console.error(
            `❌ ERRO: Despesa fixa "${fixedExpense.description}" sem duração definida! Pulando...`
          );
          continue; // Pula para a próxima despesa
        }

        const totalMonths = fixedExpense.fixed_duration_months;
        console.log(
          `📅 Despesa fixa "${fixedExpense.description}": gerando ${totalMonths} parcelas`
        );

        // Conta quantas parcelas já foram geradas (não fixas, mesma descrição e centro)
        // Busca todas as parcelas para verificar quantas existem
        const { data: existingInstallments, error: countError } = await supabase
          .from("financial_transactions")
          .select("id")
          .eq("type", "DESPESA")
          .eq("description", fixedExpense.description)
          .eq("cost_center_id", fixedExpense.cost_center_id)
          .eq("is_fixed", false);

        if (countError) {
          console.error("❌ Erro ao contar parcelas:", countError);
          continue;
        }

        const existingCount = existingInstallments?.length ?? 0;
        if (existingCount >= totalMonths - 1) {
          continue; // Todas as parcelas já foram geradas (totalMonths - 1 porque o template não conta)
        }

        // Gera as parcelas faltantes
        // Usa a data do template (fixedExpense.date) para calcular as parcelas
        // Converte a data do banco (YYYY-MM-DD) para evitar problemas de timezone
        const [year, month, day] = fixedExpense.date.split('-').map(Number);
        const creationMonth = month;
        const creationYear = year;
        const creationDay = day;

        // Começa do offset 1 (mês seguinte ao template) até totalMonths-1
        for (let offset = 1; offset < totalMonths; offset++) {
          const targetMonth = creationMonth + offset;
          let targetYear = creationYear;
          let actualMonth = targetMonth;

          if (targetMonth > 12) {
            const yearOffset = Math.floor((targetMonth - 1) / 12);
            targetYear = creationYear + yearOffset;
            actualMonth = ((targetMonth - 1) % 12) + 1;
          }

          // Verifica se já existe esta parcela
          const monthStart = `${targetYear}-${String(actualMonth).padStart(2, "0")}-01`;
          const lastDayOfMonth = new Date(targetYear, actualMonth, 0).getDate();
          const monthEnd = `${targetYear}-${String(actualMonth).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

          const { data: existingParcel, error: checkParcelError } = await supabase
            .from("financial_transactions")
            .select("id")
            .eq("type", "DESPESA")
            .eq("description", fixedExpense.description)
            .eq("cost_center_id", fixedExpense.cost_center_id)
            .eq("is_fixed", false)
            .gte("date", monthStart)
            .lte("date", monthEnd)
            .maybeSingle();

          if (checkParcelError) {
            console.error("❌ Erro ao verificar parcela:", checkParcelError);
            continue;
          }

          if (existingParcel) {
            continue; // Parcela já existe
          }

          // Gera a parcela
          const expenseDay = Math.min(creationDay, lastDayOfMonth);
          const newExpenseDate = `${String(expenseDay).padStart(2, "0")}/${String(actualMonth).padStart(2, "0")}/${targetYear}`;
          const dbDate = toDbDate(newExpenseDate);

          if (!dbDate) {
            console.error("❌ Erro ao gerar data para parcela:", newExpenseDate);
            continue;
          }

          const installmentPayload: any = {
            type: "DESPESA",
            status: "CONFIRMADO",
            cost_center_id: fixedExpense.cost_center_id,
            equipment_id: fixedExpense.equipment_id ?? null,
            value: fixedExpense.value,
            date: dbDate,
            category: fixedExpense.category ?? "diversos",
            description: fixedExpense.description,
            payment_method: fixedExpense.payment_method ?? null,
            reference: fixedExpense.reference ?? null,
            is_fixed: false,
            sector: fixedExpense.sector ?? null,
            fixed_duration_months: null,
            installment_number: offset + 1,
          };

          const { error: installError } = await supabase
            .from("financial_transactions")
            .insert(installmentPayload);

          if (installError) {
            console.error(`❌ Erro ao gerar parcela ${offset + 1}/${totalMonths}:`, installError);
          }
        }

        // Recarrega despesas após gerar parcelas
        const { data: reloadedExpenses, error: reloadError } = await supabase
          .from("financial_transactions")
          .select(
            `
          id,
          type,
          status,
          date,
          value,
          category,
          description,
          payment_method,
          reference,
          equipment_id,
          is_fixed,
          sector,
          fixed_duration_months,
          installment_number,
          created_at,
          cost_center_id
        `
          )
          .eq("type", "DESPESA")
          .order("created_at", { ascending: false });

        if (!reloadError && reloadedExpenses) {
          const mapped: Expense[] = await Promise.all(
            (reloadedExpenses ?? []).map((row: any) => mapRowToExpense(row))
          );
          setExpenses(mapped);
        }
      }

      console.log("✅ Despesas fixas verificadas e geradas se necessário");
    } catch (err) {
      console.error("❌ Erro inesperado ao gerar despesas fixas:", err);
    }
  }, []);


  // ========================
  // 📊 DATA FOR CHARTS (FULL PERIOD)
  // ========================

  const getExpensesForDateRange = useCallback(async (startDate: string, endDate: string, centerId?: CostCenter): Promise<Expense[]> => {
    let query = supabase
      .from("financial_transactions")
      .select(`
        id, type, status, date, value, category, description,
        payment_method, reference, equipment_id, is_fixed,
        sector, fixed_duration_months, installment_number,
        created_at, cost_center_id
      `)
      .eq("type", "DESPESA")
      .is("deleted_at", null)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (centerId) {
      query = query.eq("cost_center_id", centerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching expenses for charts:", error);
      return [];
    }

    if (!data) return [];

    return await Promise.all(
      data.map((row: any) => mapRowToExpense(row))
    );
  }, []);

  const getReceiptsForDateRange = useCallback(async (startDate: string, endDate: string, centerId?: CostCenter): Promise<Receipt[]> => {
    let query = supabase
      .from("financial_transactions")
      .select(`
        id, type, status, date, value, category, description,
        payment_method, reference, is_fixed, fixed_duration_months,
        installment_number, created_at, cost_center_id
      `)
      .eq("type", "RECEITA")
      .is("deleted_at", null)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (centerId) {
      query = query.eq("cost_center_id", centerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching receipts for charts:", error);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => mapRowToReceipt(row));
  }, []);

  return (
    <FinancialContext.Provider
      value={{
        receipts,
        expenses,
        loading,

        // 🚀 PAGINAÇÃO
        loadMoreExpenses,
        refreshExpenses,
        expensesLoading,
        hasMoreExpenses,
        loadMoreReceipts,
        refreshReceipts,
        receiptsLoading,
        hasMoreReceipts,

        addReceipt,
        updateReceipt,
        deleteReceipt,
        addExpense,
        updateExpense,
        deleteExpense,
        addDocumentToExpense,
        deleteExpenseDocument,
        getReceiptsByCenter,
        getExpensesByCenter,
        getAllReceipts,
        getAllExpenses,
        generateFixedExpenses,

        // 📊 CHARTS
        getExpensesForDateRange,
        getReceiptsForDateRange,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};