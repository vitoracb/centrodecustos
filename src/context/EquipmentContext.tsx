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
import { scheduleRevisionNotification } from '@/src/lib/revisionNotifications';

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
  nextReview: string; // 'DD/MM/YYYY' ou '' (DEPRECADO - manter para compatibilidade)
  center: CostCenter; // 'valenca' | 'cna' | 'cabralia'
  status: EquipmentStatus;
  createdAt?: number;
  statusChangedAt?: number;
  deletedAt?: number; // Timestamp quando foi deletado (soft delete)
  
  // ✅ NOVOS CAMPOS: Sistema de revisão por horas (campo personalizável)
  currentHours: number;              // Horas trabalhadas atuais
  hoursUntilRevision: number;        // Quantas horas faltam para revisão (campo personalizável)
  
  // Campo calculado (não salvo no banco):
  // nextRevisionHours = currentHours + hoursUntilRevision
}

interface EquipmentContextType {
  equipments: Equipment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  addEquipment: (equipment: Omit<Equipment, 'id'>) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  updateEquipmentHours: (equipmentId: string, newCurrentHours: number, newHoursUntilRevision?: number) => Promise<void>; // ✅ NOVO

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
          deleted_at,
          cost_center_id,
          current_hours,
          hours_until_revision
        `,
        )
        .is('deleted_at', null) // Filtra apenas equipamentos não deletados
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Erro ao carregar equipments:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      const mapped: Equipment[] = (data ?? []).map((row: any) => {
        const currentHours = row.current_hours ?? 0;
        const hoursUntilRevision = row.hours_until_revision ?? 250;
        
        const equipment = {
          id: row.id,
          name: row.name,
          brand: row.brand ?? '',
          year: row.year ?? new Date().getFullYear(),
          purchaseDate: isoToBr(row.purchase_date),
          nextReview: isoToBr(row.next_review_date),
          center: (row.cost_center_id ?? 'valenca') as CostCenter,
          status: (row.active ? 'ativo' : 'inativo') as 'ativo' | 'inativo',
          createdAt: row.created_at
            ? new Date(row.created_at).getTime()
            : undefined,
          deletedAt: row.deleted_at
            ? new Date(row.deleted_at).getTime()
            : undefined,
          // ✅ NOVOS CAMPOS
          currentHours,
          hoursUntilRevision,
        };
        
        console.log(`📦 Equipamento mapeado:`, {
          id: equipment.id,
          name: equipment.name,
          center: equipment.center,
          costCenterCode: row.costCenterCode,
          cost_center_id: row.cost_center_id,
          cost_centers_raw: row.cost_centers,
          deletedAt: equipment.deletedAt
        });
        
        return equipment;
      });

      console.log(`📦 Total de equipamentos carregados do banco:`, data?.length || 0);
      console.log(`📦 Total de equipamentos mapeados:`, mapped.length);
      console.log(`📦 Equipamentos por centro:`, {
        valenca: mapped.filter(eq => eq.center === 'valenca' && !eq.deletedAt).length,
        cna: mapped.filter(eq => eq.center === 'cna' && !eq.deletedAt).length,
        cabralia: mapped.filter(eq => eq.center === 'cabralia' && !eq.deletedAt).length,
        deletados: mapped.filter(eq => eq.deletedAt).length,
      });

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
        const insertPayload = {
          name: equipment.name,
          brand: equipment.brand,
          year: equipment.year,
          purchase_date: brToIso(equipment.purchaseDate),
          next_review_date: brToIso(equipment.nextReview),
          active: equipment.status === 'ativo',
          cost_center_id: costCenterCode,
          // ✅ NOVOS CAMPOS
          current_hours: equipment.currentHours ?? 0,
          hours_until_revision: equipment.hoursUntilRevision ?? 250,
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
            current_hours,
            hours_until_revision,
            cost_center_id
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

        const currentHours = data.current_hours ?? 0;
        const hoursUntilRevision = data.hours_until_revision ?? 250;
        
        const newEquipment: Equipment = {
          id: data.id,
          name: data.name,
          brand: data.brand ?? '',
          year: data.year ?? new Date().getFullYear(),
          purchaseDate: isoToBr(data.purchase_date),
          nextReview: isoToBr(data.next_review_date),
          center: (data.cost_center_id ?? costCenterCode) as CostCenter,
          status: data.active ? 'ativo' : 'inativo',
          createdAt: data.created_at
            ? new Date(data.created_at).getTime()
            : Date.now(),
          // ✅ NOVOS CAMPOS
          currentHours,
          hoursUntilRevision,
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
        if (updates.center !== undefined) payload.cost_center_id = updates.center;
        // ✅ NOVOS CAMPOS
        if (updates.currentHours !== undefined) payload.current_hours = updates.currentHours;
        if (updates.hoursUntilRevision !== undefined) payload.hours_until_revision = updates.hoursUntilRevision;

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
              merged.statusChangedAt = Date.now();
              showInfo('Equipamento ativado', equipmentName);
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
        const deletedEquipment = equipments.find(eq => eq.id === id);
        
        // Soft delete: marca como deletado ao invés de remover
        const deletedAt = new Date().toISOString();
        const { error } = await supabase
          .from('equipments')
          .update({ deleted_at: deletedAt })
          .eq('id', id);

        if (error) {
          logger.error('Erro ao deletar equipamento:', error);
          showError('Erro ao excluir equipamento', 'Tente novamente');
          throw error;
        }

        // Atualiza o estado marcando como deletado
        setEquipments(prev => prev.map(eq => 
          eq.id === id 
            ? { ...eq, deletedAt: new Date(deletedAt).getTime() }
            : eq
        ));
        
        showSuccess('Equipamento excluído', deletedEquipment?.name || '');
        
        // Recarrega os equipamentos para garantir sincronização
        await loadEquipments();
      } catch (err: any) {
        logger.error('Erro em deleteEquipment:', err);
        throw err;
      }
    },
    [equipments, loadEquipments],
  );

  const getEquipmentsByCenter = useCallback(
    (center: CostCenter) => equipments.filter(eq => eq.center === center && !eq.deletedAt),
    [equipments],
  );

  const getEquipmentById = useCallback(
    (id: string) => equipments.find(eq => eq.id === id),
    [equipments],
  );

  const getAllEquipments = useCallback(() => equipments, [equipments]);

  /**
   * Atualiza as horas trabalhadas de um equipamento
   * Se newHoursUntilRevision não for fornecido, calcula automaticamente descontando as horas trabalhadas
   */
  const updateEquipmentHours = useCallback(
    async (equipmentId: string, newCurrentHours: number, newHoursUntilRevision?: number) => {
      try {
        const equipment = equipments.find(e => e.id === equipmentId);
        if (!equipment) {
          logger.error('Equipamento não encontrado');
          showError('Erro', 'Equipamento não encontrado');
          return;
        }

        // Validação: horas não podem diminuir
        if (newCurrentHours < equipment.currentHours) {
          showError('Erro', 'As horas não podem diminuir');
          return;
        }

        let finalHoursUntilRevision: number;
        
        // Se newHoursUntilRevision foi fornecido, usa esse valor
        // Caso contrário, calcula automaticamente descontando as horas trabalhadas
        if (newHoursUntilRevision !== undefined) {
          finalHoursUntilRevision = newHoursUntilRevision;
          logger.info(`🔧 ${equipment.name}:`);
          logger.info(`   Horas atuais: ${newCurrentHours}h`);
          logger.info(`   Horas até revisão (definido manualmente): ${finalHoursUntilRevision}h`);
        } else {
          // Calcula quantas horas foram trabalhadas
          const hoursWorked = newCurrentHours - equipment.currentHours;
          
          // Desconta das horas até revisão
          finalHoursUntilRevision = Math.max(0, equipment.hoursUntilRevision - hoursWorked);
          
          logger.info(`🔧 ${equipment.name}:`);
          logger.info(`   Horas trabalhadas: +${hoursWorked}h`);
          logger.info(`   Faltam para revisão (calculado): ${finalHoursUntilRevision}h`);
        }
        
        let updateData: any = {
          current_hours: newCurrentHours,
          hours_until_revision: finalHoursUntilRevision,
        };

        const { data, error } = await supabase
          .from('equipments')
          .update(updateData)
          .eq('id', equipmentId)
          .select(
            `
            id, name, brand, year, purchase_date, next_review_date, active, created_at, deleted_at,
            current_hours, hours_until_revision,
            cost_center_id
          `
          )
          .single();

        if (error || !data) {
          logger.error('Erro ao atualizar horas:', error);
          showError('Erro ao atualizar horas', 'Tente novamente');
          return;
        }

        const costCenterCode = data.cost_center_id ?? 'valenca';
        const currentHours = data.current_hours ?? 0;
        const hoursUntilRevision = data.hours_until_revision ?? 250;

        const updated: Equipment = {
          id: data.id,
          name: data.name,
          brand: data.brand ?? '',
          year: data.year ?? new Date().getFullYear(),
          purchaseDate: isoToBr(data.purchase_date),
          nextReview: isoToBr(data.next_review_date),
          center: (costCenterCode ?? 'valenca') as CostCenter,
          status: data.active ? 'ativo' : 'inativo',
          createdAt: data.created_at
            ? new Date(data.created_at).getTime()
            : undefined,
          deletedAt: data.deleted_at
            ? new Date(data.deleted_at).getTime()
            : undefined,
          currentHours,
          hoursUntilRevision,
        };

        setEquipments(prev => prev.map(e => e.id === equipmentId ? updated : e));
        
        logger.info(`✅ Horas atualizadas: ${equipment.name} - ${newCurrentHours}h`);
        showSuccess('Horas atualizadas', `${equipment.name}: ${newCurrentHours.toLocaleString()}h`);
        
        // Verifica se precisa notificar
        checkRevisionNotification(updated);
        
      } catch (e: any) {
        logger.error('Erro ao atualizar horas:', e);
        showError('Erro ao atualizar horas', e.message || 'Tente novamente');
      }
    },
    [equipments],
  );

  /**
   * Verifica se o equipamento precisa de notificação de revisão
   */
  const checkRevisionNotification = useCallback(async (equipment: Equipment) => {
    // Agenda notificação push
    await scheduleRevisionNotification(equipment);
    
    // Mostra toast se faltar 50h ou menos
    if (equipment.hoursUntilRevision <= 50 && equipment.hoursUntilRevision > 0) {
      logger.info(`🔔 NOTIFICAÇÃO: ${equipment.name} precisa de revisão em ${equipment.hoursUntilRevision}h`);
      showInfo('Revisão Próxima', `${equipment.name} precisa de revisão em ${equipment.hoursUntilRevision}h`);
    }
    
    // Mostra toast se já passou da revisão
    if (equipment.hoursUntilRevision <= 0) {
      logger.warn(`⚠️ ALERTA: ${equipment.name} PRECISA DE REVISÃO URGENTE!`);
      showError('Revisão Atrasada', `${equipment.name} precisa de revisão urgente!`);
    }
  }, []);

  const value: EquipmentContextType = {
    equipments,
    loading,
    error,
    refresh: loadEquipments,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    updateEquipmentHours, // ✅ NOVO
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