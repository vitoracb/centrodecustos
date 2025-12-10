import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { financialCache } from '../lib/smartCache';

interface PaginationConfig {
  pageSize?: number;
  prefetchNext?: boolean;
  cacheStrategy?: 'none' | 'page' | 'incremental';
  cacheTTL?: number;
}

interface PaginationState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  currentPage: number;
  totalCount?: number;
}

interface PaginationActions {
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

/**
 * 🚀 Hook de paginação inteligente com cache
 * Carrega dados sob demanda, com cache automático
 */
function usePaginatedQuery<T>(
  tableName: string,
  query: (from: number, to: number) => any,
  config: PaginationConfig = {}
): PaginationState<T> & PaginationActions {
  const {
    pageSize = 20,
    prefetchNext = true,
    cacheStrategy = 'page',
    cacheTTL = 3 * 60 * 1000, // 3 minutos
  } = config;

  const [state, setState] = useState<PaginationState<T>>({
    data: [],
    loading: true,
    error: null,
    hasNextPage: true,
    isLoadingMore: false,
    currentPage: 0,
    totalCount: undefined,
  });

  const loadedPages = useRef<Set<number>>(new Set());
  const prefetchCache = useRef<Map<number, T[]>>(new Map());

  /**
   * 📦 Gerar chave do cache
   */
  const getCacheKey = useCallback(
    (page: number) => `${tableName}_page_${page}_size_${pageSize}`,
    [tableName, pageSize]
  );

  /**
   * 📄 Carregar página específica
   */
  const loadPage = useCallback(
    async (page: number, isLoadMore = false): Promise<T[]> => {
      const cacheKey = getCacheKey(page);

      try {
        // 1. Tentar cache primeiro
        if (cacheStrategy !== 'none') {
          const cached = await financialCache.get<T[]>(cacheKey);
          if (cached) {
            console.log(`[Pagination] 📦 Página ${page} carregada do cache`);
            return cached;
          }
        }

        // 2. Verificar prefetch cache
        const prefetched = prefetchCache.current.get(page);
        if (prefetched) {
          console.log(`[Pagination] ⚡ Página ${page} carregada do prefetch`);
          prefetchCache.current.delete(page);
          return prefetched;
        }

        // 3. Carregar do Supabase
        console.log(`[Pagination] 🌐 Carregando página ${page} do Supabase...`);
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await query(from, to);

        if (error) throw new Error(error.message);

        const pageData = data || [];

        // 4. Salvar no cache
        if (cacheStrategy !== 'none') {
          await financialCache.set(cacheKey, pageData, cacheTTL);
        }

        // 5. Atualizar total count se disponível
        if (count !== null && count !== undefined) {
          setState(prev => ({ ...prev, totalCount: count }));
        }

        // 6. Prefetch próxima página se habilitado
        if (prefetchNext && pageData.length === pageSize) {
          setTimeout(() => prefetchPage(page + 1), 1000);
        }

        loadedPages.current.add(page);
        return pageData;
      } catch (error) {
        console.error(`[Pagination] ❌ Erro ao carregar página ${page}:`, error);
        throw error;
      }
    },
    [getCacheKey, cacheStrategy, cacheTTL, pageSize, prefetchNext, query]
  );

  /**
   * ⚡ Prefetch página
   */
  const prefetchPage = useCallback(
    async (page: number) => {
      if (loadedPages.current.has(page) || prefetchCache.current.has(page)) {
        return; // Já carregado ou em cache
      }

      try {
        const pageData = await loadPage(page);
        prefetchCache.current.set(page, pageData);
        console.log(`[Pagination] 🚀 Página ${page} prefetchada`);
      } catch (error) {
        // Silenciar erros de prefetch
        console.debug(`[Pagination] Prefetch falhou para página ${page}`);
      }
    },
    [loadPage]
  );

  /**
   * 📄 Carregar primeira página
   */
  const loadInitial = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const pageData = await loadPage(0);

      setState(prev => ({
        ...prev,
        data: pageData,
        loading: false,
        hasNextPage: pageData.length === pageSize,
        currentPage: 0,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }));
    }
  }, [loadPage, pageSize]);

  /**
   * ➕ Carregar mais dados
   */
  const loadMore = useCallback(async () => {
    if (state.isLoadingMore || !state.hasNextPage || state.loading) return;

    setState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      const nextPage = state.currentPage + 1;
      const pageData = await loadPage(nextPage, true);

      setState(prev => {
        const newData = cacheStrategy === 'incremental'
          ? [...prev.data, ...pageData]
          : pageData; // Apenas mostrar página atual

        return {
          ...prev,
          data: newData,
          isLoadingMore: false,
          hasNextPage: pageData.length === pageSize,
          currentPage: nextPage,
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoadingMore: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar mais',
      }));
    }
  }, [state.isLoadingMore, state.hasNextPage, state.loading, state.currentPage, loadPage, pageSize, cacheStrategy]);

  /**
   * 🔄 Atualizar dados
   */
  const refresh = useCallback(async () => {
    // Limpar cache
    await financialCache.invalidatePattern(tableName);
    loadedPages.current.clear();
    prefetchCache.current.clear();

    // Recarregar
    await loadInitial();
  }, [tableName, loadInitial]);

  /**
   * ↩️ Reset pagination
   */
  const reset = useCallback(() => {
    setState({
      data: [],
      loading: true,
      error: null,
      hasNextPage: true,
      isLoadingMore: false,
      currentPage: 0,
      totalCount: undefined,
    });
    loadedPages.current.clear();
    prefetchCache.current.clear();
  }, []);

  // Carregar inicial
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    ...state,
    loadMore,
    refresh,
    reset,
  };
}

export default usePaginatedQuery;