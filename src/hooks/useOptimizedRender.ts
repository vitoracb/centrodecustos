import { useMemo, useCallback, useRef } from 'react';
import { debounce } from 'lodash';

/**
 * 🚀 Hook para otimizar renderizações
 */
export function useOptimizedRender() {
  /**
   * 🔍 Filtro debounced para busca
   */
  const useDebouncedFilter = useCallback((
    data: any[],
    searchTerm: string,
    filterFn: (item: any, term: string) => boolean,
    delay = 300
  ) => {
    const debouncedFilter = useRef(
      debounce((term: string, items: any[], fn: typeof filterFn) => {
        return items.filter(item => fn(item, term));
      }, delay)
    ).current;

    return useMemo(() => {
      if (!searchTerm.trim()) return data;
      return debouncedFilter(searchTerm, data, filterFn) || [];
    }, [data, searchTerm, filterFn, debouncedFilter]);
  }, []);

  /**
   * 📊 Dados agregados memoizados
   */
  const useAggregatedData = useCallback(<T,>(
    data: T[],
    aggregateFn: (items: T[]) => any,
    dependencies: any[] = []
  ) => {
    return useMemo(() => {
      if (!data.length) return null;
      return aggregateFn(data);
    }, [data, ...dependencies]);
  }, []);

  /**
   * 🎯 Seleção otimizada de itens
   */
  const useOptimizedSelector = useCallback(<T,>(
    items: T[],
    selector: (item: T) => any,
    keyFn?: (item: T) => string
  ) => {
    return useMemo(() => {
      const map = new Map();

      return items.map(item => {
        const key = keyFn ? keyFn(item) : JSON.stringify(item);

        if (!map.has(key)) {
          map.set(key, selector(item));
        }

        return map.get(key);
      });
    }, [items, selector, keyFn]);
  }, []);

  /**
   * 📱 Otimizador de lista virtual
   */
  const useVirtualizedData = useCallback(<T,>(
    data: T[],
    itemHeight: number,
    containerHeight: number,
    scrollOffset = 0
  ) => {
    return useMemo(() => {
      const startIndex = Math.floor(scrollOffset / itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + 2, // +2 buffer
        data.length
      );

      const visibleItems = data.slice(startIndex, endIndex);
      const offsetY = startIndex * itemHeight;
      const totalHeight = data.length * itemHeight;

      return {
        visibleItems,
        offsetY,
        totalHeight,
        startIndex,
        endIndex,
      };
    }, [data, itemHeight, containerHeight, scrollOffset]);
  }, []);

  return {
    useDebouncedFilter,
    useAggregatedData,
    useOptimizedSelector,
    useVirtualizedData,
  };
}

/**
 * 🎭 HOC para otimizar componentes
 */
export function withRenderOptimization<P extends object>(
  Component: React.ComponentType<P>,
  compareProps?: (prevProps: P, nextProps: P) => boolean
) {
  const OptimizedComponent = React.memo(Component, compareProps);
  OptimizedComponent.displayName = `Optimized(${Component.displayName || Component.name})`;
  return OptimizedComponent;
}

/**
 * 📈 Comparadores customizados
 */
export const renderComparators = {
  /**
   * Compara apenas propriedades específicas
   */
  onlyProps: <T,>(keys: (keyof T)[]) => (prev: T, next: T) => {
    return keys.every(key => prev[key] === next[key]);
  },

  /**
   * Compara arrays por length e primeiro/último item
   */
  shallowArray: <T,>(prev: T[], next: T[]) => {
    if (prev.length !== next.length) return false;
    if (prev.length === 0) return true;
    return prev[0] === next[0] && prev[prev.length - 1] === next[next.length - 1];
  },

  /**
   * Compara objetos por chaves específicas
   */
  shallowObject: <T,>(keys: (keyof T)[]) => (prev: T, next: T) => {
    return keys.every(key => {
      const prevVal = prev[key];
      const nextVal = next[key];

      if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
        return renderComparators.shallowArray(prevVal, nextVal);
      }

      return prevVal === nextVal;
    });
  },
};

/**
 * ⚡ Hook para callbacks otimizados
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  return useCallback(callback, deps);
}

/**
 * 🔄 Hook para valores memoizados com comparação customizada
 */
export function useStableMemo<T>(
  factory: () => T,
  deps: any[],
  isEqual?: (prev: T, next: T) => boolean
): T {
  const prevRef = useRef<T>();
  const depsRef = useRef<any[]>(deps);

  const value = useMemo(() => {
    const newValue = factory();

    if (prevRef.current && isEqual && isEqual(prevRef.current, newValue)) {
      return prevRef.current;
    }

    prevRef.current = newValue;
    return newValue;
  }, deps);

  depsRef.current = deps;
  return value;
}

export default useOptimizedRender;