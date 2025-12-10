/**
 * Configuração do TanStack Query (React Query)
 * 
 * Centraliza a configuração do QueryClient com defaults
 * otimizados para a aplicação de gestão financeira.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Tempo que os dados são considerados "frescos" (30s)
            staleTime: 30 * 1000,
            // Tempo que os dados ficam em cache (5 min)
            gcTime: 5 * 60 * 1000,
            // Não refaz retry automático (usamos nosso próprio handling de erros)
            retry: false,
            // Não refetch ao focar a janela (temos realtime sync)
            refetchOnWindowFocus: false,
            // Não refetch ao reconectar (temos nosso próprio handling)
            refetchOnReconnect: false,
        },
        mutations: {
            // Mutations não fazem retry
            retry: false,
        },
    },
});

/**
 * Query keys centralizadas para evitar typos e facilitar invalidação
 */
export const queryKeys = {
    // Financeiro
    expenses: (center?: string, period?: string) => ['expenses', center, period].filter(Boolean),
    receipts: (center?: string, period?: string) => ['receipts', center, period].filter(Boolean),

    // Equipamentos
    equipment: (center?: string) => ['equipment', center].filter(Boolean),

    // Funcionários
    employees: (center?: string) => ['employees', center].filter(Boolean),

    // Pedidos
    orders: (center?: string) => ['orders', center].filter(Boolean),

    // Contratos
    contracts: (center?: string) => ['contracts', center].filter(Boolean),

    // Centros de custo
    costCenters: () => ['costCenters'],
} as const;
