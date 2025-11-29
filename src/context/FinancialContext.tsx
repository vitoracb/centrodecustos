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
import { uploadMultipleFilesToStorage, uploadFileToStorage } from "@/src/lib/storageUtils";

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
}

export type ExpenseCategory =
  | "manutencao"
  | "funcionario"
  | "gestao"
  | "terceirizados"
  | "diversos";

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
  | "ronaldo";

export interface ExpenseDocument {
  type: "nota_fiscal" | "recibo" | "comprovante_pagamento";
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
  status?: ExpenseStatus;
  method?: string;
  createdAt?: number;
  isFixed?: boolean; // Indica se é uma despesa fixa/recorrente
  sector?: ExpenseSector; // Setor da despesa fixa
  fixedDurationMonths?: number; // Número de meses de duração (null = indefinido)
}

interface FinancialContextType {
  receipts: Receipt[];
  expenses: Expense[];

  addReceipt: (receipt: Omit<Receipt, "id">) => void;
  updateReceipt: (receipt: Receipt) => Promise<Receipt>;
  deleteReceipt: (id: string) => void;

  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  addDocumentToExpense: (expenseId: string, document: Omit<ExpenseDocument, "type"> & { type: "nota_fiscal" | "recibo" | "comprovante_pagamento" }) => Promise<ExpenseDocument>;
  deleteExpenseDocument: (expenseId: string, documentUri: string) => Promise<void>;

  getReceiptsByCenter: (center: CostCenter) => Receipt[];
  getExpensesByCenter: (center: CostCenter) => Expense[];

  getAllReceipts: () => Receipt[];
  getAllExpenses: () => Expense[];
  generateFixedExpenses: () => Promise<void>;
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
    status: expenseStatus,
    method: row.payment_method ?? undefined,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : undefined,
    isFixed: row.is_fixed ?? false,
    sector: row.sector ? (row.sector.toLowerCase() as ExpenseSector) : undefined,
    fixedDurationMonths: row.fixed_duration_months ?? undefined,
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

  return {
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
          is_fixed,
          sector,
          fixed_duration_months,
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
          is_fixed,
          fixed_duration_months,
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
          is_fixed: receipt.isFixed ?? false,
          fixed_duration_months: receipt.fixedDurationMonths ?? null,
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

  const updateReceipt = useCallback(async (receipt: Receipt): Promise<Receipt> => {
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
          throw new Error("Centro de custo não encontrado para atualização de receita");
        }

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

        const payload: any = {
          cost_center_id: ccData.id,
          value: receipt.value,
          date: dbDate,
          category: receipt.category ?? null,
          description: receipt.name,
          payment_method: receipt.method ?? null,
          status: statusValue,
          is_fixed: receipt.isFixed ?? false,
          fixed_duration_months: receipt.fixedDurationMonths ?? null,
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
            created_at,
            cost_centers ( code )
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
          cost_center_id: ccData.id,
          equipment_id: expense.equipmentId ?? null,
          value: expense.value,
          date: dbDate,
          category: expense.category ?? "diversos",
          description: expense.name,
          payment_method: expense.method ?? null,
          reference: expense.observations ?? null,
          is_fixed: expense.isFixed ?? false,
          sector: expense.sector ?? null,
          fixed_duration_months: expense.fixedDurationMonths ?? null,
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
          created_at,
          cost_centers ( code )
        `
        )
        .single();

        if (error || !data) {
          console.error("❌ Erro ao criar despesa:", error);
          return;
        }

        // Se for despesa fixa com duração, gera as parcelas imediatamente
        if (expense.isFixed && expense.fixedDurationMonths && expense.fixedDurationMonths > 1) {
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

          // Gera as parcelas restantes (a primeira já foi criada acima como template)
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
              cost_center_id: ccData.id,
              equipment_id: expense.equipmentId ?? null,
              value: expense.value,
              date: dbDate,
              category: expense.category ?? "diversos",
              description: expense.name,
              payment_method: expense.method ?? null,
              reference: expense.observations ?? null,
              is_fixed: false,
              sector: expense.sector ?? null,
              fixed_duration_months: null,
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
              created_at,
              cost_centers ( code )
            `
            )
            .eq("type", "DESPESA")
            .order("date", { ascending: false });

          if (!reloadError && allExpensesData) {
            const mapped: Expense[] = await Promise.all(
              (allExpensesData ?? []).map((row: any) => mapRowToExpense(row))
            );
            setExpenses(mapped);
            return; // Não adiciona ao estado novamente (já recarregou todas)
          }
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

        // Só adiciona ao estado se não gerou parcelas (para evitar duplicatas)
        if (!expense.isFixed || !expense.fixedDurationMonths || expense.fixedDurationMonths <= 1) {
          const newExpense = await mapRowToExpense(data);
          setExpenses((prev) => [newExpense, ...prev]);
        }
      } catch (e) {
        console.error("❌ Erro inesperado ao criar despesa:", e);
      }
    })();
  }, []);

  const updateExpense = useCallback((expense: Expense) => {
    (async () => {
      try {
        // IMPORTANTE: Esta função atualiza APENAS o registro específico (pelo ID).
        // Se for uma despesa fixa (is_fixed = true), apenas a template é atualizada.
        // As despesas já geradas (is_fixed = false) são registros separados e NÃO são afetadas.
        // Quando o valor de uma despesa fixa mudar, apenas as novas despesas geradas
        // a partir do mês da alteração terão o novo valor.

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

        const payload: any = {
          cost_center_id: ccData.id,
          equipment_id: expense.equipmentId ?? null,
          value: expense.value,
          date: dbDate,
          category: expense.category ?? "diversos",
          description: expense.name,
          payment_method: expense.method ?? null,
          reference: expense.observations ?? null,
          status: statusToDb(expense.status),
          is_fixed: expense.isFixed ?? false,
          sector: expense.sector ?? null,
          fixed_duration_months: expense.fixedDurationMonths ?? null,
        };

        // Atualiza APENAS o registro específico (não afeta despesas geradas)
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
            created_at,
            cost_centers ( code )
          `
          )
          .single();

        if (error || !data) {
          console.error("❌ Erro ao atualizar despesa:", error);
          return;
        }

        // Sincroniza documentos apenas quando o formulário enviar o array atualizado
        if (Array.isArray(expense.documents)) {
          try {
            const desiredDocs = (expense.documents ?? []).filter(
              (doc) => !!doc.fileUri
            );

            const { data: existingDocs, error: existingDocsError } =
              await supabase
                .from("expense_documents")
                .select("id, file_url, file_name, mime_type, type")
                .eq("transaction_id", expense.id);

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
                  .eq("transaction_id", expense.id)
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
                    "documentos",
                    "expenses"
                  );

                  if (!uploadedUrl) {
                    console.warn(
                      "⚠️ Não foi possível fazer upload do documento ao editar a despesa."
                    );
                    continue;
                  }

                  fileUrl = uploadedUrl;
                }

                const { error: insertError } = await supabase
                  .from("expense_documents")
                  .insert({
                    transaction_id: expense.id,
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

  const addDocumentToExpense = useCallback(
    async (expenseId: string, document: Omit<ExpenseDocument, "type"> & { type: "nota_fiscal" | "recibo" | "comprovante_pagamento" }): Promise<ExpenseDocument> => {
      try {
        // Faz upload do arquivo para o Supabase Storage
        const fileUrl = await uploadFileToStorage(
          document.fileUri,
          document.fileName,
          document.mimeType,
          "documentos",
          "expenses"
        );

        if (!fileUrl) {
          throw new Error("Não foi possível fazer upload do arquivo.");
        }

        // Insere o documento na tabela expense_documents
        const { data, error } = await supabase
          .from("expense_documents")
          .insert({
            transaction_id: expenseId,
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
          type: data.type as "nota_fiscal" | "recibo" | "comprovante_pagamento",
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
          .eq("transaction_id", expenseId)
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
          cost_centers ( code )
        `
        )
        .eq("type", "DESPESA")
        .eq("is_fixed", true);

      if (fixedError) {
        console.error("❌ Erro ao buscar despesas fixas:", fixedError);
        return;
      }

      if (!fixedExpensesData || fixedExpensesData.length === 0) {
        return; // Não há despesas fixas
      }

      // Para cada despesa fixa, verifica se precisa gerar parcelas
      for (const fixedExpense of fixedExpensesData) {
        const rawCostCenter = Array.isArray(fixedExpense.cost_centers)
          ? fixedExpense.cost_centers[0]
          : fixedExpense.cost_centers;
        const centerCode = (rawCostCenter as any)?.code;

        if (!centerCode) continue;

        // Se tem duração definida, verifica quantas parcelas já foram geradas
        const totalMonths = fixedExpense.fixed_duration_months ?? null;
        if (totalMonths !== null) {
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
          if (existingCount >= totalMonths) {
            continue; // Todas as parcelas já foram geradas
          }

          // Gera as parcelas faltantes
          const createdAt = fixedExpense.created_at
            ? new Date(fixedExpense.created_at)
            : new Date(fixedExpense.date);
          const creationMonth = createdAt.getMonth() + 1;
          const creationYear = createdAt.getFullYear();
          const creationDay = createdAt.getDate();

          for (let offset = existingCount; offset < totalMonths; offset++) {
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
              created_at,
              cost_centers ( code )
            `
            )
            .eq("type", "DESPESA")
            .order("date", { ascending: false });

          if (!reloadError && reloadedExpenses) {
            const mapped: Expense[] = await Promise.all(
              (reloadedExpenses ?? []).map((row: any) => mapRowToExpense(row))
            );
            setExpenses(mapped);
          }
          continue;
        }

        // Se não tem duração definida, gera apenas para o mês atual (comportamento antigo)
        const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
        const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;

        const { data: existingExpense, error: checkError } = await supabase
          .from("financial_transactions")
          .select("id")
          .eq("type", "DESPESA")
          .eq("description", fixedExpense.description)
          .eq("cost_center_id", fixedExpense.cost_center_id)
          .eq("is_fixed", false) // A cópia gerada não é fixa
          .gte("date", monthStart)
          .lte("date", monthEnd)
          .maybeSingle();

        if (checkError) {
          console.error("❌ Erro ao verificar despesa existente:", checkError);
          continue;
        }

        // Se já existe, pula
        if (existingExpense) {
          continue;
        }

        // Gera a nova despesa para o mês atual
        // IMPORTANTE: Usa sempre o valor ATUAL da despesa fixa template.
        // Se o valor foi alterado, apenas as novas despesas geradas a partir
        // do mês da alteração terão o novo valor. Despesas já geradas mantêm o valor antigo.
        const newExpenseDate = `${String(now.getDate()).padStart(2, "0")}/${String(currentMonth).padStart(2, "0")}/${currentYear}`;
        const dbDate = toDbDate(newExpenseDate);

        if (!dbDate) {
          console.error("❌ Erro ao gerar data para despesa fixa");
          continue;
        }

        const payload: any = {
          type: "DESPESA",
          status: "CONFIRMADO", // Despesas fixas geradas automaticamente já vêm confirmadas
          cost_center_id: fixedExpense.cost_center_id,
          equipment_id: fixedExpense.equipment_id ?? null,
          value: fixedExpense.value, // Usa o valor ATUAL da template (pode ter sido alterado)
          date: dbDate,
          category: fixedExpense.category ?? "diversos",
          description: fixedExpense.description,
          payment_method: fixedExpense.payment_method ?? null,
          reference: fixedExpense.reference ?? null,
          is_fixed: false, // A cópia gerada não é fixa (é um registro separado)
          sector: fixedExpense.sector ?? null, // Mantém o setor da template
        };

        const { data: newExpense, error: insertError } = await supabase
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
            created_at,
            cost_centers ( code )
          `
          )
          .single();

        if (insertError || !newExpense) {
          console.error("❌ Erro ao gerar despesa fixa:", insertError);
          continue;
        }

        // Atualiza o estado local
        const mappedExpense = await mapRowToExpense(newExpense);
        setExpenses((prev) => [mappedExpense, ...prev]);
      }

      console.log("✅ Despesas fixas verificadas e geradas se necessário");
    } catch (err) {
      console.error("❌ Erro inesperado ao gerar despesas fixas:", err);
    }
  }, []);

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
        addDocumentToExpense,
        deleteExpenseDocument,
        getReceiptsByCenter,
        getExpensesByCenter,
        getAllReceipts,
        getAllExpenses,
        generateFixedExpenses,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};