import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import { logger } from '@/src/lib/logger';

export type CostCenter = string;

export interface CostCenterData {
  id: string;
  code: string;
  name: string;
  createdAt?: string;
}

interface CostCenterContextType {
  selectedCenter: CostCenter;
  setSelectedCenter: (center: CostCenter) => void;
  costCenters: CostCenterData[];
  loading: boolean;
  addCostCenter: (name: string, code: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CostCenterContext = createContext<CostCenterContextType | undefined>(
  undefined
);

export const useCostCenter = () => {
  const context = useContext(CostCenterContext);
  if (!context) {
    throw new Error('useCostCenter must be used within CostCenterProvider');
  }
  return context;
};

interface CostCenterProviderProps {
  children: ReactNode;
}

export const CostCenterProvider = ({ children }: CostCenterProviderProps) => {
  const [selectedCenter, setSelectedCenter] = useState<CostCenter>('valenca');
  const [costCenters, setCostCenters] = useState<CostCenterData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCostCenters = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, code, name, created_at')
        .order('name', { ascending: true });

      if (error) {
        logger.error('Erro ao carregar centros de custo:', error);
        // Fallback para centros padrão se houver erro
        const defaultCenters: CostCenterData[] = [
          { id: '1', code: 'valenca', name: 'Valença' },
          { id: '2', code: 'cna', name: 'CNA' },
          { id: '3', code: 'cabralia', name: 'Cabrália' },
        ];
        setCostCenters(defaultCenters);
        return;
      }

      if (data && data.length > 0) {
        const mappedCenters: CostCenterData[] = data.map((cc: any) => ({
          id: cc.id,
          code: cc.code,
          name: cc.name || cc.code,
          createdAt: cc.created_at,
        }));
        setCostCenters(mappedCenters);
        
        // Se o centro selecionado não existe mais, seleciona o primeiro
        const currentExists = mappedCenters.some(cc => cc.code === selectedCenter);
        if (!currentExists && mappedCenters.length > 0) {
          setSelectedCenter(mappedCenters[0].code);
        }
      } else {
        // Se não houver centros no banco, usa os padrão
        const defaultCenters: CostCenterData[] = [
          { id: '1', code: 'valenca', name: 'Valença' },
          { id: '2', code: 'cna', name: 'CNA' },
          { id: '3', code: 'cabralia', name: 'Cabrália' },
        ];
        setCostCenters(defaultCenters);
      }
    } catch (err) {
      logger.error('Erro inesperado ao carregar centros de custo:', err);
      // Fallback para centros padrão
      const defaultCenters: CostCenterData[] = [
        { id: '1', code: 'valenca', name: 'Valença' },
        { id: '2', code: 'cna', name: 'CNA' },
        { id: '3', code: 'cabralia', name: 'Cabrália' },
      ];
      setCostCenters(defaultCenters);
    } finally {
      setLoading(false);
    }
  }, [selectedCenter]);

  useEffect(() => {
    loadCostCenters();
  }, []);

  const addCostCenter = useCallback(async (name: string, code: string) => {
    try {
      // Validações
      if (!name.trim()) {
        throw new Error('O nome do centro de custo é obrigatório');
      }
      if (!code.trim()) {
        throw new Error('O código do centro de custo é obrigatório');
      }

      // Normaliza o código (minúsculas, sem espaços, apenas letras, números e underscore)
      const normalizedCode = code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

      // Verifica se já existe um centro com esse código
      const { data: existing } = await supabase
        .from('cost_centers')
        .select('code')
        .eq('code', normalizedCode)
        .maybeSingle();

      if (existing) {
        throw new Error('Já existe um centro de custo com esse código');
      }

      // Insere o novo centro de custo
      const { data, error } = await supabase
        .from('cost_centers')
        .insert({
          code: normalizedCode,
          name: name.trim(),
        })
        .select('id, code, name, created_at')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const newCenter: CostCenterData = {
          id: data.id,
          code: data.code,
          name: data.name || data.code,
          createdAt: data.created_at,
        };

        setCostCenters(prev => [...prev, newCenter].sort((a, b) => 
          a.name.localeCompare(b.name)
        ));
        
        // Seleciona o novo centro automaticamente
        setSelectedCenter(newCenter.code);
        
        logger.info('Centro de custo adicionado com sucesso:', newCenter);
      }
    } catch (err: any) {
      logger.error('Erro ao adicionar centro de custo:', err);
      throw err;
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadCostCenters();
  }, [loadCostCenters]);

  return (
    <CostCenterContext.Provider 
      value={{ 
        selectedCenter, 
        setSelectedCenter,
        costCenters,
        loading,
        addCostCenter,
        refresh,
      }}
    >
      {children}
    </CostCenterContext.Provider>
  );
};
