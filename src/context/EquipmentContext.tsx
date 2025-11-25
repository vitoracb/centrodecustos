import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import { logger } from '@/src/lib/logger';
import { showSuccess, showError, showInfo } from '@/src/lib/toast';
import { CostCenter } from './CostCenterContext';

/**
 * Status do equipamento
 */
export type EquipmentStatus = 'ativo' | 'inativo';

/**
 * Modelo usado no app
 * (datas em string DD/MM/YYYY para a UI)
 */
export interface Equipment {
  id: string;
  name: string;
  brand: string;
  year: number;
  purchaseDate: string; // 'DD/MM/YYYY'
  nextReview: string; // 'DD/MM/YYYY' ou ''
  center: CostCenter; // 'valenca' | 'cna' | 'cabralia'
  status: EquipmentStatus;
  createdAt?: number;
  statusChangedAt?: number;
}

interface EquipmentContextType {
  equipments: Equipment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  addEquipment: (equipment: Omit<Equipment, 'id'>) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;

  getEquipmentsByCenter: (center: CostCenter) => Equipment[];
  getEquipmentById: (id: string) => Equipment | undefined;
  getAllEquipments: () => Equipment[];
}

export const EquipmentContext = createContext<EquipmentContextType | undefined>(
  undefined,
);

export const useEquipment = () => {
  const context = useContext(EquipmentContext);
  if (!context) {
    throw new Error('useEquipment must be used within an EquipmentProvider');
  }
  return context;
};

interface EquipmentProviderProps {
  children: ReactNode;
}

/**
 * Converte ISO '2025-11-24' -> '24/11/2025'
 */
const isoToBr = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Converte 'DD/MM/AAAA' -> 'AAAA-MM-DD'
 */
const brToIso = (br?: string | null): string | null => {
  if (!br) return null;
  const parts = br.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm}-${dd}`;
};

export const EquipmentProvider = ({ children }: EquipmentProviderProps) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega equipamentos do Supabase
   */
  const loadEquipments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('equipments')
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
          cost_centers (
            code
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Erro ao carregar equipments:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      const mapped: Equipment[] =
        data?.map((row: any) => {
          const costCenter = Array.isArray(row.cost_centers)
            ? row.cost_centers[0]
            : row.cost_centers;

          return {
            id: row.id,
            name: row.name,
            brand: row.brand ?? '',
            year: row.year ?? new Date().getFullYear(),
            purchaseDate: isoToBr(row.purchase_date),
            nextReview: isoToBr(row.next_review_date),
            center: (costCenter?.code ?? 'valenca') as CostCenter,
            status: row.active ? 'ativo' : 'inativo',
            createdAt: row.created_at
              ? new Date(row.created_at).getTime()
              : undefined,
          };
        }) ?? [];

      setEquipments(mapped);
    } catch (err: any) {
      logger.error('Erro inesperado ao carregar equipments:', err);
      setError(err.message ?? 'Erro inesperado ao carregar equipamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEquipments();
  }, [loadEquipments]);

  /**
   * Cria um novo equipamento no Supabase
   */
  const addEquipment = useCallback(
    async (equipment: Omit<Equipment, 'id'>) => {
      try {
        const costCenterCode = equipment.center;

        // Busca o cost_center.id pelo code
        const { data: ccData, error: ccError } = await supabase
          .from('cost_centers')
          .select('id, code')
          .eq('code', costCenterCode)
          .maybeSingle();

        if (ccError || !ccData) {
          logger.error('Erro ao buscar cost_center:', ccError);
          throw new Error(
            'Não foi possível encontrar o centro de custo selecionado',
          );
        }

        const insertPayload = {
          name: equipment.name,
          brand: equipment.brand,
          year: equipment.year,
          purchase_date: brToIso(equipment.purchaseDate),
          next_review_date: brToIso(equipment.nextReview),
          active: equipment.status === 'ativo',
          cost_center_id: ccData.id,
        };

        const { data, error } = await supabase
          .from('equipments')
          .insert(insertPayload)
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
          `,
          )
          .maybeSingle();

        if (error) {
          logger.error('Erro ao inserir equipamento:', error);
          showError('Erro ao salvar equipamento', 'Tente novamente');
          throw error;
        }

        if (!data) {
          const errMsg = 'Resposta inválida ao criar equipamento';
          logger.error(errMsg);
          showError('Erro ao salvar equipamento', errMsg);
          throw new Error(errMsg);
        }

        const costCenter = Array.isArray(data.cost_centers)
          ? data.cost_centers[0]
          : data.cost_centers;

        const newEquipment: Equipment = {
          id: data.id,
          name: data.name,
          brand: data.brand ?? '',
          year: data.year ?? new Date().getFullYear(),
          purchaseDate: isoToBr(data.purchase_date),
          nextReview: isoToBr(data.next_review_date),
          center: (costCenter?.code ?? costCenterCode) as CostCenter,
          status: data.active ? 'ativo' : 'inativo',
          createdAt: data.created_at
            ? new Date(data.created_at).getTime()
            : Date.now(),
        };

        setEquipments(prev => [newEquipment, ...prev]);
        showSuccess('Equipamento adicionado', newEquipment.name);
      } catch (err: any) {
        logger.error('Erro em addEquipment:', err);
        throw err;
      }
    },
    [],
  );

  /**
   * Atualiza um equipamento no Supabase
   */
  const updateEquipment = useCallback(
    async (id: string, updates: Partial<Equipment>) => {
      try {
        const existing = equipments.find(eq => eq.id === id);
        if (!existing) {
          throw new Error('Equipamento não encontrado para atualização');
        }

        let costCenterId: string | undefined;

        if (updates.center) {
          const { data: ccData, error: ccError } = await supabase
            .from('cost_centers')
            .select('id, code')
            .eq('code', updates.center)
            .maybeSingle();

          if (ccError || !ccData) {
            console.log('❌ Erro ao buscar cost_center para update:', ccError);
            throw new Error(
              'Não foi possível encontrar o centro de custo selecionado',
            );
          }
          costCenterId = ccData.id;
        }

        const payload: any = {};

        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.brand !== undefined) payload.brand = updates.brand;
        if (updates.year !== undefined) payload.year = updates.year;
        if (updates.purchaseDate !== undefined)
          payload.purchase_date = brToIso(updates.purchaseDate);
        if (updates.nextReview !== undefined)
          payload.next_review_date = brToIso(updates.nextReview);
        if (updates.status !== undefined)
          payload.active = updates.status === 'ativo';
        if (costCenterId) payload.cost_center_id = costCenterId;

        if (Object.keys(payload).length === 0) {
          return;
        }

        const { error } = await supabase
          .from('equipments')
          .update(payload)
          .eq('id', id);

        if (error) {
          logger.error('Erro ao atualizar equipamento:', error);
          showError('Erro ao atualizar equipamento', 'Tente novamente');
          throw error;
        }

        const equipmentName = existing?.name || '';
        setEquipments(prev =>
          prev.map(eq => {
            if (eq.id !== id) return eq;

            const merged: Equipment = {
              ...eq,
              ...updates,
            };

            // controla statusChangedAt
            if (updates.status === 'inativo' && eq.status === 'ativo') {
              merged.statusChangedAt = Date.now();
              showInfo('Equipamento inativado', equipmentName);
            }
            if (updates.status === 'ativo' && eq.status === 'inativo') {
              const { statusChangedAt, ...rest } = merged;
              showInfo('Equipamento ativado', equipmentName);
              return rest;
            }

            return merged;
          }),
        );
        showSuccess('Equipamento atualizado', equipmentName);
      } catch (err: any) {
        logger.error('Erro em updateEquipment:', err);
        throw err;
      }
    },
    [equipments],
  );

  /**
   * Deleta um equipamento
   */
  const deleteEquipment = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from('equipments')
          .delete()
          .eq('id', id);

        if (error) {
          logger.error('Erro ao deletar equipamento:', error);
          showError('Erro ao excluir equipamento', 'Tente novamente');
          throw error;
        }

        const deletedEquipment = equipments.find(eq => eq.id === id);
        setEquipments(prev => prev.filter(eq => eq.id !== id));
        showSuccess('Equipamento excluído', deletedEquipment?.name || '');
      } catch (err: any) {
        logger.error('Erro em deleteEquipment:', err);
        throw err;
      }
    },
    [equipments],
  );

  const getEquipmentsByCenter = useCallback(
    (center: CostCenter) => equipments.filter(eq => eq.center === center),
    [equipments],
  );

  const getEquipmentById = useCallback(
    (id: string) => equipments.find(eq => eq.id === id),
    [equipments],
  );

  const getAllEquipments = useCallback(() => equipments, [equipments]);

  const value: EquipmentContextType = {
    equipments,
    loading,
    error,
    refresh: loadEquipments,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    getEquipmentsByCenter,
    getEquipmentById,
    getAllEquipments,
  };

  return (
    <EquipmentContext.Provider value={value}>
      {children}
    </EquipmentContext.Provider>
  );
};