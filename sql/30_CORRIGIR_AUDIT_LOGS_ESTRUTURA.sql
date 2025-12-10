-- ==============================================================================
-- CORRIGIR ESTRUTURA DA TABELA AUDIT_LOGS
-- ==============================================================================

-- 1. Verificar estrutura atual da tabela audit_logs
SELECT
    'ESTRUTURA ATUAL AUDIT_LOGS' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Adicionar colunas necessárias se não existirem
DO $$
BEGIN
    -- Verificar e adicionar table_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'table_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN table_name TEXT;
        RAISE NOTICE '✅ Coluna table_name adicionada à audit_logs';
    ELSE
        RAISE NOTICE '✅ Coluna table_name já existe';
    END IF;

    -- Verificar e adicionar record_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'record_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN record_id TEXT;
        RAISE NOTICE '✅ Coluna record_id adicionada à audit_logs';
    ELSE
        RAISE NOTICE '✅ Coluna record_id já existe';
    END IF;

    -- Verificar e adicionar action
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'action'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN action TEXT;
        RAISE NOTICE '✅ Coluna action adicionada à audit_logs';
    ELSE
        RAISE NOTICE '✅ Coluna action já existe';
    END IF;

    -- Verificar e adicionar user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN user_id UUID;
        RAISE NOTICE '✅ Coluna user_id adicionada à audit_logs';
    ELSE
        RAISE NOTICE '✅ Coluna user_id já existe';
    END IF;

    -- Verificar e adicionar user_email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'user_email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN user_email TEXT;
        RAISE NOTICE '✅ Coluna user_email adicionada à audit_logs';
    ELSE
        RAISE NOTICE '✅ Coluna user_email já existe';
    END IF;

    -- Verificar e adicionar old_data
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'old_data'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN old_data JSONB;
        RAISE NOTICE '✅ Coluna old_data adicionada à audit_logs';
    ELSE
        RAISE NOTICE '✅ Coluna old_data já existe';
    END IF;

    -- Verificar e adicionar new_data
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'new_data'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN new_data JSONB;
        RAISE NOTICE '✅ Coluna new_data adicionada à audit_logs';
    ELSE
        RAISE NOTICE '✅ Coluna new_data já existe';
    END IF;

    -- Verificar e adicionar created_at se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'created_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Coluna created_at adicionada à audit_logs';
    ELSE
        RAISE NOTICE '✅ Coluna created_at já existe';
    END IF;
END
$$;

-- 3. Verificar estrutura após correção
SELECT
    'ESTRUTURA APÓS CORREÇÃO' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Testar se a função log_audit funciona agora
DO $$
DECLARE
    test_doc_id UUID;
BEGIN
    -- Buscar um documento para testar
    SELECT id INTO test_doc_id
    FROM employee_documents
    WHERE deleted_at IS NULL
    LIMIT 1;

    IF test_doc_id IS NOT NULL THEN
        -- Testar soft delete (deve funcionar agora)
        UPDATE employee_documents
        SET deleted_at = NOW()
        WHERE id = test_doc_id;

        RAISE NOTICE '✅ Teste de employee soft delete funcionou (doc: %)', test_doc_id;

        -- Reverter o teste
        UPDATE employee_documents
        SET deleted_at = NULL
        WHERE id = test_doc_id;

        RAISE NOTICE '✅ Teste revertido com sucesso';
    ELSE
        RAISE NOTICE 'ℹ️ Nenhum documento encontrado para teste';
    END IF;
END
$$;

-- 5. Também adicionar deleted_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee_documents'
        AND column_name = 'deleted_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE employee_documents ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna deleted_at adicionada à employee_documents';
    ELSE
        RAISE NOTICE '✅ Coluna deleted_at já existe em employee_documents';
    END IF;
END
$$;

SELECT '🎯 AUDIT_LOGS E EMPLOYEE_DOCUMENTS CORRIGIDOS!' as resultado;