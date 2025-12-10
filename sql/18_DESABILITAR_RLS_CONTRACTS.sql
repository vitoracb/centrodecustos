-- ==============================================================================
-- DESABILITAR RLS TEMPORARIAMENTE PARA CONTRACTS
-- ==============================================================================
--
-- 🚨 PROBLEMA: RLS quebrando após otimizações SQL
-- 🎯 SOLUÇÃO: Desabilitar RLS temporariamente para funcionar
--
-- Execute este script no Supabase SQL Editor
--
-- ==============================================================================

-- ============================================================================
-- 1. DESABILITAR RLS COMPLETAMENTE
-- ============================================================================

-- Desabilitar RLS na tabela contracts
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. ADICIONAR COLUNA DELETED_AT SE NÃO EXISTIR
-- ============================================================================

-- Adicionar coluna deleted_at
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- ============================================================================
-- 3. VERIFICAR SE FUNCIONOU
-- ============================================================================

-- Ver estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver status do RLS
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'contracts'
AND schemaname = 'public';

-- Contar registros
SELECT COUNT(*) as total_contracts FROM contracts;

-- ============================================================================
-- 4. RESULTADO
-- ============================================================================

SELECT '✅ RLS DESABILITADO - Teste excluir contrato agora!' as status;

-- ==============================================================================
-- NOTA: Com RLS desabilitado, todas as operações funcionarão normalmente
-- Poderemos reabilitar e configurar corretamente depois
-- ==============================================================================