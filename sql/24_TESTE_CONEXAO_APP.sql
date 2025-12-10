-- ==============================================================================
-- TESTE DE CONEXÃO E SINCRONIZAÇÃO APP-BANCO
-- ==============================================================================
--
-- 🚨 App ainda reporta erro mesmo com coluna existindo
-- 🎯 Verificar se app está conectando no projeto/ambiente correto
--
-- ==============================================================================

-- ============================================================================
-- 1. INFORMAÇÕES DO PROJETO/BANCO ATUAL
-- ============================================================================

SELECT
    'INFORMAÇÕES DO PROJETO' as categoria,
    current_database() as database_name,
    current_user as user_name,
    inet_server_addr() as server_ip,
    inet_server_port() as server_port;

-- ============================================================================
-- 2. VERIFICAR ESTRUTURA EXATA DA TABELA CONTRACTS
-- ============================================================================

SELECT
    'ESTRUTURA TABELA CONTRACTS' as categoria;

SELECT
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'contracts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. CRIAR UM REGISTRO DE TESTE PARA VERIFICAR CONEXÃO
-- ============================================================================

-- Inserir registro de teste
INSERT INTO contracts (id, name, category, date, value, cost_center_id, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'TESTE CONEXAO APP-BANCO',
    'principal',
    '2025-12-10',
    99.99,
    'valenca',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Verificar se foi inserido
SELECT 'REGISTRO TESTE INSERIDO' as status;

-- ============================================================================
-- 4. TESTE DE SOFT DELETE NO REGISTRO DE TESTE
-- ============================================================================

DO $$
DECLARE
    test_record_id UUID;
BEGIN
    -- Pegar o ID do registro de teste
    SELECT id INTO test_record_id
    FROM contracts
    WHERE name = 'TESTE CONEXAO APP-BANCO'
    LIMIT 1;

    IF test_record_id IS NOT NULL THEN
        -- Tentar fazer soft delete
        UPDATE contracts
        SET deleted_at = now()
        WHERE id = test_record_id;

        RAISE NOTICE '✅ SOFT DELETE FUNCIONOU no banco para ID: %', test_record_id;

        -- Verificar se foi atualizado
        IF EXISTS (SELECT 1 FROM contracts WHERE id = test_record_id AND deleted_at IS NOT NULL) THEN
            RAISE NOTICE '✅ CONFIRMADO: deleted_at foi definido';
        ELSE
            RAISE NOTICE '❌ ERRO: deleted_at não foi definido';
        END IF;

        -- Limpar teste (reverter)
        UPDATE contracts
        SET deleted_at = NULL
        WHERE id = test_record_id;

    ELSE
        RAISE NOTICE '❌ Registro de teste não encontrado';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO no teste de soft delete: %', SQLERRM;
END
$$;

-- ============================================================================
-- 5. VERIFICAR SE APP VÊ O REGISTRO DE TESTE
-- ============================================================================

SELECT
    'REGISTROS VISÍVEIS PARA O APP' as categoria,
    COUNT(*) as total_contracts,
    COUNT(*) FILTER (WHERE name = 'TESTE CONEXAO APP-BANCO') as test_records
FROM contracts;

-- ============================================================================
-- 6. INFORMAÇÕES DA API REST (PostgREST)
-- ============================================================================

-- Verificar configurações que podem afetar a API
SELECT
    'CONFIGURAÇÕES API' as categoria,
    name,
    setting,
    context
FROM pg_settings
WHERE name IN (
    'pgrst.db_schema',
    'pgrst.db_anon_role',
    'pgrst.db_pool'
);

-- ============================================================================
-- 7. DIAGNÓSTICO FINAL
-- ============================================================================

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'contracts' AND column_name = 'deleted_at'
        )
        THEN '✅ BANCO: deleted_at existe'
        ELSE '❌ BANCO: deleted_at não existe'
    END as status_banco,

    CASE
        WHEN EXISTS (SELECT 1 FROM contracts WHERE name = 'TESTE CONEXAO APP-BANCO')
        THEN '✅ CONEXÃO: Registro teste visível'
        ELSE '❌ CONEXÃO: Registro teste não visível'
    END as status_conexao;

-- ============================================================================
-- 8. LIMPEZA
-- ============================================================================

-- Remover registro de teste
DELETE FROM contracts WHERE name = 'TESTE CONEXAO APP-BANCO';

SELECT '🔍 TESTE DE CONEXÃO CONCLUÍDO' as resultado_final;

-- ==============================================================================
-- FIM DO TESTE DE CONEXÃO
-- ==============================================================================