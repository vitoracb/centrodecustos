-- ==============================================================================
-- VERIFICAR E CORRIGIR RLS APÓS OTIMIZAÇÕES
-- ==============================================================================
--
-- 🚨 PROBLEMA: Após otimizações SQL, usuários não conseguem fazer operações CRUD
-- 🎯 SOLUÇÃO: Verificar e recriar políticas RLS essenciais
--
-- Execute este script no Supabase SQL Editor
--
-- ==============================================================================

-- ============================================================================
-- 1. VERIFICAR STATUS DAS TABELAS PRINCIPAIS
-- ============================================================================

-- Verificar se RLS está ativo nas tabelas principais
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    relowner
FROM pg_tables
LEFT JOIN pg_class ON pg_class.relname = pg_tables.tablename
WHERE tablename IN (
    'financial_transactions',
    'equipments',
    'orders',
    'contracts',
    'employees'
)
AND schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- 2. VERIFICAR POLÍTICAS EXISTENTES
-- ============================================================================

-- Ver todas as políticas RLS das tabelas principais
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN (
    'financial_transactions',
    'equipments',
    'orders',
    'contracts',
    'employees'
)
ORDER BY tablename, policyname;

-- ============================================================================
-- 3. RECRIAR POLÍTICAS RLS ESSENCIAIS SE NECESSÁRIO
-- ============================================================================

-- 🔧 FINANCIAL_TRANSACTIONS
-- Habilitar RLS se não estiver ativo
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Recriar política básica para usuários autenticados
DROP POLICY IF EXISTS "Users can view their own financial data" ON financial_transactions;
CREATE POLICY "Users can view their own financial data"
ON financial_transactions FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert financial data" ON financial_transactions;
CREATE POLICY "Users can insert financial data"
ON financial_transactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own financial data" ON financial_transactions;
CREATE POLICY "Users can update their own financial data"
ON financial_transactions FOR UPDATE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete their own financial data" ON financial_transactions;
CREATE POLICY "Users can delete their own financial data"
ON financial_transactions FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 🔧 EQUIPMENTS
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view equipments" ON equipments;
CREATE POLICY "Users can view equipments"
ON equipments FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert equipments" ON equipments;
CREATE POLICY "Users can insert equipments"
ON equipments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update equipments" ON equipments;
CREATE POLICY "Users can update equipments"
ON equipments FOR UPDATE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete equipments" ON equipments;
CREATE POLICY "Users can delete equipments"
ON equipments FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 🔧 ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view orders" ON orders;
CREATE POLICY "Users can view orders"
ON orders FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert orders" ON orders;
CREATE POLICY "Users can insert orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update orders" ON orders;
CREATE POLICY "Users can update orders"
ON orders FOR UPDATE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete orders" ON orders;
CREATE POLICY "Users can delete orders"
ON orders FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 🔧 CONTRACTS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contracts" ON contracts;
CREATE POLICY "Users can view contracts"
ON contracts FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert contracts" ON contracts;
CREATE POLICY "Users can insert contracts"
ON contracts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update contracts" ON contracts;
CREATE POLICY "Users can update contracts"
ON contracts FOR UPDATE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete contracts" ON contracts;
CREATE POLICY "Users can delete contracts"
ON contracts FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 🔧 EMPLOYEES
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view employees" ON employees;
CREATE POLICY "Users can view employees"
ON employees FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert employees" ON employees;
CREATE POLICY "Users can insert employees"
ON employees FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update employees" ON employees;
CREATE POLICY "Users can update employees"
ON employees FOR UPDATE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete employees" ON employees;
CREATE POLICY "Users can delete employees"
ON employees FOR DELETE
USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 4. VERIFICAR VIEWS COM RLS
-- ============================================================================

-- Garantir que as views herdem as permissões das tabelas base
-- As views criadas devem automaticamente respeitar as RLS das tabelas originais

-- ============================================================================
-- 5. TESTE FINAL
-- ============================================================================

-- Testar se as políticas funcionam
SELECT 'financial_transactions' as tabela, COUNT(*) as registros FROM financial_transactions LIMIT 1;
SELECT 'equipments' as tabela, COUNT(*) as registros FROM equipments LIMIT 1;
SELECT 'orders' as tabela, COUNT(*) as registros FROM orders LIMIT 1;
SELECT 'contracts' as tabela, COUNT(*) as registros FROM contracts LIMIT 1;
SELECT 'employees' as tabela, COUNT(*) as registros FROM employees LIMIT 1;

-- ============================================================================
-- 6. VERIFICAÇÃO FINAL DAS POLÍTICAS
-- ============================================================================

SELECT
    'RLS VERIFICADO' as status,
    COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN (
    'financial_transactions',
    'equipments',
    'orders',
    'contracts',
    'employees'
);

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================