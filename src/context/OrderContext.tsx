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
import { useAuth } from "./AuthContext";
import { cacheManager } from "@/src/lib/cacheManager";
import { pushEvents } from "@/src/lib/pushEvents";
import { logAuditEvent } from "@/src/lib/auditLogger";

// ============================
// TIPOS
// ============================

export type OrderStatus =
  | "orcamento_solicitado"

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

  "orcamento_enviado",
  "orcamento_aprovado",
  "orcamento_reprovado",
  "em_execucao",
  "finalizado",
];

const normalizeStatus = (status?: string | null): OrderStatus => {
  if (!status) return "orcamento_solicitado";

  const cleaned = status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/[^a-z_]/g, "");

  const match = allowedStatuses.find((item) => item === cleaned);
  return match ?? "orcamento_solicitado";
};

// ============================
// MAPEAMENTO ROW -> ORDER
// ============================

// Helper para buscar nome do equipamento
const fetchEquipmentName = async (equipmentId: string): Promise<string | undefined> => {
  const { data } = await supabase
    .from('equipments')
    .select('name')
    .eq('id', equipmentId)
    .maybeSingle();
  return data?.name;
};

const mapRowToOrder = (row: any): Order => {
  const orderDate = isoToBr(row.order_date);
  const normalizedStatus = normalizeStatus(row.status);

  // Suporta tanto 'equipment' (novo) quanto 'equipments' (antigo) para compatibilidade
  const equipmentSource = row.equipment || (Array.isArray(row.equipments)
    ? row.equipments[0]
    : row.equipments);

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
    costCenter: (row.cost_center_id ?? "valenca") as CostCenter,
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
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------
  // LOAD ORDERS
  // ----------------------------
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const cacheKey = `orders:${user.id}`;

    try {
      console.log("[Orders] 📦 Tentando carregar pedidos do cache...");
      const cached = await cacheManager.get<Order[]>(cacheKey);
      if (cached && cached.length > 0) {
        console.log(`[Orders] ✅ ${cached.length} pedidos carregados do cache`);
        setOrders(cached);
      }

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
          cost_center_id,
          order_documents ( id, type, file_url, file_name, mime_type, approved, created_at )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.log("❌ Erro ao carregar pedidos:", error);
        setError(error.message);
        return;
      }

      let mapped: Order[] = data?.map(mapRowToOrder) ?? [];

      // Buscar nomes dos equipamentos para pedidos que têm equipment_id
      const equipmentIds = [...new Set(mapped.map(o => o.equipmentId).filter(Boolean))];
      if (equipmentIds.length > 0) {
        const { data: equipmentsData } = await supabase
          .from('equipments')
          .select('id, name')
          .in('id', equipmentIds);

        if (equipmentsData) {
          const equipmentMap = new Map(equipmentsData.map(e => [e.id, e.name]));
          mapped = mapped.map(order => ({
            ...order,
            equipmentName: order.equipmentId ? equipmentMap.get(order.equipmentId) : undefined
          }));
        }
      }

      setOrders(mapped);
      await cacheManager.set(cacheKey, mapped);
      console.log("[Orders] 💾 Cache de pedidos atualizado");
    } catch (e: any) {
      console.log("❌ Erro inesperado ao carregar pedidos:", e);
      setError(e.message ?? "Erro inesperado ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, [user]);

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
        if (!user) {
          throw new Error("Usuário não autenticado");
        }
        const cacheKey = `orders:${user.id}`;
        console.log("📦 Salvando pedido:", order);

        const payload = {
          name: order.name,
          description: order.description,
          order_date: brToIso(order.orderDate),
          status: order.status,
          cost_center_id: order.costCenter,
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
            cost_center_id,
            order_documents ( id, type, file_url, file_name, mime_type, approved, created_at )
          `
          )
          .maybeSingle();

        if (error || !data) {
          console.log("❌ Erro ao criar pedido:", error);
          throw error;
        }

        let newOrder: Order = mapRowToOrder({
          ...data,
          cost_center_id: data.cost_center_id ?? order.costCenter,
        });

        // Buscar nome do equipamento se houver equipment_id
        if (newOrder.equipmentId && !newOrder.equipmentName) {
          const equipmentName = await fetchEquipmentName(newOrder.equipmentId);
          newOrder = { ...newOrder, equipmentName };
        }

        setOrders((prev) => {
          const next = [newOrder, ...prev];
          cacheManager.set(cacheKey, next).catch(() => { });
          return next;
        });

        // Audit logging para operação crítica
        if (user?.id) {
          await logAuditEvent({
            userId: user.id,
            action: 'CREATE',
            entity: 'ORDER',
            entityId: newOrder.id,
            costCenterId: order.costCenter,
            newValues: newOrder,
            metadata: {
              timestamp: new Date().toISOString(),
            }
          }).catch(err => {
            console.warn('[Audit] Erro ao registrar criação de pedido:', err);
          });
        }
      } catch (err) {
        console.log("❌ Erro em addOrder:", err);
        throw err;
      }
    },
    [user],
  );

  // ----------------------------
  // UPDATE ORDER (inclui upload de documentos)
  // ----------------------------
  const updateOrder = useCallback(
    async (order: Order) => {
      try {
        if (!user) {
          throw new Error("Usuário não autenticado");
        }
        const cacheKey = `orders:${user.id}`;
        const existing = orders.find((o) => o.id === order.id);

        // 1) Atualiza os campos básicos do pedido
        const payload: any = {
          name: order.name,
          description: order.description,
          order_date: brToIso(order.orderDate || order.date),
          status: order.status,
          cost_center_id: order.costCenter,
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
            "order-documents"
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
            cost_center_id,
            order_documents ( id, type, file_url, file_name, mime_type, approved, created_at )
          `
          )
          .eq("id", order.id)
          .maybeSingle();

        if (error || !data) {
          console.log("❌ Erro ao recarregar pedido atualizado:", error);
          throw error;
        }

        let updated = mapRowToOrder(data);

        // Buscar nome do equipamento se houver equipment_id
        if (updated.equipmentId && !updated.equipmentName) {
          const equipmentName = await fetchEquipmentName(updated.equipmentId);
          updated = { ...updated, equipmentName };
        }

        setOrders((prev) => {
          const next = prev.map((o) => (o.id === order.id ? updated : o));
          cacheManager.set(cacheKey, next).catch(() => { });
          return next;
        });

        // Audit logging para operação crítica
        if (user?.id) {
          const oldOrder = orders.find(o => o.id === order.id);

          await logAuditEvent({
            userId: user.id,
            action: 'UPDATE',
            entity: 'ORDER',
            entityId: order.id,
            costCenterId: order.costCenter,
            oldValues: oldOrder,
            newValues: updated,
            metadata: {
              timestamp: new Date().toISOString(),
            }
          }).catch(err => {
            console.warn('[Audit] Erro ao registrar atualização de pedido:', err);
          });
        }
      } catch (err) {
        console.log("❌ Erro em updateOrder:", err);
        throw err;
      }
    },
    [orders, user]
  );

  // ----------------------------
  // DELETE ORDER
  // ----------------------------
  const deleteOrder = useCallback(async (id: string) => {
    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      const cacheKey = `orders:${user.id}`;
      const { error: docsError } = await supabase
        .from("order_documents")
        .delete()
        .eq("order_id", id);

      if (docsError && docsError.code !== "PGRST205") {
        console.log("⚠️ Erro ao deletar documentos do pedido:", docsError);
      }

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (error) {
        console.log("❌ Erro ao deletar pedido:", error);
        throw error;
      }
      setOrders((prev) => {
        const next = prev.filter((o) => o.id !== id);
        cacheManager.set(cacheKey, next).catch(() => { });
        return next;
      });
    } catch (err) {
      console.log("❌ Erro em deleteOrder:", err);
      throw err;
    }
  }, [user]);

  // ----------------------------
  // APPROVE ORDER
  // ----------------------------
  const approveOrder = useCallback(
    async (orderId: string, documentId: string) => {
      try {
        if (!user) {
          throw new Error("Usuário não autenticado");
        }
        const cacheKey = `orders:${user.id}`;
        const { error: docError } = await supabase
          .from("order_documents")
          .update({ approved: true })
          .eq("id", documentId)
          .eq("order_id", orderId);

        if (docError) {
          console.log("❌ Erro ao marcar documento como aprovado:", docError);
          throw docError;
        }

        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "orcamento_aprovado" })
          .eq("id", orderId);

        if (orderError) {
          console.log("❌ Erro ao aprovar pedido:", orderError);
          throw orderError;
        }

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
            cost_center_id,
            order_documents ( id, type, file_url, file_name, mime_type, approved, created_at )
          `
          )
          .eq("id", orderId)
          .maybeSingle();

        if (loadError || !data) {
          console.log("❌ Erro ao recarregar pedido aprovado:", loadError);
          throw loadError;
        }

        let updated = mapRowToOrder(data);

        // Buscar nome do equipamento se houver equipment_id
        if (updated.equipmentId && !updated.equipmentName) {
          const equipmentName = await fetchEquipmentName(updated.equipmentId);
          updated = { ...updated, equipmentName };
        }

        setOrders((prev) => {
          const next = prev.map((o) => (o.id === orderId ? updated : o));
          cacheManager.set(cacheKey, next).catch(() => { });
          return next;
        });

        // Envia notificação push para admins/editores
        pushEvents.notifyBudgetApproved(updated.name, updated.costCenter);
      } catch (err) {
        console.log("❌ Erro em approveOrder:", err);
        throw err;
      }
    },
    [user]
  );

  // ----------------------------
  // REJECT ORDER
  // ----------------------------
  const rejectOrder = useCallback(
    async (orderId: string) => {
      try {
        if (!user) {
          throw new Error("Usuário não autenticado");
        }
        const cacheKey = `orders:${user.id}`;
        const { error } = await supabase
          .from("orders")
          .update({ status: "orcamento_reprovado" })
          .eq("id", orderId);

        if (error) {
          console.log("❌ Erro ao reprovar pedido:", error);
          throw error;
        }
        setOrders((prev) => {
          const next = prev.map((o) =>
            o.id === orderId
              ? { ...o, status: "orcamento_reprovado" as OrderStatus }
              : o
          );
          cacheManager.set(cacheKey, next).catch(() => { });
          return next;
        });

        // Envia notificação push para admins/editores
        const order = orders.find((o) => o.id === orderId);
        if (order) {
          pushEvents.notifyBudgetRejected(order.name, order.costCenter);
        }
      } catch (err) {
        console.log("❌ Erro em rejectOrder:", err);
        throw err;
      }
    },
    [user]
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
    return orders.filter((o) => o.status === "orcamento_solicitado").length;
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