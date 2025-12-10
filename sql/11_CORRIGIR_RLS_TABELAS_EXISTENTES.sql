-- ==============================================================================
-- CORRIGIR RLS APENAS PARA TABELAS EXISTENTES
-- ==============================================================================
--
-- 🚨 PROBLEMA: Usuários não conseguem fazer operações CRUD após otimizações
-- 🎯 SOLUÇÃO: Recriar políticas RLS apenas para tabelas que existem
--
-- Execute este script no Supabase SQL Editor
--
-- ==============================================================================

-- ============================================================================
-- 1. VERIFICAR QUAIS TABELAS EXISTEM
-- ============================================================================

SELECT
    tablename,
    schemaname
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'financial_transactions',
    'equipments',
    'orders',
    'contracts',
    'user_profiles',
    'cost_centers'
)
ORDER BY tablename;

-- ============================================================================
-- 2. VERIFICAR STATUS RLS DAS TABELAS EXISTENTES
-- ============================================================================

SELECT
    t.tablename,
    CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN (
    'financial_transactions',
    'equipments',
    'orders',
    'contracts',
    'user_profiles',
    'cost_centers'
)
ORDER BY t.tablename;

-- ============================================================================
-- 3. RECRIAR POLÍTICAS RLS ESSENCIAIS
-- ============================================================================

-- 🔧 FINANCIAL_TRANSACTIONS (Principal)
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Enable read for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON financial_transactions;

-- Políticas simples para usuários autenticados
CREATE POLICY "Enable read for authenticated users"
ON financial_transactions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users"
ON financial_transactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users"
ON financial_transactions FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for authenticated users"
ON financial_transactions FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 🔧 EQUIPMENTS
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON equipments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON equipments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON equipments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON equipments;

CREATE POLICY "Enable read for authenticated users"
ON equipments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users"
ON equipments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users"
ON equipments FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for authenticated users"
ON equipments FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 🔧 ORDERS (se existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'orders' AND schemaname = 'public') THEN
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Enable read for authenticated users" ON orders;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON orders;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON orders;
        DROP POLICY IF EXISTS "Enable delete for authenticated users" ON orders;

        CREATE POLICY "Enable read for authenticated users"
        ON orders FOR SELECT
        USING (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable insert for authenticated users"
        ON orders FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable update for authenticated users"
        ON orders FOR UPDATE
        USING (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable delete for authenticated users"
        ON orders FOR DELETE
        USING (auth.uid() IS NOT NULL);

        RAISE NOTICE 'Políticas para orders criadas com sucesso';
    ELSE
        RAISE NOTICE 'Tabela orders não existe - pulando';
    END IF;
END
$$;

-- 🔧 CONTRACTS (se existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'contracts' AND schemaname = 'public') THEN
        ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Enable read for authenticated users" ON contracts;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON contracts;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON contracts;
        DROP POLICY IF EXISTS "Enable delete for authenticated users" ON contracts;

        CREATE POLICY "Enable read for authenticated users"
        ON contracts FOR SELECT
        USING (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable insert for authenticated users"
        ON contracts FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable update for authenticated users"
        ON contracts FOR UPDATE
        USING (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable delete for authenticated users"
        ON contracts FOR DELETE
        USING (auth.uid() IS NOT NULL);

        RAISE NOTICE 'Políticas para contracts criadas com sucesso';
    ELSE
        RAISE NOTICE 'Tabela contracts não existe - pulando';
    END IF;
END
$$;

-- 🔧 USER_PROFILES (importante para permissões)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_profiles' AND schemaname = 'public') THEN
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
        DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

        CREATE POLICY "Users can view their own profile"
        ON user_profiles FOR SELECT
        USING (auth.uid() = id::uuid OR auth.uid() IS NOT NULL);

        CREATE POLICY "Users can update their own profile"
        ON user_profiles FOR UPDATE
        USING (auth.uid() = id::uuid);

        RAISE NOTICE 'Políticas para user_profiles criadas com sucesso';
    ELSE
        RAISE NOTICE 'Tabela user_profiles não existe - pulando';
    END IF;
END
$$;

-- 🔧 COST_CENTERS (se existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'cost_centers' AND schemaname = 'public') THEN
        ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Enable read for authenticated users" ON cost_centers;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON cost_centers;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON cost_centers;
        DROP POLICY IF EXISTS "Enable delete for authenticated users" ON cost_centers;

        CREATE POLICY "Enable read for authenticated users"
        ON cost_centers FOR SELECT
        USING (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable insert for authenticated users"
        ON cost_centers FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable update for authenticated users"
        ON cost_centers FOR UPDATE
        USING (auth.uid() IS NOT NULL);

        CREATE POLICY "Enable delete for authenticated users"
        ON cost_centers FOR DELETE
        USING (auth.uid() IS NOT NULL);

        RAISE NOTICE 'Políticas para cost_centers criadas com sucesso';
    ELSE
        RAISE NOTICE 'Tabela cost_centers não existe - pulando';
    END IF;
END
$$;

-- ============================================================================
-- 4. TESTE DAS PERMISSÕES
-- ============================================================================

-- Testar acesso às tabelas principais
SELECT 'financial_transactions' as tabela, COUNT(*) as registros FROM financial_transactions;
SELECT 'equipments' as tabela, COUNT(*) as registros FROM equipments;

-- Testar tabelas que podem existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'orders' AND schemaname = 'public') THEN
        PERFORM (SELECT COUNT(*) FROM orders);
        RAISE NOTICE 'Acesso à tabela orders: OK';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'contracts' AND schemaname = 'public') THEN
        PERFORM (SELECT COUNT(*) FROM contracts);
        RAISE NOTICE 'Acesso à tabela contracts: OK';
    END IF;
END
$$;

-- ============================================================================
-- 5. VERIFICAÇÃO FINAL
-- ============================================================================

SELECT
    tablename,
    COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN (
    'financial_transactions',
    'equipments',
    'orders',
    'contracts',
    'user_profiles',
    'cost_centers'
)
GROUP BY tablename
ORDER BY tablename;

-- Mensagem final
SELECT '✅ RLS CORRIGIDO - Teste as operações CRUD agora!' as status;

-- ==============================================================================
-- FIM DO SCRIPT CORRIGIDO
-- ==============================================================================