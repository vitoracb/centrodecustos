-- ============================================
-- CONFIGURAR RLS PERMISSIVO
-- Todos os usuários autenticados veem TODOS os centros
-- ============================================

-- ============================================
-- PASSO 1: ATIVAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 2: REMOVER POLÍTICAS ANTIGAS (SE EXISTIREM)
-- ============================================

-- Financial Transactions
DROP POLICY IF EXISTS "Users can view own center data" ON financial_transactions;
DROP POLICY IF EXISTS "Users can insert own center data" ON financial_transactions;
DROP POLICY IF EXISTS "Users can update own center data" ON financial_transactions;
DROP POLICY IF EXISTS "Users can delete own center data" ON financial_transactions;
DROP POLICY IF EXISTS "Users view own center" ON financial_transactions;
DROP POLICY IF EXISTS "Users insert own center" ON financial_transactions;
DROP POLICY IF EXISTS "Users update own center" ON financial_transactions;
DROP POLICY IF EXISTS "Users delete own center" ON financial_transactions;

-- Equipments
DROP POLICY IF EXISTS "Users can view own center data" ON equipments;
DROP POLICY IF EXISTS "Users can insert own center data" ON equipments;
DROP POLICY IF EXISTS "Users can update own center data" ON equipments;
DROP POLICY IF EXISTS "Users can delete own center data" ON equipments;
DROP POLICY IF EXISTS "Users view own center" ON equipments;
DROP POLICY IF EXISTS "Users insert own center" ON equipments;
DROP POLICY IF EXISTS "Users update own center" ON equipments;
DROP POLICY IF EXISTS "Users delete own center" ON equipments;

-- Employees
DROP POLICY IF EXISTS "Users can view own center data" ON employees;
DROP POLICY IF EXISTS "Users can insert own center data" ON employees;
DROP POLICY IF EXISTS "Users can update own center data" ON employees;
DROP POLICY IF EXISTS "Users can delete own center data" ON employees;
DROP POLICY IF EXISTS "Users view own center" ON employees;
DROP POLICY IF EXISTS "Users insert own center" ON employees;
DROP POLICY IF EXISTS "Users update own center" ON employees;
DROP POLICY IF EXISTS "Users delete own center" ON employees;

-- Contracts
DROP POLICY IF EXISTS "Users can view own center data" ON contracts;
DROP POLICY IF EXISTS "Users can insert own center data" ON contracts;
DROP POLICY IF EXISTS "Users can update own center data" ON contracts;
DROP POLICY IF EXISTS "Users can delete own center data" ON contracts;
DROP POLICY IF EXISTS "Users view own center" ON contracts;
DROP POLICY IF EXISTS "Users insert own center" ON contracts;
DROP POLICY IF EXISTS "Users update own center" ON contracts;
DROP POLICY IF EXISTS "Users delete own center" ON contracts;

-- Orders
DROP POLICY IF EXISTS "Users can view own center data" ON orders;
DROP POLICY IF EXISTS "Users can insert own center data" ON orders;
DROP POLICY IF EXISTS "Users can update own center data" ON orders;
DROP POLICY IF EXISTS "Users can delete own center data" ON orders;
DROP POLICY IF EXISTS "Users view own center" ON orders;
DROP POLICY IF EXISTS "Users insert own center" ON orders;
DROP POLICY IF EXISTS "Users update own center" ON orders;
DROP POLICY IF EXISTS "Users delete own center" ON orders;

-- User Permissions
DROP POLICY IF EXISTS "Users can view own center data" ON user_permissions;
DROP POLICY IF EXISTS "Users can insert own center data" ON user_permissions;
DROP POLICY IF EXISTS "Users can update own center data" ON user_permissions;
DROP POLICY IF EXISTS "Users can delete own center data" ON user_permissions;

-- ============================================
-- PASSO 3: CRIAR POLÍTICAS PERMISSIVAS
-- Todos os usuários autenticados têm acesso total
-- ============================================

-- FINANCIAL TRANSACTIONS
CREATE POLICY "Authenticated users can view all transactions"
ON financial_transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert transactions"
ON financial_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions"
ON financial_transactions FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete transactions"
ON financial_transactions FOR DELETE
TO authenticated
USING (true);

-- EQUIPMENTS
CREATE POLICY "Authenticated users can view all equipments"
ON equipments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert equipments"
ON equipments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipments"
ON equipments FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete equipments"
ON equipments FOR DELETE
TO authenticated
USING (true);

-- EMPLOYEES
CREATE POLICY "Authenticated users can view all employees"
ON employees FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert employees"
ON employees FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
ON employees FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete employees"
ON employees FOR DELETE
TO authenticated
USING (true);

-- CONTRACTS
CREATE POLICY "Authenticated users can view all contracts"
ON contracts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert contracts"
ON contracts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
ON contracts FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete contracts"
ON contracts FOR DELETE
TO authenticated
USING (true);

-- ORDERS
CREATE POLICY "Authenticated users can view all orders"
ON orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
ON orders FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete orders"
ON orders FOR DELETE
TO authenticated
USING (true);

-- USER PERMISSIONS
CREATE POLICY "Authenticated users can view all permissions"
ON user_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert permissions"
ON user_permissions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update permissions"
ON user_permissions FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete permissions"
ON user_permissions FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- PASSO 4: TORNAR STORAGE BUCKETS PRIVADOS
-- ============================================

UPDATE storage.buckets SET public = false WHERE public = true;

-- ============================================
-- PASSO 5: VERIFICAR CONFIGURAÇÃO
-- ============================================

-- Verificar RLS ativo
SELECT 
    tablename,
    rowsecurity as "RLS Ativo"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    )
ORDER BY tablename;

-- Verificar políticas
SELECT 
    tablename,
    COUNT(*) as "Nº Políticas"
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    )
GROUP BY tablename
ORDER BY tablename;

-- Verificar storage
SELECT 
    name,
    public
FROM storage.buckets;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ RLS ativo em 6 tabelas
-- ✅ 4 políticas por tabela (SELECT, INSERT, UPDATE, DELETE)
-- ✅ Todos os buckets com public = false
-- ✅ Usuários autenticados veem TODOS os centros
-- ✅ Usuários não autenticados não veem nada

-- ============================================
-- FIM DA CONFIGURAÇÃO
-- ============================================
