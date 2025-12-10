-- ==============================================================================
-- TESTE SEGURO: VERIFICAR O QUE REALMENTE EXISTE
-- ==============================================================================

-- ✅ Teste que só consulta o que existe

-- ============================================================================
-- 1. VERIFICAR ÍNDICES CRIADOS
-- ============================================================================

SELECT 'ÍNDICES CRIADOS:' as info;

SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY tablename;

-- ============================================================================
-- 2. VERIFICAR VIEWS EXISTENTES
-- ============================================================================

SELECT 'VIEWS EXISTENTES:' as info;

SELECT table_name as view_name, 'EXISTS' as status
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- 3. TESTAR SÓ AS VIEWS QUE EXISTEM
-- ============================================================================

-- Verificar se equipments_overview existe e testar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'equipments_overview') THEN
        RAISE NOTICE 'TESTANDO equipments_overview';
        PERFORM COUNT(*) FROM equipments_overview;
        RAISE NOTICE 'equipments_overview: OK';
    ELSE
        RAISE NOTICE 'equipments_overview: NÃO EXISTE';
    END IF;
END $$;

-- Verificar se orders_overview existe e testar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'orders_overview') THEN
        RAISE NOTICE 'TESTANDO orders_overview';
        PERFORM COUNT(*) FROM orders_overview;
        RAISE NOTICE 'orders_overview: OK';
    ELSE
        RAISE NOTICE 'orders_overview: NÃO EXISTE';
    END IF;
END $$;

-- Verificar se dashboard_monthly existe e testar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'dashboard_monthly') THEN
        RAISE NOTICE 'TESTANDO dashboard_monthly';
        PERFORM COUNT(*) FROM dashboard_monthly;
        RAISE NOTICE 'dashboard_monthly: OK';
    ELSE
        RAISE NOTICE 'dashboard_monthly: NÃO EXISTE';
    END IF;
END $$;

-- ============================================================================
-- 4. CONSULTA BÁSICA QUE SEMPRE FUNCIONA
-- ============================================================================

-- Teste simples nas tabelas originais
SELECT 'TESTE TABELAS ORIGINAIS:' as info;

SELECT 'financial_transactions' as tabela, COUNT(*) as registros FROM financial_transactions
UNION ALL
SELECT 'equipments' as tabela, COUNT(*) as registros FROM equipments WHERE deleted_at IS NULL
UNION ALL
SELECT 'orders' as tabela, COUNT(*) as registros FROM orders WHERE deleted_at IS NULL
UNION ALL
SELECT 'contracts' as tabela, COUNT(*) as registros FROM contracts WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. RESUMO DO QUE TEMOS
-- ============================================================================

SELECT
    'OTIMIZAÇÕES FUNCIONAIS:' as status,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as indices_criados,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as views_totais;

-- ✅ ESTE SCRIPT É SEGURO!
-- Só testa o que realmente existe