-- ==============================================================================
-- SCRIPT 2 CORRIGIDO: ATIVAR ROW LEVEL SECURITY (RLS)
-- Execute após 01_create_audit_table_FIXED.sql
-- ==============================================================================

-- Ativar RLS em todas as tabelas críticas (só se existirem)
DO $$
BEGIN
    -- financial_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN
        ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
    END IF;

    -- equipments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipments') THEN
        ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
    END IF;

    -- contracts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
        ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
    END IF;

    -- orders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    END IF;

    -- cost_centers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_centers') THEN
        ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
    END IF;

    -- audit_logs (deve existir pois acabamos de criar)
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
END
$$;

-- Verificar se user_profiles existe (seu sistema usa esta tabela)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS ativado em user_profiles (tabela existente)';
    ELSE
        RAISE NOTICE 'Tabela user_profiles não encontrada - verifique o nome da tabela';
    END IF;
END
$$;

-- Verificar se user_permissions existe (caso você use esta tabela também)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_permissions') THEN
        ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS ativado em user_permissions';
    ELSE
        RAISE NOTICE 'Tabela user_permissions não encontrada - pularemos por enquanto';
    END IF;
END
$$;

-- Verificar quais tabelas têm RLS ativo agora
SELECT
    tablename,
    rowsecurity as rls_ativo
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;

-- ✅ SCRIPT 2 CORRIGIDO CONCLUÍDO
-- Próximo: Execute 03_rls_policies_UPDATED.sql