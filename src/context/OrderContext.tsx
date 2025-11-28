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
  | "orcamento_reprovado"
  | "em_execucao"
  | "finalizado";

export interface OrderDocument {
  id?: string;
  type?: string; // 'orcamento' | 'anexo' | etc.
  fileUri: string;
  fileName: string;
  mimeType: string | null;
  approved?: boolean; // Se o documento foi aprovado
  createdAt?: number;
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
  documents?: OrderDocument[];
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
  approveOrder: (orderId: string, documentId: string) => Promise<void>;
  rejectOrder: (orderId: string) => Promise<void>;

  getOrdersByCenter: (center: CostCenter) => Order[];
  getAllOrders: () => Order[];
  markOrderAsRead: (id: string) => void;

  refresh: () => Promise<void>;
  getUnreadNotificationsCount: () => number;
}

// ============================
// CONTEXTO + HOOK
// ============================

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

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
  "orcamento_reprovado",
  "em_execucao",
  "finalizado",
];

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

// ============================
// MAPEAMENTO ROW -> ORDER
// ============================

const mapRowToOrder = (row: any): Order => {
  const orderDate = isoToBr(row.order_date);
  const normalizedStatus = normalizeStatus(row.status);

  const equipmentSource = Array.isArray(row.equipments)
    ? row.equipments[0]
    : row.equipments;

  const documents: OrderDocument[] =
    row.order_documents?.map((doc: any) => ({
      id: doc.id,
      type: doc.type ?? "orcamento",
      fileUri: doc.file_url,
      fileName: doc.file_name,
      mimeType: doc.mime_type ?? null,
      approved: doc.approved ?? false,
      createdAt: doc.created_at
        ? new Date(doc.created_at).getTime()
        : undefined,
    })) ?? [];

  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    orderDate,
    date: orderDate,
    status: normalizedStatus,
    costCenter: (row.cost_centers?.code ?? "valenca") as CostCenter,
    equipmentId: row.equipment_id ?? undefined,
    equipmentName: equipmentSource?.name ?? undefined,
    documents: documents.length ? documents : undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
  };
};

// ============================
// PROVIDER
// ============================

const OrderProviderComponent = ({ children }: { children: ReactNode }) => {
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
        created_at,
        cost_centers ( code ),
        equipments ( id, name ),
        order_documents ( id, type, file_url, file_name, mime_type, approved, created_at )
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
            created_at,
            cost_centers ( code ),
            equipments ( id, name ),
            order_documents ( id, type, file_url, file_name, mime_type, approved, created_at )
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
  // UPDATE ORDER (inclui upload de documentos)
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

        // 1) Atualiza os campos básicos do pedido
        const payload: any = {
          name: order.name,
          description: order.description,
          order_date: brToIso(order.orderDate || order.date),
          status: order.status,
          cost_center_id: ccData.id,
          equipment_id: order.equipmentId ?? null,
        };

        const { error: updateError } = await supabase
          .from("orders")
          .update(payload)
          .eq("id", order.id);

        if (updateError) {
          console.log("❌ Erro ao atualizar pedido:", updateError);
          throw updateError;
        }

        // 2) Documentos
        // Consideramos que:
        // - documentos que já existem no banco têm "id" e fileUri começando com http
        // - documentos novos vêm sem "id" e com fileUri local (file:// ou similar)

        const currentDocs = order.documents ?? existing?.documents ?? [];
        const docsToUpload = currentDocs.filter(
          (doc) =>
            doc.fileUri &&
            !doc.fileUri.startsWith("http") // URI local => precisa de upload
        );

        if (docsToUpload.length > 0) {
          const uploadResults = await uploadMultipleFilesToStorage(
            docsToUpload.map((doc) => ({
              fileUri: doc.fileUri,
              fileName: doc.fileName,
              mimeType: doc.mimeType ?? "application/pdf",
            })),
            "documentos"
          );

          const docsPayload = docsToUpload.map((doc, index) => ({
            order_id: order.id,
            type: doc.type ?? "orcamento",
            file_url: uploadResults[index] || doc.fileUri,
            file_name: doc.fileName,
            mime_type: doc.mimeType ?? null,
          }));

          const { error: docsError } = await supabase
            .from("order_documents")
            .insert(docsPayload);

          if (docsError) {
            console.log("⚠️ Erro ao salvar documentos do pedido:", docsError);
            // não dou throw aqui pra não quebrar o update inteiro
          }
        }

        // 3) Buscar novamente o pedido completo (com documentos)
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
            created_at,
            cost_centers ( code ),
            equipments ( id, name ),
            order_documents ( id, type, file_url, file_name, mime_type, created_at )
          `
          )
          .eq("id", order.id)
          .maybeSingle();

        if (error || !data) {
          console.log("❌ Erro ao recarregar pedido atualizado:", error);
          throw error;
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
      // order_documents tem FK com ON DELETE CASCADE,
      // então ao deletar o pedido, os docs vão junto.
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
  // APPROVE ORDER
  // ----------------------------
  const approveOrder = useCallback(
    async (orderId: string, documentId: string) => {
      try {
        // 1. Marca o documento específico como aprovado
        const { error: docError } = await supabase
          .from("order_documents")
          .update({ approved: true })
          .eq("id", documentId)
          .eq("order_id", orderId);

        if (docError) {
          console.log("❌ Erro ao marcar documento como aprovado:", docError);
          throw docError;
        }

        // 2. Atualiza o status do pedido para aprovado
        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "orcamento_aprovado" })
          .eq("id", orderId);

        if (orderError) {
          console.log("❌ Erro ao aprovar pedido:", orderError);
          throw orderError;
        }

        // 3. Recarrega o pedido completo para ter os dados atualizados
        const { data, error: loadError } = await supabase
          .from("orders")
          .select(
            `
            id,
            name,
            description,
            order_date,
            status,
            equipment_id,
            created_at,
            cost_centers ( code ),
            equipments ( id, name ),
            order_documents ( id, type, file_url, file_name, mime_type, approved, created_at )
          `
          )
          .eq("id", orderId)
          .maybeSingle();

        if (loadError || !data) {
          console.log("❌ Erro ao recarregar pedido aprovado:", loadError);
          throw loadError;
        }

        const updated = mapRowToOrder(data);

        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? updated : o))
        );
      } catch (err) {
        console.log("❌ Erro em approveOrder:", err);
        throw err;
      }
    },
    []
  );

  // ----------------------------
  // REJECT ORDER
  // ----------------------------
  const rejectOrder = useCallback(
    async (orderId: string) => {
      try {
        const { error } = await supabase
          .from("orders")
          .update({ status: "orcamento_reprovado" })
          .eq("id", orderId);

        if (error) {
          console.log("❌ Erro ao reprovar pedido:", error);
          throw error;
        }

        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: "orcamento_reprovado" } : o
          )
        );
      } catch (err) {
        console.log("❌ Erro em rejectOrder:", err);
        throw err;
      }
    },
    []
  );

  // ----------------------------
  // FILTROS / BADGE
  // ----------------------------
  const getOrdersByCenter = useCallback(
    (center: CostCenter) => orders.filter((o) => o.costCenter === center),
    [orders]
  );

  const getAllOrders = useCallback(() => orders, [orders]);

  const markOrderAsRead = useCallback((id: string) => {
    console.log("📘 Pedido marcado como lido:", id);
    // Se quiser no futuro, dá pra persistir isso em uma tabela de notificações
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
    approveOrder,
    rejectOrder,
    getOrdersByCenter,
    getAllOrders,
    markOrderAsRead,
    refresh: loadOrders,
    getUnreadNotificationsCount,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

// Export que o app usa
export const OrderProvider = OrderProviderComponent;
// Alias, caso alguma parte do código ainda importe OrdersProvider
export { OrderProvider as OrdersProvider };

export default OrderProviderComponent;