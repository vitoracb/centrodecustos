-- ==============================================================================
-- VERIFICAR E CORRIGIR COLUNA DELETED_AT EM EMPLOYEE_DOCUMENTS
-- ==============================================================================

-- 1. Verificar estrutura da tabela employee_documents
SELECT
    'COLUNAS DE EMPLOYEE_DOCUMENTS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_documents'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar se a coluna deleted_at existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee_documents'
        AND column_name = 'deleted_at'
        AND table_schema = 'public'
    ) THEN
        -- Adicionar coluna deleted_at se não existir
        ALTER TABLE employee_documents ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna deleted_at adicionada à tabela employee_documents';
    ELSE
        RAISE NOTICE '✅ Coluna deleted_at já existe na tabela employee_documents';
    END IF;
END
$$;

-- 3. Verificar estrutura após correção
SELECT
    'COLUNAS APÓS CORREÇÃO' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_documents'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Testar soft delete em employee_documents
DO $$
DECLARE
    test_doc_id UUID;
    affected_rows INTEGER;
BEGIN
    -- Buscar um documento existente para testar
    SELECT id INTO test_doc_id
    FROM employee_documents
    WHERE deleted_at IS NULL
    LIMIT 1;

    IF test_doc_id IS NOT NULL THEN
        -- Simular soft delete
        UPDATE employee_documents
        SET deleted_at = NOW()
        WHERE id = test_doc_id;

        GET DIAGNOSTICS affected_rows = ROW_COUNT;

        IF affected_rows > 0 THEN
            RAISE NOTICE '✅ Teste de soft delete funcionou (doc: %)', test_doc_id;

            -- Reverter o teste
            UPDATE employee_documents
            SET deleted_at = NULL
            WHERE id = test_doc_id;

            RAISE NOTICE '✅ Teste revertido com sucesso';
        ELSE
            RAISE NOTICE '⚠️ Nenhuma linha afetada no teste';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ Nenhum documento encontrado para teste';
    END IF;
END
$$;

-- 5. Verificar outras tabelas que podem precisar de deleted_at
SELECT
    'VERIFICANDO OUTRAS TABELAS' as info;

-- Verificar expense_documents
SELECT
    'expense_documents' as tabela,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_documents' AND column_name = 'deleted_at')
        THEN '✅ TEM deleted_at'
        ELSE '❌ NÃO TEM deleted_at'
    END as status;

-- Verificar contract_documents se existir
SELECT
    'contract_documents' as tabela,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_documents')
        THEN (
            CASE
                WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contract_documents' AND column_name = 'deleted_at')
                THEN '✅ TEM deleted_at'
                ELSE '❌ NÃO TEM deleted_at'
            END
        )
        ELSE 'Tabela não existe'
    END as status;

SELECT '🎯 EMPLOYEE DOCUMENTS DELETED_AT - VERIFICAÇÃO CONCLUÍDA!' as resultado;