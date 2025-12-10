import React, { createContext, useContext, useMemo, useCallback, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { financialCache, dashboardCache } from '../lib/smartCache';
import usePaginatedQuery from '../hooks/usePaginatedQuery';
import { useStableCallback, useStableMemo } from '../hooks/useOptimizedRender';

/**
 * 🚀 EXEMPLO DE CONTEXTO OTIMIZADO
 * Demonstra como aplicar todas as otimizações
 */

interface OptimizedFinancialContextType {
  // Dados paginados
  expenses: any[];
  loadMoreExpenses: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  expensesLoading: boolean;
  expensesError: string | null;

  // Dashboard otimizado
  dashboardData: any;
  dashboardLoading: boolean;

  // Filtros otimizados
  filteredExpenses: any[];
  setSearchTerm: (term: string) => void;
  setDateFilter: (filter: { start?: Date; end?: Date }) => void;

  // Actions otimizadas
  createExpense: (data: any) => Promise<void>;
  updateExpense: (id: string, data: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

const OptimizedFinancialContext = createContext<OptimizedFinancialContextType | null>(null);

export function OptimizedFinancialProvider({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<{ start?: Date; end?: Date }>({});
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // ============================================================================
  // 📄 CONSULTA PAGINADA OTIMIZADA
  // ============================================================================

  const expenseQuery = useStableCallback((from: number, to: number) => {
    return supabase
      .from('financial_summary') // Usar view otimizada!
      .select('*', { count: 'exact' })
      .eq('type', 'expense')
      .order('created_at', { ascending: false })
      .range(from, to);
  }, []);

  const {
    data: expenses,
    loading: expensesLoading,
    error: expensesError,
    hasNextPage,
    loadMore: loadMoreExpenses,
    refresh: refreshExpenses,
  } = usePaginatedQuery('financial_summary', expenseQuery, {
    pageSize: 20,
    prefetchNext: true,
    cacheStrategy: 'incremental', // Acumular dados
    cacheTTL: 3 * 60 * 1000, // 3 minutos
  });

  // ============================================================================
  // 🎯 FILTROS OTIMIZADOS COM MEMOIZAÇÃO
  // ============================================================================

  const filteredExpenses = useStableMemo(() => {
    let filtered = expenses;

    // Filtro por texto
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(expense =>
        expense.description?.toLowerCase().includes(term) ||
        expense.category?.toLowerCase().includes(term)
      );
    }

    // Filtro por data
    if (dateFilter.start || dateFilter.end) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date);
        if (dateFilter.start && expenseDate < dateFilter.start) return false;
        if (dateFilter.end && expenseDate > dateFilter.end) return false;
        return true;
      });
    }

    return filtered;
  }, [expenses, searchTerm, dateFilter], (prev, next) => {
    // Comparação customizada para evitar re-cálculos desnecessários
    return prev.length === next.length && prev[0]?.id === next[0]?.id;
  });

  // ============================================================================
  // 📊 DASHBOARD COM CACHE INTELIGENTE
  // ============================================================================

  const loadDashboard = useStableCallback(async (costCenterId?: string) => {
    const cacheKey = `dashboard_${costCenterId || 'all'}`;

    setDashboardLoading(true);

    try {
      // 1. Tentar cache primeiro
      const cached = await dashboardCache.get(cacheKey);
      if (cached) {
        setDashboardData(cached);
        setDashboardLoading(false);
        return;
      }

      // 2. Carregar do Supabase usando view otimizada
      const { data, error } = await supabase
        .from('dashboard_monthly') // View criada nas otimizações SQL!
        .select('*')
        .gte('month_year', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('month_year', { ascending: false });

      if (error) throw error;

      // 3. Processar dados
      const processedData = {
        monthlyTotals: data,
        totalExpenses: data.reduce((sum, item) => sum + (item.expenses_total || 0), 0),
        totalReceipts: data.reduce((sum, item) => sum + (item.receipts_total || 0), 0),
        avgMonthly: data.length > 0 ? data.reduce((sum, item) => sum + (item.expenses_total || 0), 0) / data.length : 0,
        lastUpdated: new Date(),
      };

      // 4. Salvar no cache
      await dashboardCache.set(cacheKey, processedData);

      setDashboardData(processedData);
    } catch (error) {
      console.error('[Dashboard] Erro ao carregar:', error);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // ============================================================================
  // ✏️ ACTIONS OTIMIZADAS COM INVALIDAÇÃO DE CACHE
  // ============================================================================

  const createExpense = useStableCallback(async (data: any) => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .insert([data]);

      if (error) throw error;

      // Invalidar caches relacionados
      await Promise.all([
        financialCache.invalidatePattern('financial_summary'),
        dashboardCache.invalidatePattern('dashboard_'),
      ]);

      // Recarregar dados
      await Promise.all([
        refreshExpenses(),
        loadDashboard(),
      ]);

      console.log('✅ Despesa criada e cache invalidado');
    } catch (error) {
      console.error('❌ Erro ao criar despesa:', error);
      throw error;
    }
  }, [refreshExpenses, loadDashboard]);

  const updateExpense = useStableCallback(async (id: string, data: any) => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      // Invalidação seletiva
      await Promise.all([
        financialCache.invalidatePattern('financial_summary'),
        dashboardCache.invalidatePattern('dashboard_'),
      ]);

      await Promise.all([
        refreshExpenses(),
        loadDashboard(),
      ]);

      console.log('✅ Despesa atualizada e cache invalidado');
    } catch (error) {
      console.error('❌ Erro ao atualizar despesa:', error);
      throw error;
    }
  }, [refreshExpenses, loadDashboard]);

  const deleteExpense = useStableCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Invalidar e recarregar
      await Promise.all([
        financialCache.invalidatePattern('financial_summary'),
        dashboardCache.invalidatePattern('dashboard_'),
      ]);

      await Promise.all([
        refreshExpenses(),
        loadDashboard(),
      ]);

      console.log('✅ Despesa deletada e cache invalidado');
    } catch (error) {
      console.error('❌ Erro ao deletar despesa:', error);
      throw error;
    }
  }, [refreshExpenses, loadDashboard]);

  // ============================================================================
  // 🎭 VALOR DO CONTEXTO MEMOIZADO
  // ============================================================================

  const contextValue = useMemo(() => ({
    // Dados paginados
    expenses: filteredExpenses,
    loadMoreExpenses,
    refreshExpenses,
    expensesLoading,
    expensesError,

    // Dashboard
    dashboardData,
    dashboardLoading,

    // Filtros
    filteredExpenses,
    setSearchTerm,
    setDateFilter,

    // Actions
    createExpense,
    updateExpense,
    deleteExpense,
  }), [
    filteredExpenses,
    loadMoreExpenses,
    refreshExpenses,
    expensesLoading,
    expensesError,
    dashboardData,
    dashboardLoading,
    setSearchTerm,
    setDateFilter,
    createExpense,
    updateExpense,
    deleteExpense,
  ]);

  return (
    <OptimizedFinancialContext.Provider value={contextValue}>
      {children}
    </OptimizedFinancialContext.Provider>
  );
}

export function useOptimizedFinancial() {
  const context = useContext(OptimizedFinancialContext);
  if (!context) {
    throw new Error('useOptimizedFinancial deve ser usado dentro de OptimizedFinancialProvider');
  }
  return context;
}

/**
 * 📊 EXEMPLO DE COMPONENTE OTIMIZADO
 */
export const OptimizedExpensesList = React.memo(({ onItemPress }: { onItemPress: (item: any) => void }) => {
  const { expenses, loadMoreExpenses, expensesLoading } = useOptimizedFinancial();

  const handleItemPress = useStableCallback((item: any) => {
    onItemPress(item);
  }, [onItemPress]);

  const renderExpense = useStableCallback((item: any, index: number) => (
    <ExpenseItem
      key={item.id}
      expense={item}
      onPress={handleItemPress}
    />
  ), [handleItemPress]);

  return (
    <FlatList
      data={expenses}
      renderItem={({ item, index }) => renderExpense(item, index)}
      onEndReached={loadMoreExpenses}
      onEndReachedThreshold={0.5}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={10}
      refreshing={expensesLoading}
      // ... outras otimizações de FlatList
    />
  );
});

const ExpenseItem = React.memo(({ expense, onPress }: { expense: any; onPress: (item: any) => void }) => {
  const handlePress = useStableCallback(() => {
    onPress(expense);
  }, [expense, onPress]);

  return (
    <TouchableOpacity onPress={handlePress}>
      {/* Renderização do item */}
    </TouchableOpacity>
  );
});

export default OptimizedFinancialProvider;