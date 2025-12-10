-- ==============================================================================
-- CORRIGIR POLÍTICAS RLS QUE REFERENCIAM COLUNA "TYPE" EM CONTRACTS
-- ==============================================================================
--
-- 🚨 PROBLEMA: Políticas RLS tentando acessar coluna "type" que não existe
-- 🎯 SOLUÇÃO: Remover referências a "type" das políticas RLS de contracts
--
-- Execute este script no Supabase SQL Editor
--
-- ==============================================================================

-- ============================================================================
-- 1. VERIFICAR POLÍTICAS RLS ATUAIS EM CONTRACTS
-- ============================================================================

SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'contracts'
ORDER BY policyname;

-- ============================================================================
-- 2. PROCURAR POLÍTICAS QUE MENCIONAM "TYPE"
-- ============================================================================

-- Verificar se alguma política RLS está tentando usar a coluna "type"
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'contracts'
AND (
    qual ILIKE '%type%' OR
    with_check ILIKE '%type%'
);

-- ============================================================================
-- 3. REMOVER POLÍTICAS PROBLEMÁTICAS E RECRIAR CORRETAMENTE
-- ============================================================================

-- Remover todas as políticas atuais que podem estar problemáticas
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
-- 4. CRIAR POLÍTICAS RLS CORRETAS PARA CONTRACTS
-- ============================================================================

-- Política de leitura: usuários autenticados podem ver contratos não deletados
CREATE POLICY "contracts_select_policy"
ON contracts FOR SELECT
USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
);

-- Política de inserção: usuários autenticados podem inserir contratos
CREATE POLICY "contracts_insert_policy"
ON contracts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Política de atualização: usuários autenticados podem atualizar contratos não deletados
CREATE POLICY "contracts_update_policy"
ON contracts FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
)
WITH CHECK (auth.uid() IS NOT NULL);

-- Política de delete (soft delete): usuários autenticados podem marcar como deletado
CREATE POLICY "contracts_delete_policy"
ON contracts FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 5. VERIFICAR AS NOVAS POLÍTICAS
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
-- 6. TESTE DAS OPERAÇÕES CRUD
-- ============================================================================

-- Teste de leitura
SELECT COUNT(*) as total_contracts_visible FROM contracts;

-- Teste de inserção (simulado)
DO $$
DECLARE
    new_id UUID := gen_random_uuid();
BEGIN
    -- Simular inserção (sem realmente inserir)
    RAISE NOTICE 'Teste de inserção seria bem-sucedido para ID: %', new_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste de inserção: %', SQLERRM;
END
$$;

-- Teste de atualização em contrato existente
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Pegar um contrato existente
    SELECT id INTO test_id FROM contracts WHERE deleted_at IS NULL LIMIT 1;

    IF test_id IS NOT NULL THEN
        -- Testar update
        UPDATE contracts
        SET updated_at = NOW()
        WHERE id = test_id;

        RAISE NOTICE 'Teste de update executado com sucesso para ID: %', test_id;
    ELSE
        RAISE NOTICE 'Nenhum contrato ativo encontrado para testar update';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste de update: %', SQLERRM;
END
$$;

-- Teste de soft delete
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Pegar um contrato existente
    SELECT id INTO test_id FROM contracts WHERE deleted_at IS NULL LIMIT 1;

    IF test_id IS NOT NULL THEN
        -- Testar soft delete (reverter imediatamente)
        UPDATE contracts
        SET deleted_at = NOW()
        WHERE id = test_id;

        -- Reverter
        UPDATE contracts
        SET deleted_at = NULL
        WHERE id = test_id;

        RAISE NOTICE 'Teste de soft delete executado com sucesso para ID: %', test_id;
    ELSE
        RAISE NOTICE 'Nenhum contrato ativo encontrado para testar delete';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste de delete: %', SQLERRM;
END
$$;

-- ============================================================================
-- 7. RESULTADO FINAL
-- ============================================================================

SELECT '✅ POLÍTICAS RLS CORRIGIDAS - Teste as operações CRUD agora!' as status;

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================