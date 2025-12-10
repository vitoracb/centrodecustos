-- ==============================================================================
-- FORÇAR ESTRUTURA DA TABELA CONTRACTS
-- ==============================================================================
--
-- 🚨 PROBLEMA PERSISTENTE: Erro mesmo com RLS desabilitado
-- 🎯 SOLUÇÃO: Verificar e forçar estrutura real da tabela
--
-- ==============================================================================

-- ============================================================================
-- 1. VERIFICAR CONEXÃO E SCHEMA ATUAL
-- ============================================================================

SELECT
    current_database() as database_name,
    current_schema() as current_schema,
    current_user as current_user,
    session_user as session_user;

-- ============================================================================
-- 2. VERIFICAR SE A TABELA CONTRACTS REALMENTE EXISTE
-- ============================================================================

SELECT
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables
WHERE tablename = 'contracts';

-- ============================================================================
-- 3. VER ESTRUTURA ATUAL COMPLETA DA TABELA CONTRACTS
-- ============================================================================

SELECT
    '=== ESTRUTURA ATUAL CONTRACTS ===' as titulo;

SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'contracts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 4. VERIFICAR SE DELETED_AT EXISTE (MÉTODO DIRETO)
-- ============================================================================

DO $$
DECLARE
    column_exists BOOLEAN := FALSE;
BEGIN
    -- Verificar se deleted_at existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contracts'
        AND column_name = 'deleted_at'
        AND table_schema = 'public'
    ) INTO column_exists;

    IF column_exists THEN
        RAISE NOTICE '✅ COLUNA deleted_at JÁ EXISTE';
    ELSE
        RAISE NOTICE '❌ COLUNA deleted_at NÃO EXISTE - Tentando criar...';

        -- Tentar criar a coluna
        BEGIN
            EXECUTE 'ALTER TABLE public.contracts ADD COLUMN deleted_at TIMESTAMPTZ NULL';
            RAISE NOTICE '✅ COLUNA deleted_at CRIADA COM SUCESSO';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ ERRO AO CRIAR COLUNA: %', SQLERRM;
        END;
    END IF;
END
$$;

-- ============================================================================
-- 5. FORÇAR REFRESH COMPLETO DO SUPABASE
-- ============================================================================

-- Limpar cache do PostgREST (Supabase API)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================================================
-- 6. TESTE DE OPERAÇÃO DIRETA NA TABELA
-- ============================================================================

-- Tentar um SELECT simples
DO $$
DECLARE
    contract_count INTEGER;
    first_contract_id UUID;
BEGIN
    -- SELECT básico
    SELECT COUNT(*) INTO contract_count FROM contracts;
    RAISE NOTICE '✅ SELECT funcionou: % contratos encontrados', contract_count;

    -- Pegar primeiro ID
    SELECT id INTO first_contract_id FROM contracts LIMIT 1;

    IF first_contract_id IS NOT NULL THEN
        RAISE NOTICE 'Primeiro contrato ID: %', first_contract_id;

        -- Tentar UPDATE com deleted_at
        BEGIN
            UPDATE contracts
            SET deleted_at = NOW()
            WHERE id = first_contract_id;

            RAISE NOTICE '✅ UPDATE com deleted_at FUNCIONOU!';

            -- Reverter
            UPDATE contracts
            SET deleted_at = NULL
            WHERE id = first_contract_id;

            RAISE NOTICE '✅ REVERTIDO com sucesso';

        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ UPDATE com deleted_at FALHOU: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Nenhum contrato encontrado para testar';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO NO TESTE GERAL: %', SQLERRM;
END
$$;

-- ============================================================================
-- 7. MOSTRAR ESTRUTURA FINAL
-- ============================================================================

SELECT
    '=== ESTRUTURA FINAL CONTRACTS ===' as titulo;

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
-- 8. DIAGNÓSTICO FINAL
-- ============================================================================

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'contracts'
            AND column_name = 'deleted_at'
            AND table_schema = 'public'
        )
        THEN '✅ DELETED_AT EXISTE NO BANCO - Problema pode ser cache/conexão do app'
        ELSE '❌ DELETED_AT AINDA NÃO EXISTE - Problema de permissão/estrutura do banco'
    END as diagnostico_final;

-- ============================================================================
-- 9. INFORMAÇÕES PARA DEBUG
-- ============================================================================

SELECT '=== INFORMAÇÕES PARA DEBUG ===' as titulo;

-- URL de conexão (sem credenciais)
SELECT
    current_setting('listen_addresses') as listen_addresses,
    current_setting('port') as port,
    inet_server_addr() as server_addr,
    inet_server_port() as server_port;

-- Versão do PostgreSQL
SELECT version() as postgresql_version;

-- ==============================================================================
-- FIM DO DIAGNÓSTICO AGRESSIVO
-- ==============================================================================