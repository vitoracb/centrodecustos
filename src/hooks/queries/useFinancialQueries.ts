/**
 * Hooks de query para dados financeiros usando TanStack Query
 * 
 * Estes hooks encapsulam as chamadas ao Supabase para despesas e recebimentos,
 * proporcionando cache automático, estados de loading/error, e invalidação.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabaseClient';
import { queryKeys } from '@/src/lib/queryClient';
import type { Expense, Receipt } from '@/src/context/FinancialContext';

// ========================
// FETCH FUNCTIONS
// ========================

/**
 * Busca despesas do Supabase
 */
async function fetchExpenses(userId: string, center?: string): Promise<Expense[]> {
    let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (center) {
        query = query.eq('center', center);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(mapRowToExpense);
}

/**
 * Busca recebimentos do Supabase
 */
async function fetchReceipts(userId: string, center?: string): Promise<Receipt[]> {
    let query = supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (center) {
        query = query.eq('center', center);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(mapRowToReceipt);
}

// ========================
// MAPPERS
// ========================

function mapRowToExpense(row: any): Expense {
    return {
        id: row.id,
        name: row.name,
        date: row.date,
        value: row.value,
        category: row.category,
        center: row.center,
        status: row.status,
        method: row.method,
        observations: row.observations,
        equipmentId: row.equipment_id,
        gestaoSubcategory: row.gestao_subcategory,
        sector: row.sector,
        isFixed: row.is_fixed,
        fixedDurationMonths: row.fixed_duration_months,
        installmentNumber: row.installment_number,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
        documents: [],
    };
}

function mapRowToReceipt(row: any): Receipt {
    return {
        id: row.id,
        name: row.name,
        date: row.date,
        value: row.value,
        center: row.center,
        category: row.category,
        status: row.status,
        method: row.method,
        isFixed: row.is_fixed,
        fixedDurationMonths: row.fixed_duration_months,
        installmentNumber: row.installment_number,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
    };
}

// ========================
// HOOKS
// ========================

/**
 * Hook para buscar despesas com cache
 */
export function useExpensesQuery(userId: string | undefined, center?: string) {
    return useQuery({
        queryKey: queryKeys.expenses(center),
        queryFn: () => fetchExpenses(userId!, center),
        enabled: !!userId,
        staleTime: 30 * 1000, // 30 segundos
    });
}

/**
 * Hook para buscar recebimentos com cache
 */
export function useReceiptsQuery(userId: string | undefined, center?: string) {
    return useQuery({
        queryKey: queryKeys.receipts(center),
        queryFn: () => fetchReceipts(userId!, center),
        enabled: !!userId,
        staleTime: 30 * 1000, // 30 segundos
    });
}

/**
 * Hook para invalidar queries financeiras (após mutations)
 */
export function useInvalidateFinancialQueries() {
    const queryClient = useQueryClient();

    return {
        invalidateExpenses: (center?: string) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.expenses(center) });
        },
        invalidateReceipts: (center?: string) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.receipts(center) });
        },
        invalidateAll: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
        },
    };
}
