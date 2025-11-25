import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { CostCenter } from "./CostCenterContext";
import { supabase } from "@/src/lib/supabaseClient";

export type EquipmentStatus = "ativo" | "inativo";

export interface Equipment {
  id: string;
  name: string;
  brand: string;
  year: number;
  purchaseDate: string;
  nextReview: string;
  center: CostCenter;
  status: EquipmentStatus;
  createdAt?: number;
  statusChangedAt?: number;
}

interface EquipmentContextType {
  equipments: Equipment[];
  addEquipment: (equipment: Omit<Equipment, "id">) => void;
  updateEquipment: (id: string, equipment: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;
  getEquipmentsByCenter: (center: CostCenter) => Equipment[];
  getEquipmentById: (id: string) => Equipment | undefined;
  getAllEquipments: () => Equipment[];
}

const EquipmentContext = createContext<EquipmentContextType | undefined>(
  undefined
);

export const useEquipment = () => {
  const context = useContext(EquipmentContext);
  if (!context) {
    throw new Error("useEquipment must be used within EquipmentProvider");
  }
  return context;
};

interface EquipmentProviderProps {
  children: ReactNode;
}

export const EquipmentProvider = ({ children }: EquipmentProviderProps) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  // ============================================================
  // LOAD FROM SUPABASE
  // ============================================================
  useEffect(() => {
    async function loadEquipments() {
      console.log("🔌 Carregando equipamentos do Supabase...");

      const { data, error } = await supabase
        .from("equipments")
        .select(
          `
          id,
          name,
          brand,
          year,
          purchase_date,
          next_review_date,
          active,
          created_at,
          cost_centers ( code )
        `
        )
        .order("name", { ascending: true });

      if (error) {
        console.log("❌ Erro ao carregar equipamentos:", error);
        return;
      }

      console.log("📦 Equipamentos carregados:", data);

      const mapped: Equipment[] = (data ?? []).map((row: any) => {
        const rawCostCenter = Array.isArray(row.cost_centers)
          ? row.cost_centers[0]
          : row.cost_centers;
        const centerCode = (rawCostCenter?.code ?? "valenca") as CostCenter;

        return {
          id: row.id,
          name: row.name,
          brand: row.brand ?? "",
          year: row.year ?? 0,
          purchaseDate: row.purchase_date
            ? new Date(row.purchase_date).toLocaleDateString("pt-BR")
            : "",
          nextReview: row.next_review_date
            ? new Date(row.next_review_date).toLocaleDateString("pt-BR")
            : "",
          center: centerCode,
          status: row.active ? "ativo" : "inativo",
          createdAt: row.created_at
            ? new Date(row.created_at).getTime()
            : undefined,
          statusChangedAt: undefined,
        };
      });

      setEquipments(mapped);
    }

    loadEquipments();
  }, []);

  // helper de data dd/MM/yyyy -> YYYY-MM-DD
  const toDbDate = (value?: string): string | null => {
    if (!value) return null;
    const [d, m, y] = value.split("/");
    if (!d || !m || !y) return null;
    return `${y}-${m}-${d}`;
  };

  // ============================================================
  // CREATE — SALVAR NO SUPABASE
  // ============================================================
  const addEquipment = (equipment: Omit<Equipment, "id">) => {
    (async () => {
      try {
        const { data: ccData, error: ccError } = await supabase
          .from("cost_centers")
          .select("id, code")
          .eq("code", equipment.center)
          .maybeSingle();

        if (ccError || !ccData) {
          console.log(
            "❌ Erro ao buscar centro de custo:",
            ccError || "não encontrado"
          );
          return;
        }

        const purchaseDateDb = toDbDate(equipment.purchaseDate);
        const nextReviewDb = toDbDate(equipment.nextReview);

        const payload = {
          name: equipment.name,
          brand: equipment.brand,
          year: equipment.year,
          purchase_date: purchaseDateDb,
          next_review_date: nextReviewDb,
          cost_center_id: ccData.id,
          active: equipment.status === "ativo",
        };

        const { data, error } = await supabase
          .from("equipments")
          .insert(payload)
          .select(
            `
            id,
            name,
            brand,
            year,
            purchase_date,
            next_review_date,
            active,
            created_at,
            cost_centers ( code )
          `
          )
          .single();

        if (error || !data) {
          console.log("❌ Erro ao criar equipamento:", error);
          return;
        }

        const rawCostCenter = Array.isArray(data.cost_centers)
          ? data.cost_centers[0]
          : data.cost_centers;
        const centerCode = (rawCostCenter?.code ?? equipment.center) as CostCenter;

        const newEquipment: Equipment = {
          id: data.id,
          name: data.name,
          brand: data.brand ?? "",
          year: data.year ?? 0,
          purchaseDate: data.purchase_date
            ? new Date(data.purchase_date).toLocaleDateString("pt-BR")
            : "",
          nextReview: data.next_review_date
            ? new Date(data.next_review_date).toLocaleDateString("pt-BR")
            : "",
          center: centerCode,
          status: data.active ? "ativo" : "inativo",
          createdAt: data.created_at
            ? new Date(data.created_at).getTime()
            : Date.now(),
          statusChangedAt: undefined,
        };

        setEquipments((prev) => [newEquipment, ...prev]);
      } catch (err) {
        console.log("❌ Erro inesperado ao criar equipamento:", err);
      }
    })();
  };

  // ============================================================
  // UPDATE — ATUALIZA TAMBÉM NO SUPABASE
  // ============================================================
  const updateEquipment = (id: string, updates: Partial<Equipment>) => {
    (async () => {
      try {
        const existing = equipments.find((eq) => eq.id === id);
        if (!existing) {
          console.log("⚠️ Equipamento não encontrado para update:", id);
          return;
        }

        const centerCode = (updates.center ?? existing.center) as CostCenter;

        const { data: ccData, error: ccError } = await supabase
          .from("cost_centers")
          .select("id, code")
          .eq("code", centerCode)
          .maybeSingle();

        if (ccError || !ccData) {
          console.log(
            "❌ Erro ao buscar centro de custo no update:",
            ccError || "não encontrado"
          );
          return;
        }

        const payload: any = {
          cost_center_id: ccData.id,
        };

        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.brand !== undefined) payload.brand = updates.brand;
        if (updates.year !== undefined) payload.year = updates.year;
        if (updates.purchaseDate !== undefined) {
          payload.purchase_date = toDbDate(updates.purchaseDate) ?? null;
        }
        if (updates.nextReview !== undefined) {
          payload.next_review_date = toDbDate(updates.nextReview) ?? null;
        }
        if (updates.status !== undefined) {
          payload.active = updates.status === "ativo";
        }

        const { data, error } = await supabase
          .from("equipments")
          .update(payload)
          .eq("id", id)
          .select(
            `
            id,
            name,
            brand,
            year,
            purchase_date,
            next_review_date,
            active,
            created_at,
            cost_centers ( code )
          `
          )
          .single();

        if (error || !data) {
          console.log("❌ Erro ao atualizar equipamento:", error);
          return;
        }

        const rawCostCenter = Array.isArray(data.cost_centers)
          ? data.cost_centers[0]
          : data.cost_centers;
        const updatedCenterCode = (rawCostCenter?.code ?? centerCode) as CostCenter;

        const updated: Equipment = {
          id: data.id,
          name: data.name,
          brand: data.brand ?? "",
          year: data.year ?? 0,
          purchaseDate: data.purchase_date
            ? new Date(data.purchase_date).toLocaleDateString("pt-BR")
            : "",
          nextReview: data.next_review_date
            ? new Date(data.next_review_date).toLocaleDateString("pt-BR")
            : "",
          center: updatedCenterCode,
          status: data.active ? "ativo" : "inativo",
          createdAt: data.created_at
            ? new Date(data.created_at).getTime()
            : existing.createdAt,
          statusChangedAt: existing.statusChangedAt,
        };

        setEquipments((prev) => {
          return prev.map((eq) => {
            if (eq.id === id) {
              if (updated.status === "inativo" && eq.status === "ativo") {
                return {
                  ...updated,
                  statusChangedAt: Date.now(),
                };
              }
              if (updated.status === "ativo" && eq.status === "inativo") {
                return {
                  ...updated,
                  statusChangedAt: undefined,
                };
              }
              return updated;
            }
            return eq;
          });
        });
      } catch (err) {
        console.log("❌ Erro inesperado no update de equipamento:", err);
      }
    })();
  };

  // ============================================================
  // DELETE — AGORA APAGA NO SUPABASE TAMBÉM
  // ============================================================
  const deleteEquipment = (id: string) => {
    (async () => {
      try {
        const { error } = await supabase
          .from("equipments")
          .delete()
          .eq("id", id);

        if (error) {
          console.log("❌ Erro ao deletar equipamento:", error);
          return;
        }

        setEquipments((prev) => prev.filter((eq) => eq.id !== id));
      } catch (err) {
        console.log("❌ Erro inesperado ao deletar equipamento:", err);
      }
    })();
  };

  const getEquipmentsByCenter = (center: CostCenter) =>
    equipments.filter((eq) => eq.center === center);

  const getEquipmentById = (id: string) =>
    equipments.find((eq) => eq.id === id);

  const getAllEquipments = () => equipments;

  return (
    <EquipmentContext.Provider
      value={{
        equipments,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      getEquipmentsByCenter,
      getEquipmentById,
      getAllEquipments,
      }}
    >
      {children}
    </EquipmentContext.Provider>
  );
};