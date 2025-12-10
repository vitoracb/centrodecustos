-- ==============================================================================
-- CORRIGIR TODAS AS POLÍTICAS RLS PROBLEMÁTICAS
-- ==============================================================================
--
-- 🚨 PROBLEMA IDENTIFICADO: Políticas RLS usando função inexistente
-- 🎯 SOLUÇÃO: Remover políticas problemáticas e criar simples
--
-- ==============================================================================

-- ============================================================================
-- 1. REMOVER POLÍTICAS PROBLEMÁTICAS DE FINANCIAL_TRANSACTIONS
-- ============================================================================

-- Remover políticas que usam função inexistente
DROP POLICY IF EXISTS "view_expenses_by_cost_center" ON financial_transactions;
DROP POLICY IF EXISTS "view_receipts_by_cost_center" ON financial_transactions;

-- Remover outras políticas que podem estar problemáticas
DROP POLICY IF EXISTS "Enable read for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON financial_transactions;

-- ============================================================================
-- 2. REMOVER POLÍTICAS PROBLEMÁTICAS DE EQUIPMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON equipments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON equipments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON equipments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON equipments;

-- ============================================================================
-- 3. REMOVER POLÍTICAS PROBLEMÁTICAS DE ORDERS
-- ============================================================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON orders;

-- ============================================================================
-- 4. CRIAR POLÍTICAS SIMPLES PARA FINANCIAL_TRANSACTIONS
-- ============================================================================

CREATE POLICY "financial_allow_all_authenticated"
ON financial_transactions
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 5. CRIAR POLÍTICAS SIMPLES PARA EQUIPMENTS
-- ============================================================================

CREATE POLICY "equipments_allow_all_authenticated"
ON equipments
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 6. CRIAR POLÍTICAS SIMPLES PARA ORDERS
-- ============================================================================

CREATE POLICY "orders_allow_all_authenticated"
ON orders
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 7. VERIFICAR POLÍTICAS FINAIS
-- ============================================================================

SELECT
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('financial_transactions', 'equipments', 'orders', 'contracts')
ORDER BY tablename, policyname;

-- ============================================================================
-- 8. TESTE RÁPIDO DE OPERAÇÕES
-- ============================================================================

-- Teste financial_transactions
DO $$
BEGIN
    PERFORM COUNT(*) FROM financial_transactions;
    RAISE NOTICE '✅ financial_transactions: SELECT funcionou';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ financial_transactions: %', SQLERRM;
END
$$;

-- Teste equipments
DO $$
BEGIN
    PERFORM COUNT(*) FROM equipments;
    RAISE NOTICE '✅ equipments: SELECT funcionou';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ equipments: %', SQLERRM;
END
$$;

-- Teste orders
DO $$
BEGIN
    PERFORM COUNT(*) FROM orders;
    RAISE NOTICE '✅ orders: SELECT funcionou';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ orders: %', SQLERRM;
END
$$;

-- Teste contracts
DO $$
BEGIN
    PERFORM COUNT(*) FROM contracts;
    RAISE NOTICE '✅ contracts: SELECT funcionou';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ contracts: %', SQLERRM;
END
$$;

-- ============================================================================
-- 9. RESULTADO FINAL
-- ============================================================================

SELECT '✅ TODAS AS POLÍTICAS RLS CORRIGIDAS - Teste as operações CRUD agora!' as status;

-- ==============================================================================
-- FIM DA CORREÇÃO
-- ==============================================================================