-- ==============================================================================
-- DIAGNÓSTICO COMPLETO DA TABELA CONTRACTS
-- ==============================================================================
--
-- 🚨 PROBLEMA: Ainda reporta que deleted_at não existe
-- 🎯 SOLUÇÃO: Verificar tudo e forçar criação da coluna
--
-- ==============================================================================

-- ============================================================================
-- 1. VERIFICAR SE A TABELA EXISTE
-- ============================================================================

SELECT
    'Tabela contracts existe?' as pergunta,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'contracts' AND schemaname = 'public')
        THEN '✅ SIM'
        ELSE '❌ NÃO'
    END as resposta;

-- ============================================================================
-- 2. VER TODAS AS COLUNAS DA TABELA CONTRACTS
-- ============================================================================

SELECT
    '=== COLUNAS DA TABELA CONTRACTS ===' as titulo;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'contracts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. VERIFICAR ESPECIFICAMENTE A COLUNA DELETED_AT
-- ============================================================================

SELECT
    'Coluna deleted_at existe?' as pergunta,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'contracts'
            AND column_name = 'deleted_at'
            AND table_schema = 'public'
        )
        THEN '✅ SIM'
        ELSE '❌ NÃO'
    END as resposta;

-- ============================================================================
-- 4. FORÇAR CRIAÇÃO DA COLUNA (MÉTODO DIRETO)
-- ============================================================================

-- Tentar criar a coluna usando diferentes métodos
DO $$
BEGIN
    -- Método 1: ADD COLUMN IF NOT EXISTS
    BEGIN
        ALTER TABLE public.contracts ADD COLUMN deleted_at TIMESTAMPTZ NULL;
        RAISE NOTICE '✅ Método 1: Coluna deleted_at adicionada com ALTER TABLE';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'ℹ️ Método 1: Coluna deleted_at já existe';
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Método 1 falhou: %', SQLERRM;
    END;

    -- Método 2: Verificar novamente se existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contracts'
        AND column_name = 'deleted_at'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '❌ CRITICAL: Coluna deleted_at AINDA NÃO EXISTE após tentativa de criação';
    ELSE
        RAISE NOTICE '✅ SUCESSO: Coluna deleted_at existe agora';
    END IF;
END
$$;

-- ============================================================================
-- 5. VERIFICAR STATUS DO RLS
-- ============================================================================

SELECT
    tablename,
    CASE WHEN c.relrowsecurity THEN '🔒 HABILITADO' ELSE '🔓 DESABILITADO' END as rls_status
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.tablename = 'contracts'
AND t.schemaname = 'public';

-- ============================================================================
-- 6. VER POLÍTICAS RLS EXISTENTES
-- ============================================================================

SELECT
    '=== POLÍTICAS RLS ===' as titulo;

SELECT
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'contracts'
ORDER BY policyname;

-- ============================================================================
-- 7. TESTE DE OPERAÇÕES BÁSICAS
-- ============================================================================

-- Tentar fazer SELECT
DO $$
DECLARE
    contract_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO contract_count FROM contracts;
    RAISE NOTICE '✅ SELECT funcionou: % contratos encontrados', contract_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ SELECT falhou: %', SQLERRM;
END
$$;

-- Tentar fazer UPDATE (se há registros)
DO $$
DECLARE
    test_id UUID;
BEGIN
    SELECT id INTO test_id FROM contracts LIMIT 1;

    IF test_id IS NOT NULL THEN
        -- Tentar update SEM deleted_at
        UPDATE contracts SET name = name WHERE id = test_id;
        RAISE NOTICE '✅ UPDATE básico funcionou para ID: %', test_id;

        -- Tentar update COM deleted_at
        BEGIN
            UPDATE contracts SET deleted_at = NOW() WHERE id = test_id;
            RAISE NOTICE '✅ UPDATE com deleted_at funcionou';

            -- Reverter
            UPDATE contracts SET deleted_at = NULL WHERE id = test_id;
            RAISE NOTICE '✅ Revertido com sucesso';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ UPDATE com deleted_at falhou: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'ℹ️ Nenhum contrato encontrado para testar UPDATE';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ UPDATE básico falhou: %', SQLERRM;
END
$$;

-- ============================================================================
-- 8. RESULTADO FINAL
-- ============================================================================

-- Mostrar estrutura final da tabela
SELECT
    '=== ESTRUTURA FINAL DA TABELA CONTRACTS ===' as titulo;

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Status final
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'contracts'
            AND column_name = 'deleted_at'
            AND table_schema = 'public'
        )
        THEN '✅ SUCESSO: Coluna deleted_at existe - pode testar no app'
        ELSE '❌ FALHA: Coluna deleted_at AINDA NÃO EXISTE - problema no banco'
    END as status_final;

-- ==============================================================================
-- FIM DO DIAGNÓSTICO
-- ==============================================================================