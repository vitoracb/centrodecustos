import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { CostCenter } from "./CostCenterContext";
import { supabase } from "@/src/lib/supabaseClient";
import { uploadMultipleFilesToStorage } from "@/src/lib/storageUtils";

// ========================
// TIPOS
// ========================

export interface Receipt {
  id: string;
  name: string;
  date: string; // dd/MM/yyyy
  value: number;
  center: CostCenter;
  category?: string;
  status?: string;
  method?: string;
  createdAt?: number; // timestamp
}

export type ExpenseCategory =
  | "manutencao"
  | "funcionario"
  | "gestao"
  | "terceirizados"
  | "diversos";

export type GestaoSubcategory =
  | "aluguel"
  | "carro"
  | "salario"
  | "combustivel"
  | "diversos";

export interface ExpenseDocument {
  type: "nota_fiscal" | "recibo";
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
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
  status?: string;
  method?: string;
  createdAt?: number;
}

interface FinancialContextType {
  receipts: Receipt[];
  expenses: Expense[];

  addReceipt: (receipt: Omit<Receipt, "id">) => void;
  updateReceipt: (receipt: Receipt) => void;
  deleteReceipt: (id: string) => void;

  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;

  getReceiptsByCenter: (center: CostCenter) => Receipt[];
  getExpensesByCenter: (center: CostCenter) => Expense[];

  getAllReceipts: () => Receipt[];
  getAllExpenses: () => Expense[];
}

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

// ========================
// MAPEAMENTO: LINHA -> EXPENSE
// ========================

async function mapRowToExpense(row: any): Promise<Expense> {
  const rawCostCenter = Array.isArray(row.cost_centers)
    ? row.cost_centers[0]
    : row.cost_centers;

  const centerCode = (rawCostCenter?.code ?? "valenca") as CostCenter;

  // Carrega documentos da despesa
  let documents: ExpenseDocument[] = [];
  try {
    const { data: docsData, error: docsError } = await supabase
      .from("expense_documents")
      .select("type, file_name, file_url, mime_type")
      .eq("transaction_id", row.id)
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
        type: (doc.type ?? "recibo") as "nota_fiscal" | "recibo",
        fileName: doc.file_name ?? "",
        fileUri: doc.file_url ?? "",
        mimeType: doc.mime_type ?? null,
      }));
    }
  } catch (e) {
    console.warn("⚠️ Erro ao carregar documentos da despesa:", e);
  }

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
    observations: row.reference ?? undefined,
    status: row.status ?? "CONFIRMADO",
    method: row.payment_method ?? undefined,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : undefined,
  };
}

// ========================
// MAPEAMENTO: LINHA -> RECEIPT
// ========================

function mapRowToReceipt(row: any): Receipt {
  const rawCostCenter = Array.isArray(row.cost_centers)
    ? row.cost_centers[0]
    : row.cost_centers;

  const centerCode = (rawCostCenter?.code ?? "valenca") as CostCenter;

  return {
    id: row.id,
    name: row.description ?? "",
    date: fromDbDate(row.date),
    value: Number(row.value ?? 0),
    center: centerCode,
    category: row.category ?? undefined,
    status: row.status ?? "CONFIRMADO",
    method: row.payment_method ?? undefined,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : undefined,
  };
}

// ========================
// PROVIDER
// ========================

interface FinancialProviderProps {
  children: ReactNode;
}

export const FinancialProvider = ({ children }: FinancialProviderProps) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // --------- CARREGAR DESPESAS DO SUPABASE ---------
  useEffect(() => {
    const loadExpenses = async () => {
      console.log("🔌 Carregando despesas do Supabase...");
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
          equipment_id,
          created_at,
          cost_centers ( code )
        `
        )
        .eq("type", "DESPESA")
        .order("date", { ascending: false });

      if (error) {
        console.error("❌ Erro ao carregar despesas:", error);
        return;
      }

      const mapped: Expense[] = await Promise.all(
        (data ?? []).map((row: any) => mapRowToExpense(row))
      );
      setExpenses(mapped);
    };

    loadExpenses();
  }, []);

  // --------- CARREGAR RECEITAS DO SUPABASE ---------
  useEffect(() => {
    const loadReceipts = async () => {
      console.log("🔌 Carregando receitas do Supabase...");
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
          created_at,
          cost_centers ( code )
        `
        )
        .eq("type", "RECEITA")
        .order("date", { ascending: false });

      if (error) {
        console.error("❌ Erro ao carregar receitas:", error);
        return;
      }

      const mapped: Receipt[] = (data ?? []).map((row: any) =>
        mapRowToReceipt(row)
      );
      setReceipts(mapped);
    };

    loadReceipts();
  }, []);

  // ========================
  // RECEITAS — CRUD
  // ========================

  const addReceipt = useCallback((receipt: Omit<Receipt, "id">) => {
    (async () => {
      try {
        const { data: ccData, error: ccError } = await supabase
          .from("cost_centers")
          .select("id, code")
          .eq("code", receipt.center)
          .maybeSingle();

        if (ccError || !ccData) {
          console.error(
            "❌ Erro ao buscar centro de custo para receita:",
            ccError || "não encontrado"
          );
          return;
        }

        const dbDate = toDbDate(receipt.date);
        if (!dbDate) {
          console.error("❌ Data de receita inválida:", receipt.date);
          return;
        }

        const payload: any = {
          type: "RECEITA",
          status:
            receipt.status &&
            receipt.status.toLowerCase().startsWith("prev")
              ? "PREVISTO"
              : "CONFIRMADO",
          cost_center_id: ccData.id,
          value: receipt.value,
          date: dbDate,
          category: receipt.category ?? null,
          description: receipt.name,
          payment_method: receipt.method ?? null,
          reference: null,
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
            created_at,
            cost_centers ( code )
          `
          )
          .single();

        if (error || !data) {
          console.error("❌ Erro ao criar receita:", error);
          return;
        }

        const newReceipt = mapRowToReceipt(data);
        setReceipts((prev) => [newReceipt, ...prev]);
      } catch (e) {
        console.error("❌ Erro inesperado ao criar receita:", e);
      }
    })();
  }, []);

  const updateReceipt = useCallback((receipt: Receipt) => {
    (async () => {
      try {
        const { data: ccData, error: ccError } = await supabase
          .from("cost_centers")
          .select("id, code")
          .eq("code", receipt.center)
          .maybeSingle();

        if (ccError || !ccData) {
          console.error(
            "❌ Erro ao buscar centro de custo para update de receita:",
            ccError || "não encontrado"
          );
          return;
        }

        const dbDate = toDbDate(receipt.date);
        if (!dbDate) {
          console.error("❌ Data de receita inválida:", receipt.date);
          return;
        }

        const payload: any = {
          cost_center_id: ccData.id,
          value: receipt.value,
          date: dbDate,
          category: receipt.category ?? null,
          description: receipt.name,
          payment_method: receipt.method ?? null,
          status:
            receipt.status &&
            receipt.status.toLowerCase().startsWith("prev")
              ? "PREVISTO"
              : "CONFIRMADO",
        };

        const { data, error } = await supabase
          .from("financial_transactions")
          .update(payload)
          .eq("id", receipt.id)
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
            created_at,
            cost_centers ( code )
          `
          )
          .single();

        if (error || !data) {
          console.error("❌ Erro ao atualizar receita:", error);
          return;
        }

        const updated = mapRowToReceipt(data);
        setReceipts((prev) =>
          prev.map((r) => (r.id === receipt.id ? updated : r))
        );
      } catch (e) {
        console.error("❌ Erro inesperado ao atualizar receita:", e);
      }
    })();
  }, []);

  const deleteReceipt = useCallback((id: string) => {
    (async () => {
      try {
        const { error } = await supabase
          .from("financial_transactions")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("❌ Erro ao deletar receita:", error);
          return;
        }

        setReceipts((prev) => prev.filter((r) => r.id !== id));
      } catch (e) {
        console.error("❌ Erro inesperado ao deletar receita:", e);
      }
    })();
  }, []);

  // ========================
  // DESPESAS — CRUD
  // ========================

  const addExpense = useCallback((expense: Omit<Expense, "id">) => {
    (async () => {
      try {
        const { data: ccData, error: ccError } = await supabase
          .from("cost_centers")
          .select("id, code")
          .eq("code", expense.center)
          .maybeSingle();

        if (ccError || !ccData) {
          console.error(
            "❌ Erro ao buscar centro de custo para despesa:",
            ccError || "não encontrado"
          );
          return;
        }

        const dbDate = toDbDate(expense.date);
        if (!dbDate) {
          console.error("❌ Data de despesa inválida:", expense.date);
          return;
        }

        const payload: any = {
          type: "DESPESA",
          status:
            expense.status &&
            expense.status.toLowerCase().startsWith("prev")
              ? "PREVISTO"
              : "CONFIRMADO",
          cost_center_id: ccData.id,
          equipment_id: expense.equipmentId ?? null,
          value: expense.value,
          date: dbDate,
          category: expense.category ?? "diversos",
          description: expense.name,
          payment_method: expense.method ?? null,
          reference: expense.observations ?? null,
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
            created_at,
            cost_centers ( code )
          `
          )
          .single();

        if (error || !data) {
          console.error("❌ Erro ao criar despesa:", error);
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
              "documentos"
            );

            const documentsPayload = expense.documents.map((doc, index) => {
              const storageUrl = uploadResults[index];
              return {
                transaction_id: data.id,
                type: doc.type,
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

        const newExpense = await mapRowToExpense(data);
        setExpenses((prev) => [newExpense, ...prev]);
      } catch (e) {
        console.error("❌ Erro inesperado ao criar despesa:", e);
      }
    })();
  }, []);

  const updateExpense = useCallback((expense: Expense) => {
    (async () => {
      try {
        const { data: ccData, error: ccError } = await supabase
          .from("cost_centers")
          .select("id, code")
          .eq("code", expense.center)
          .maybeSingle();

        if (ccError || !ccData) {
          console.error(
            "❌ Erro ao buscar centro de custo para update de despesa:",
            ccError || "não encontrado"
          );
          return;
        }

        const dbDate = toDbDate(expense.date);
        if (!dbDate) {
          console.error("❌ Data de despesa inválida:", expense.date);
          return;
        }

        const payload: any = {
          cost_center_id: ccData.id,
          equipment_id: expense.equipmentId ?? null,
          value: expense.value,
          date: dbDate,
          category: expense.category ?? "diversos",
          description: expense.name,
          payment_method: expense.method ?? null,
          reference: expense.observations ?? null,
          status:
            expense.status &&
            expense.status.toLowerCase().startsWith("prev")
              ? "PREVISTO"
              : "CONFIRMADO",
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
            created_at,
            cost_centers ( code )
          `
          )
          .single();

        if (error || !data) {
          console.error("❌ Erro ao atualizar despesa:", error);
          return;
        }

        const updatedExpense = await mapRowToExpense(data);
        setExpenses((prev) =>
          prev.map((e) => (e.id === expense.id ? updatedExpense : e))
        );
      } catch (e) {
        console.error("❌ Erro inesperado ao atualizar despesa:", e);
      }
    })();
  }, []);

  const deleteExpense = useCallback((id: string) => {
    (async () => {
      try {
        const { error: docsError } = await supabase
          .from("expense_documents")
          .delete()
          .eq("transaction_id", id);

        if (docsError && docsError.code !== "PGRST205") {
          console.warn("⚠️ Erro ao deletar documentos da despesa:", docsError);
        }

        const { error } = await supabase
          .from("financial_transactions")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("❌ Erro ao deletar despesa:", error);
          return;
        }

        setExpenses((prev) => prev.filter((e) => e.id !== id));
      } catch (e) {
        console.error("❌ Erro inesperado ao deletar despesa:", e);
      }
    })();
  }, []);

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