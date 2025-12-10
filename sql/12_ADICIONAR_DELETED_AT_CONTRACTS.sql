-- ==============================================================================
-- ADICIONAR COLUNA DELETED_AT NA TABELA CONTRACTS
-- ==============================================================================
--
-- 🚨 PROBLEMA: Coluna "deleted_at" não existe na tabela contracts
-- 🎯 SOLUÇÃO: Adicionar coluna deleted_at para soft delete
--
-- Execute este script no Supabase SQL Editor
--
-- ==============================================================================

-- ============================================================================
-- 1. VERIFICAR SE A TABELA CONTRACTS EXISTE
-- ============================================================================

SELECT
    tablename,
    schemaname
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'contracts';

-- ============================================================================
-- 2. VERIFICAR COLUNAS ATUAIS DA TABELA CONTRACTS
-- ============================================================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. ADICIONAR COLUNA DELETED_AT SE NÃO EXISTIR
-- ============================================================================

DO $$
BEGIN
    -- Verifica se a coluna deleted_at já existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contracts'
        AND column_name = 'deleted_at'
        AND table_schema = 'public'
    ) THEN
        -- Adiciona a coluna deleted_at
        ALTER TABLE contracts ADD COLUMN deleted_at TIMESTAMPTZ NULL;

        -- Adiciona comentário para documentação
        COMMENT ON COLUMN contracts.deleted_at IS 'Timestamp para soft delete - quando não é NULL, o registro foi deletado';

        -- Adiciona índice para performance em consultas que filtram registros não-deletados
        CREATE INDEX IF NOT EXISTS contracts_deleted_at_idx ON contracts (deleted_at);

        RAISE NOTICE 'Coluna deleted_at adicionada com sucesso na tabela contracts';
    ELSE
        RAISE NOTICE 'Coluna deleted_at já existe na tabela contracts';
    END IF;
END
$$;

-- ============================================================================
-- 4. VERIFICAR SE A COLUNA FOI ADICIONADA
-- ============================================================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
AND column_name = 'deleted_at'
AND table_schema = 'public';

-- ============================================================================
-- 5. ATUALIZAR RLS POLICIES PARA CONSIDERAR SOFT DELETE
-- ============================================================================

-- Política de leitura: excluir registros deletados
DROP POLICY IF EXISTS "Enable read for authenticated users" ON contracts;
CREATE POLICY "Enable read for authenticated users"
ON contracts FOR SELECT
USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- Política de atualização: permitir apenas se não foi deletado
DROP POLICY IF EXISTS "Enable update for authenticated users" ON contracts;
CREATE POLICY "Enable update for authenticated users"
ON contracts FOR UPDATE
USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- Política de inserção: mantém como estava
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON contracts;
CREATE POLICY "Enable insert for authenticated users"
ON contracts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Política de delete: permitir soft delete
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON contracts;
CREATE POLICY "Enable delete for authenticated users"
ON contracts FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 6. TESTE DA COLUNA
-- ============================================================================

-- Testar se conseguimos fazer update com deleted_at
SELECT 'Teste da coluna deleted_at' as status;

-- Verificar quantos contratos existem
SELECT
    COUNT(*) as total_contracts,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_contracts,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_contracts
FROM contracts;

-- ============================================================================
-- 7. VERIFICAÇÃO FINAL
-- ============================================================================

SELECT '✅ COLUNA DELETED_AT ADICIONADA - Teste a exclusão de contratos agora!' as status;

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================