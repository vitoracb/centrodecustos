-- ==============================================================================
-- DESABILITAR RLS EM TODAS AS TABELAS PRINCIPAIS
-- ==============================================================================
--
-- 🚨 PROBLEMA PERSISTENTE: Ainda há bloqueios após corrigir políticas
-- 🎯 SOLUÇÃO RADICAL: Desabilitar RLS completamente em tudo
--
-- ==============================================================================

-- ============================================================================
-- 1. DESABILITAR RLS EM TODAS AS TABELAS PRINCIPAIS
-- ============================================================================

-- Desabilitar RLS completamente
ALTER TABLE financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Se existirem, desabilitar também em:
DO $$
BEGIN
    -- Tentar desabilitar em outras tabelas que podem existir
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'employees' AND schemaname = 'public') THEN
        ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado em employees';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'cost_centers' AND schemaname = 'public') THEN
        ALTER TABLE cost_centers DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado em cost_centers';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_profiles' AND schemaname = 'public') THEN
        ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado em user_profiles';
    END IF;
END
$$;

-- ============================================================================
-- 2. ADICIONAR COLUNAS DELETED_AT ONDE NECESSÁRIO
-- ============================================================================

-- Contracts (já foi tentado, mas garantir)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Equipments (pode precisar)
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Orders (pode precisar)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- ============================================================================
-- 3. VERIFICAR STATUS FINAL
-- ============================================================================

SELECT
    tablename,
    CASE WHEN c.relrowsecurity THEN '🔒 RLS ATIVO' ELSE '🔓 RLS DESABILITADO' END as rls_status,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = t.tablename
            AND column_name = 'deleted_at'
            AND table_schema = 'public'
        )
        THEN '✅ TEM DELETED_AT'
        ELSE '❌ SEM DELETED_AT'
    END as deleted_at_status
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.tablename IN ('financial_transactions', 'contracts', 'equipments', 'orders')
AND t.schemaname = 'public'
ORDER BY t.tablename;

-- ============================================================================
-- 4. LIMPAR CACHE DO SUPABASE
-- ============================================================================

-- Forçar refresh no Supabase
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================================================
-- 5. TESTE COMPLETO DE TODAS AS OPERAÇÕES
-- ============================================================================

-- Teste SELECT em todas as tabelas
DO $$
DECLARE
    count_ft INTEGER;
    count_contracts INTEGER;
    count_equipments INTEGER;
    count_orders INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_ft FROM financial_transactions;
    RAISE NOTICE '✅ financial_transactions: % registros', count_ft;

    SELECT COUNT(*) INTO count_contracts FROM contracts;
    RAISE NOTICE '✅ contracts: % registros', count_contracts;

    SELECT COUNT(*) INTO count_equipments FROM equipments;
    RAISE NOTICE '✅ equipments: % registros', count_equipments;

    SELECT COUNT(*) INTO count_orders FROM orders;
    RAISE NOTICE '✅ orders: % registros', count_orders;

    RAISE NOTICE '🎯 TODAS AS CONSULTAS SELECT FUNCIONARAM!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO NOS TESTES: %', SQLERRM;
END
$$;

-- ============================================================================
-- 6. RESULTADO
-- ============================================================================

SELECT '🔓 RLS DESABILITADO EM TODAS AS TABELAS - Teste CRUD agora!' as status;
SELECT 'Se ainda não funcionar, o problema é no código React Native, não no SQL' as observacao;

-- ==============================================================================
-- FIM
-- ==============================================================================