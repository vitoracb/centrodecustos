import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { CostCenter } from "./CostCenterContext";
import { uploadMultipleFilesToStorage } from "@/src/lib/storageUtils";

// ============================
// TIPOS
// ============================

export type OrderStatus =
  | "orcamento_solicitado"
  | "orcamento_pendente"
  | "orcamento_enviado"
  | "orcamento_aprovado"
  | "em_execucao"
  | "finalizado";

export interface OrderBudget {
  fileUri: string;
  fileName: string;
  mimeType: string | null;
}

export interface Order {
  id: string;
  name: string;
  description: string;
  orderDate: string; // DD/MM/YYYY
  date: string; // alias para compatibilidade com UI
  status: OrderStatus;
  costCenter: CostCenter;
  equipmentId?: string;
  equipmentName?: string;
  budget?: OrderBudget;
  createdAt?: number;
}

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  error: string | null;

  addOrder: (order: {
    name: string;
    description: string;
    orderDate: string;
    status: OrderStatus;
    costCenter: CostCenter;
    equipmentId?: string;
  }) => Promise<void>;

  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  getOrdersByCenter: (center: CostCenter) => Order[];
  getAllOrders: () => Order[];
  markOrderAsRead: (id: string) => void;

  refresh: () => Promise<void>;
  getUnreadNotificationsCount: () => number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error("useOrders must be used within OrderProvider");
  }
  return ctx;
};

// ============================
// HELPERS DE DATA
// ============================

const brToIso = (d: string) => {
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
};

const isoToBr = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const allowedStatuses: OrderStatus[] = [
  "orcamento_solicitado",
  "orcamento_pendente",
  "orcamento_enviado",
  "orcamento_aprovado",
  "em_execucao",
  "finalizado",
];

const allowedCenters: CostCenter[] = ["valenca", "cna", "cabralia"];

const normalizeStatus = (status?: string | null): OrderStatus => {
  if (!status) return "orcamento_pendente";

  const cleaned = status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/[^a-z_]/g, "");

  const match = allowedStatuses.find((item) => item === cleaned);
  return match ?? "orcamento_pendente";
};

const normalizeCenter = (code?: string | null): CostCenter => {
  if (!code) return "valenca";
  const cleaned = code.toLowerCase();
  return (allowedCenters.includes(cleaned as CostCenter)
    ? cleaned
    : "valenca") as CostCenter;
};

const mapRowToOrder = (row: any): Order => {
  const orderDate = isoToBr(row.order_date);
  const normalizedStatus = normalizeStatus(row.status);

  const budget =
    row.quote_file_url && row.quote_file_name
      ? {
          fileUri: row.quote_file_url,
          fileName: row.quote_file_name,
          mimeType: row.quote_file_mime_type ?? null,
        }
      : undefined;

  const equipmentRow = Array.isArray(row.equipments)
    ? row.equipments[0]
    : row.equipments;

  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    orderDate,
    date: orderDate,
    status: normalizedStatus,
    costCenter: normalizeCenter(row.cost_centers?.code),
    equipmentId: row.equipment_id ?? undefined,
    equipmentName: equipmentRow?.name ?? undefined,
    budget,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
  };
};

// ============================
// PROVIDER
// ============================

export const OrdersProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------
  // LOAD ORDERS
  // ----------------------------
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        name,
        description,
        order_date,
        status,
        equipment_id,
        quote_file_url,
        quote_file_name,
        quote_file_mime_type,
        created_at,
        cost_centers ( code ),
        equipments ( id, name )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.log("❌ Erro ao carregar pedidos:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    const mapped: Order[] = data?.map(mapRowToOrder) ?? [];
    setOrders(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ----------------------------
  // ADD ORDER
  // ----------------------------
  const addOrder = useCallback(
    async (order: {
      name: string;
      description: string;
      orderDate: string;
      status: OrderStatus;
      costCenter: CostCenter;
      equipmentId?: string;
    }) => {
      try {
        console.log("📦 Salvando pedido:", order);

        const { data: ccData, error: ccError } = await supabase
          .from("cost_centers")
          .select("id")
          .eq("code", order.costCenter)
          .maybeSingle();

        if (ccError || !ccData) {
          console.log("❌ Erro ao buscar centro de custo:", ccError);
          throw new Error("Centro de custo inválido.");
        }

        const payload = {
          name: order.name,
          description: order.description,
          order_date: brToIso(order.orderDate),
          status: order.status,
          cost_center_id: ccData.id,
          equipment_id: order.equipmentId ?? null,
        };

        const { data, error } = await supabase
          .from("orders")
          .insert(payload)
          .select(
            `
            id,
            name,
            description,
            order_date,
            status,
            equipment_id,
            quote_file_url,
            quote_file_name,
            quote_file_mime_type,
            created_at,
            cost_centers ( code ),
            equipments ( id, name )
          `
          )
          .maybeSingle();

        if (error || !data) {
          console.log("❌ Erro ao criar pedido:", error);
          throw error;
        }

        const newOrder: Order = mapRowToOrder({
          ...data,
          cost_centers: data.cost_centers ?? { code: order.costCenter },
        });

        setOrders((prev) => [newOrder, ...prev]);
      } catch (err) {
        console.log("❌ Erro em addOrder:", err);
        throw err;
      }
    },
    []
  );

  // ----------------------------
  // UPDATE ORDER
  // ----------------------------
  const updateOrder = useCallback(
    async (order: Order) => {
      try {
        const existing = orders.find((o) => o.id === order.id);

        const { data: ccData, error: ccError } = await supabase
          .from("cost_centers")
          .select("id, code")
          .eq("code", order.costCenter)
          .maybeSingle();

        if (ccError || !ccData) {
          console.log("❌ Erro ao buscar centro de custo:", ccError);
          throw new Error("Centro de custo inválido.");
        }

        let budgetToPersist = order.budget ?? existing?.budget;

        const needsUpload =
          budgetToPersist?.fileUri &&
          !budgetToPersist.fileUri.startsWith("http");

        if (needsUpload && budgetToPersist) {
          const [uploadedUrl] = await uploadMultipleFilesToStorage(
            [
              {
                fileUri: budgetToPersist.fileUri,
                fileName: budgetToPersist.fileName ?? "orcamento",
                mimeType: budgetToPersist.mimeType ?? "application/pdf",
              },
            ],
            "documentos"
          );

          if (!uploadedUrl) {
            throw new Error("Não foi possível enviar o arquivo de orçamento.");
          }

          budgetToPersist = {
            ...budgetToPersist,
            fileUri: uploadedUrl,
          };
        }

        const payload: any = {
          name: order.name,
          description: order.description,
          order_date: brToIso(order.orderDate || order.date),
          status: order.status,
          cost_center_id: ccData.id,
          equipment_id: order.equipmentId ?? null,
        };

        if (budgetToPersist) {
          payload.quote_file_url = budgetToPersist.fileUri;
          payload.quote_file_name = budgetToPersist.fileName;
          payload.quote_file_mime_type = budgetToPersist.mimeType ?? null;
        }

        if (
          !budgetToPersist &&
          existing?.budget &&
          order.status !== "orcamento_enviado"
        ) {
          payload.quote_file_url = null;
          payload.quote_file_name = null;
          payload.quote_file_mime_type = null;
        }

        const { data, error } = await supabase
          .from("orders")
          .update(payload)
          .eq("id", order.id)
          .select(
            `
            id,
            name,
            description,
            order_date,
            status,
            equipment_id,
            quote_file_url,
            quote_file_name,
            quote_file_mime_type,
            created_at,
            cost_centers ( code ),
            equipments ( id, name )
          `
          )
          .maybeSingle();

        if (error || !data) {
          console.log("❌ Erro ao atualizar pedido:", error);
          throw error;
        }

        if (budgetToPersist && order.status === "orcamento_enviado") {
          const { error: quoteError } = await supabase
            .from("order_quotes")
            .insert({
              order_id: order.id,
              file_url: budgetToPersist.fileUri,
              file_name: budgetToPersist.fileName,
              mime_type: budgetToPersist.mimeType ?? null,
            });

          if (quoteError) {
            console.log("⚠️ Erro ao registrar orçamento em order_quotes:", quoteError);
          }
        }

        const updated = mapRowToOrder(data);

        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? updated : o))
        );
      } catch (err) {
        console.log("❌ Erro em updateOrder:", err);
        throw err;
      }
    },
    [orders]
  );

  // ----------------------------
  // DELETE ORDER
  // ----------------------------
  const deleteOrder = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("orders").delete().eq("id", id);

      if (error) {
        console.log("❌ Erro ao deletar pedido:", error);
        throw error;
      }

      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.log("❌ Erro em deleteOrder:", err);
      throw err;
    }
  }, []);

  // ----------------------------
  // BADGE / FILTROS
  // ----------------------------
  const getOrdersByCenter = useCallback(
    (center: CostCenter) => orders.filter((o) => o.costCenter === center),
    [orders]
  );

  const getAllOrders = useCallback(() => orders, [orders]);

  const markOrderAsRead = useCallback((id: string) => {
    console.log("📘 Pedido marcado como lido:", id);
  }, []);

  const getUnreadNotificationsCount = useCallback(() => {
    return orders.filter((o) => o.status === "orcamento_pendente").length;
  }, [orders]);

  // ----------------------------
  // VALUE
  // ----------------------------
  const value: OrderContextType = {
    orders,
    loading,
    error,
    addOrder,
    updateOrder,
    deleteOrder,
    getOrdersByCenter,
    getAllOrders,
    markOrderAsRead,
    refresh: loadOrders,
    getUnreadNotificationsCount,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

// alias pra manter compatibilidade com RootLayout
export { OrdersProvider as OrderProvider };