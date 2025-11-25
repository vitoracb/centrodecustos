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

interface FinancialProviderProps {
  children: ReactNode;
}

// --------------------
// MOCKS APENAS PARA RECEITAS (ainda não integramos Supabase nelas)
// --------------------
const initialReceipts: Receipt[] = [
  {
    id: "rec-1",
    name: "Serviços prestados",
    date: "05/11/2024",
    value: 12500,
    center: "valenca",
    category: "Serviços",
    status: "Confirmado",
    method: "Transferência",
  },
  {
    id: "rec-2",
    name: "Venda de equipamento",
    date: "02/11/2024",
    value: 8100,
    center: "valenca",
    category: "Venda de equipamento",
    status: "Previsto",
    method: "Boleto",
  },
];

// helper de data dd/MM/yyyy -> YYYY-MM-DD
const toDbDate = (value?: string): string | null => {
  if (!value) return null;
  const [d, m, y] = value.split("/");
  if (!d || !m || !y) return null;
  return `${y}-${m}-${d}`;
};

// helper de data YYYY-MM-DD -> dd/MM/yyyy
const fromDbDate = (value: string | null): string => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR");
};

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
      // Se a tabela não existir, apenas retorna array vazio
      if (docsError.code === 'PGRST205' || docsError.message?.includes('Could not find the table')) {
        // Tabela não existe ainda, retorna sem documentos
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
    // Retorna sem documentos em caso de erro
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
    status: row.status ?? "Confirmado",
    method: row.payment_method ?? undefined,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : undefined,
  };
}

export const FinancialProvider = ({ children }: FinancialProviderProps) => {
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);

  // agora as despesas vêm do Supabase
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // ========================
  // CARREGAR DESPESAS DO SUPABASE
  // ========================
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

  // ========================
  // RECEITAS (ainda locais)
  // ========================
  const addReceipt = useCallback((receipt: Omit<Receipt, "id">) => {
    const newReceipt: Receipt = {
      ...receipt,
      id: `rec-${Date.now()}`,
      createdAt: Date.now(),
    };
    setReceipts((prev) => [newReceipt, ...prev]);
  }, []);

  const updateReceipt = useCallback((receipt: Receipt) => {
    setReceipts((prev) => prev.map((r) => (r.id === receipt.id ? receipt : r)));
  }, []);

  const deleteReceipt = useCallback((id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ========================
  // DESPESAS — ADD INTEGRADO COM SUPABASE
  // ========================
  const addExpense = useCallback(
    (expense: Omit<Expense, "id">) => {
      (async () => {
        try {
          // 1) descobrir o cost_center_id a partir do center (valenca / cna / cabralia)
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

          // 2) montar payload
          const payload: any = {
            type: "DESPESA",
            status:
              expense.status && expense.status.toLowerCase().startsWith("prev")
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

          // 3) inserir no Supabase
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

          // 4) Salvar documentos se houver
          if (expense.documents && expense.documents.length > 0) {
            try {
              console.log("📤 Fazendo upload de", expense.documents.length, "documento(s) para o Supabase Storage...");
              
              // Faz upload dos arquivos para o Supabase Storage
              const uploadResults = await uploadMultipleFilesToStorage(
                expense.documents.map((doc) => ({
                  fileUri: doc.fileUri,
                  fileName: doc.fileName,
                  mimeType: doc.mimeType,
                })),
                'documentos' // Nome do bucket (ajuste se necessário)
              );

              // Mapeia os documentos com as URLs do Storage
              const documentsPayload = expense.documents.map((doc, index) => {
                const storageUrl = uploadResults[index];
                return {
                  transaction_id: data.id,
                  type: doc.type,
                  file_name: doc.fileName,
                  file_url: storageUrl || doc.fileUri, // Usa URL do Storage se disponível, senão usa URI local
                  mime_type: doc.mimeType ?? null,
                };
              });

              const { error: docsError } = await supabase
                .from("expense_documents")
                .insert(documentsPayload);

              if (docsError) {
                // Se a tabela não existir, apenas loga o erro mas não quebra o fluxo
                if (docsError.code === 'PGRST205' || docsError.message?.includes('Could not find the table')) {
                  console.warn("⚠️ Tabela expense_documents não existe ainda. Documentos não foram salvos. Crie a tabela no Supabase para habilitar esta funcionalidade.");
                } else {
                  console.error("❌ Erro ao salvar documentos da despesa:", docsError);
                }
                // Continua mesmo se houver erro ao salvar documentos
              } else {
                console.log("✅ Documentos da despesa salvos com sucesso");
              }
            } catch (e) {
              console.warn("⚠️ Erro ao tentar salvar documentos:", e);
              // Continua o fluxo mesmo se houver erro
            }
          }

          // 5) mapear de volta para Expense e atualizar estado
          const newExpense = await mapRowToExpense(data);
          setExpenses((prev) => [newExpense, ...prev]);
        } catch (e) {
          console.error("❌ Erro inesperado ao criar despesa:", e);
        }
      })();
    },
    []
  );

  // ========================
  // DESPESAS — UPDATE INTEGRADO COM SUPABASE
  // ========================
  const updateExpense = useCallback((expense: Expense) => {
    (async () => {
      try {
        // 1) descobrir o cost_center_id
        const { data: ccData, error: ccError } = await supabase
          .from("cost_centers")
          .select("id, code")
          .eq("code", expense.center)
          .maybeSingle();

        if (ccError || !ccData) {
          console.error("❌ Erro ao buscar centro de custo para update:", ccError || "não encontrado");
          return;
        }

        const dbDate = toDbDate(expense.date);
        if (!dbDate) {
          console.error("❌ Data de despesa inválida:", expense.date);
          return;
        }

        // 2) montar payload
        const payload: any = {
          cost_center_id: ccData.id,
          equipment_id: expense.equipmentId ?? null,
          value: expense.value,
          date: dbDate,
          category: expense.category ?? "diversos",
          description: expense.name,
          payment_method: expense.method ?? null,
          reference: expense.observations ?? null,
          status: expense.status && expense.status.toLowerCase().startsWith("prev")
            ? "PREVISTO"
            : "CONFIRMADO",
        };

        // 3) atualizar no Supabase
        const { data, error } = await supabase
          .from("financial_transactions")
          .update(payload)
          .eq("id", expense.id)
          .select(
            `
            id, type, status, date, value, category, description, payment_method, reference, equipment_id, created_at,
            cost_centers ( code )
          `
          )
          .single();

        if (error || !data) {
          console.error("❌ Erro ao atualizar despesa:", error);
          return;
        }

        // 4) Atualizar documentos se houver mudanças
        // Por enquanto, não atualizamos documentos existentes, apenas adicionamos novos se necessário
        // (Para atualizar documentos, seria necessário deletar os antigos e inserir os novos)

        // 5) mapear de volta para Expense e atualizar estado
        const updatedExpense = await mapRowToExpense(data);
        setExpenses((prev) => prev.map((e) => (e.id === expense.id ? updatedExpense : e)));
      } catch (e) {
        console.error("❌ Erro inesperado ao atualizar despesa:", e);
      }
    })();
  }, []);

  // ========================
  // DESPESAS — DELETE INTEGRADO COM SUPABASE
  // ========================
  const deleteExpense = useCallback((id: string) => {
    (async () => {
      try {
        // 1) Deletar documentos relacionados primeiro (cascade)
        const { error: docsError } = await supabase
          .from("expense_documents")
          .delete()
          .eq("transaction_id", id);

        if (docsError && docsError.code !== 'PGRST205') {
          console.warn("⚠️ Erro ao deletar documentos da despesa:", docsError);
          // Continua mesmo se houver erro
        }

        // 2) Deletar a transação
        const { error } = await supabase
          .from("financial_transactions")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("❌ Erro ao deletar despesa:", error);
          return;
        }

        // 3) Atualizar estado local
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      } catch (e) {
        console.error("❌ Erro inesperado ao deletar despesa:", e);
      }
    })();
  }, []);

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