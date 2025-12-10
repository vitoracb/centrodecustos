-- ==============================================================================
-- DIAGNÓSTICO GERAL APÓS OTIMIZAÇÕES SQL
-- ==============================================================================
--
-- 🚨 PROBLEMA: Operações CRUD gerais quebradas após otimizações
-- 🎯 SOLUÇÃO: Identificar o que quebrou nas otimizações
--
-- ==============================================================================

-- ============================================================================
-- 1. VERIFICAR TODAS AS TABELAS PRINCIPAIS
-- ============================================================================

SELECT '=== STATUS DAS TABELAS PRINCIPAIS ===' as titulo;

SELECT
    tablename,
    CASE WHEN c.relrowsecurity THEN '🔒 RLS ATIVO' ELSE '🔓 RLS DESATIVADO' END as rls_status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.tablename AND table_schema = 'public') as total_columns
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.tablename IN ('financial_transactions', 'contracts', 'equipments', 'orders', 'employees')
AND t.schemaname = 'public'
ORDER BY t.tablename;

-- ============================================================================
-- 2. VERIFICAR VIEWS CRIADAS NAS OTIMIZAÇÕES
-- ============================================================================

SELECT '=== VIEWS CRIADAS ===' as titulo;

SELECT
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('financial_summary', 'equipments_overview', 'orders_overview', 'dashboard_monthly', 'financial_basic')
ORDER BY viewname;

-- ============================================================================
-- 3. VERIFICAR ÍNDICES CRIADOS
-- ============================================================================

SELECT '=== ÍNDICES DAS OTIMIZAÇÕES ===' as titulo;

SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%_idx'
ORDER BY tablename, indexname;

-- ============================================================================
-- 4. VERIFICAR POLÍTICAS RLS PROBLEMÁTICAS
-- ============================================================================

SELECT '=== POLÍTICAS RLS SUSPEITAS ===' as titulo;

-- Procurar políticas que podem ter referências quebradas
SELECT
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE (
    qual ILIKE '%type%' OR
    with_check ILIKE '%type%' OR
    qual ILIKE '%deleted_at%' OR
    with_check ILIKE '%deleted_at%'
)
ORDER BY tablename, policyname;

-- ============================================================================
-- 5. VERIFICAR TRIGGERS E FUNÇÕES PROBLEMÁTICAS
-- ============================================================================

SELECT '=== TRIGGERS ATIVOS ===' as titulo;

SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('financial_transactions', 'contracts', 'equipments', 'orders')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 6. TESTAR OPERAÇÕES BÁSICAS EM CADA TABELA
-- ============================================================================

-- FINANCIAL_TRANSACTIONS
DO $$
BEGIN
    PERFORM COUNT(*) FROM financial_transactions;
    RAISE NOTICE '✅ financial_transactions: SELECT OK';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ financial_transactions: SELECT FALHOU - %', SQLERRM;
END
$$;

-- CONTRACTS
DO $$
BEGIN
    PERFORM COUNT(*) FROM contracts;
    RAISE NOTICE '✅ contracts: SELECT OK';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ contracts: SELECT FALHOU - %', SQLERRM;
END
$$;

-- EQUIPMENTS
DO $$
BEGIN
    PERFORM COUNT(*) FROM equipments;
    RAISE NOTICE '✅ equipments: SELECT OK';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ equipments: SELECT FALHOU - %', SQLERRM;
END
$$;

-- ============================================================================
-- 7. VERIFICAR COLUNAS DELETED_AT EM TODAS AS TABELAS
-- ============================================================================

SELECT '=== STATUS DELETED_AT ===' as titulo;

SELECT
    table_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = t.table_name
            AND column_name = 'deleted_at'
            AND table_schema = 'public'
        )
        THEN '✅ TEM DELETED_AT'
        ELSE '❌ SEM DELETED_AT'
    END as status_deleted_at
FROM information_schema.tables t
WHERE t.table_name IN ('financial_transactions', 'contracts', 'equipments', 'orders')
AND t.table_schema = 'public'
ORDER BY t.table_name;

-- ============================================================================
-- 8. VERIFICAR AUTH E USUÁRIOS
-- ============================================================================

SELECT '=== STATUS AUTH ===' as titulo;

-- Verificar se as funções de auth funcionam
DO $$
BEGIN
    PERFORM auth.uid();
    RAISE NOTICE '✅ auth.uid() funciona';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ auth.uid() não funciona - %', SQLERRM;
END
$$;

-- ============================================================================
-- 9. POSSÍVEIS SOLUÇÕES
-- ============================================================================

SELECT '=== POSSÍVEIS PROBLEMAS E SOLUÇÕES ===' as titulo;

SELECT
    'PROBLEMA IDENTIFICADO' as categoria,
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'financial_summary')
        THEN '❌ Views das otimizações não existem'
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE qual ILIKE '%type%'
            AND tablename != 'financial_transactions'
        )
        THEN '❌ Políticas RLS com referências a "type" em tabelas sem essa coluna'
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE qual ILIKE '%deleted_at%'
            AND tablename NOT IN (
                SELECT table_name FROM information_schema.columns
                WHERE column_name = 'deleted_at'
            )
        )
        THEN '❌ Políticas RLS referenciam deleted_at em tabelas que não tem essa coluna'
        ELSE '✅ Problemas básicos não encontrados - investigar mais'
    END as diagnostico;

-- ============================================================================
-- 10. RESULTADO FINAL
-- ============================================================================

SELECT '🔍 DIAGNÓSTICO CONCLUÍDO - Verifique os resultados acima para identificar o problema' as status_final;

-- ==============================================================================
-- FIM DO DIAGNÓSTICO GERAL
-- ==============================================================================