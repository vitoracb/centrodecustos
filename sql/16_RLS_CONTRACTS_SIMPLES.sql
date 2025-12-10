-- ==============================================================================
-- CRIAR POLÍTICAS RLS SIMPLES E PERMISSIVAS PARA CONTRACTS
-- ==============================================================================
--
-- 🚨 PROBLEMA: Políticas RLS muito restritivas impedem operações
-- 🎯 SOLUÇÃO: Políticas simples que permitem todas as operações para usuários autenticados
--
-- Execute este script no Supabase SQL Editor
--
-- ==============================================================================

-- ============================================================================
-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES
-- ============================================================================

-- Remover todas as políticas atuais que podem estar causando problemas
DROP POLICY IF EXISTS "contracts_select_policy" ON contracts;
DROP POLICY IF EXISTS "contracts_insert_policy" ON contracts;
DROP POLICY IF EXISTS "contracts_update_policy" ON contracts;
DROP POLICY IF EXISTS "contracts_delete_policy" ON contracts;
DROP POLICY IF EXISTS "All can view contracts" ON contracts;
DROP POLICY IF EXISTS "Allow all operations on contracts" ON contracts;
DROP POLICY IF EXISTS "Editors and ademins can insert contracts" ON contracts;
DROP POLICY IF EXISTS "Editors and ademins can update contracts" ON contracts;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON contracts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON contracts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON contracts;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON contracts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON contracts;
DROP POLICY IF EXISTS "Only admins can delete contracts" ON contracts;

-- ============================================================================
-- 2. CRIAR POLÍTICAS MUITO SIMPLES E PERMISSIVAS
-- ============================================================================

-- Política simples: usuários autenticados podem fazer TUDO
CREATE POLICY "allow_all_authenticated"
ON contracts
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 3. VERIFICAR AS POLÍTICAS CRIADAS
-- ============================================================================

SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'contracts'
ORDER BY policyname;

-- ============================================================================
-- 4. TESTE IMEDIATO DE SOFT DELETE
-- ============================================================================

DO $$
DECLARE
    test_id UUID;
    original_deleted_at TIMESTAMPTZ;
BEGIN
    -- Pegar um contrato para testar
    SELECT id, deleted_at INTO test_id, original_deleted_at
    FROM contracts
    LIMIT 1;

    IF test_id IS NOT NULL THEN
        RAISE NOTICE 'Testando soft delete para contrato ID: %', test_id;

        -- Fazer soft delete
        UPDATE contracts
        SET deleted_at = NOW()
        WHERE id = test_id;

        RAISE NOTICE '✅ Soft delete executado com sucesso!';

        -- Reverter para o estado original
        UPDATE contracts
        SET deleted_at = original_deleted_at
        WHERE id = test_id;

        RAISE NOTICE '✅ Estado original restaurado';
    ELSE
        RAISE NOTICE '❌ Nenhum contrato encontrado para testar';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro no teste: %', SQLERRM;
END
$$;

-- ============================================================================
-- 5. RESULTADO
-- ============================================================================

SELECT '✅ POLÍTICAS RLS SIMPLIFICADAS - Teste excluir contrato agora!' as status;

-- ==============================================================================
-- FIM DO SCRIPT SIMPLES
-- ==============================================================================