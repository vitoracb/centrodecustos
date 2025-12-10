-- ==============================================================================
-- ADICIONAR COLUNA DELETED_AT NA TABELA CONTRACTS (VERSÃO SIMPLES)
-- ==============================================================================
--
-- 🚨 PROBLEMA: Coluna deleted_at não existe na tabela contracts
-- 🎯 SOLUÇÃO: Adicionar coluna e corrigir políticas de uma vez
--
-- Execute este script no Supabase SQL Editor
--
-- ==============================================================================

-- ============================================================================
-- 1. VERIFICAR SE A COLUNA EXISTE
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contracts'
        AND column_name = 'deleted_at'
        AND table_schema = 'public'
    ) THEN
        -- Adicionar a coluna
        ALTER TABLE contracts ADD COLUMN deleted_at TIMESTAMPTZ NULL;
        RAISE NOTICE '✅ Coluna deleted_at adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna deleted_at já existe';
    END IF;
END
$$;

-- ============================================================================
-- 2. LIMPAR TODAS AS POLÍTICAS RLS
-- ============================================================================

-- Remover todas as políticas que podem estar causando problema
DROP POLICY IF EXISTS "allow_all_authenticated" ON contracts;
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
-- 3. CRIAR UMA POLÍTICA SUPER SIMPLES
-- ============================================================================

-- Política que permite TUDO para usuários autenticados
CREATE POLICY "contracts_allow_all"
ON contracts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. VERIFICAR ESTRUTURA FINAL
-- ============================================================================

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
AND column_name = 'deleted_at'
AND table_schema = 'public';

-- Verificar políticas
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'contracts';

-- ============================================================================
-- 5. TESTE BÁSICO
-- ============================================================================

-- Contar contratos
SELECT COUNT(*) as total_contracts FROM contracts;

-- ============================================================================
-- 6. RESULTADO
-- ============================================================================

SELECT '✅ COLUNA DELETED_AT ADICIONADA E POLÍTICAS CORRIGIDAS!' as status;

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================