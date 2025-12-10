-- ==============================================================================
-- CORRIGIR FUNÇÃO DE AUDITORIA PARA INCLUIR ENTITY_TYPE
-- ==============================================================================

-- 1. Verificar estrutura completa da audit_logs
SELECT
    'ESTRUTURA COMPLETA AUDIT_LOGS' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar função log_audit atual
SELECT
    'FUNÇÃO LOG_AUDIT ATUAL' as info,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'log_audit'
AND routine_schema = 'public';

-- 3. Corrigir função log_audit para incluir entity_type
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_user UUID;
    v_email TEXT;
    v_action TEXT;
    v_record_id TEXT;
    v_entity_type TEXT;
BEGIN
    -- Capturar usuário atual (se disponível)
    BEGIN
        v_user := COALESCE(
            (current_setting('request.jwt.claims', true)::JSON->>'sub')::UUID,
            NULL
        );
        v_email := COALESCE(
            current_setting('request.jwt.claims', true)::JSON->>'email',
            'system'
        );
    EXCEPTION WHEN OTHERS THEN
        v_user := NULL;
        v_email := 'system';
    END;

    -- Determinar ação
    IF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_record_id := OLD.id::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_record_id := NEW.id::TEXT;
    END IF;

    -- Determinar entity_type baseado na tabela
    CASE TG_TABLE_NAME
        WHEN 'employee_documents' THEN v_entity_type := 'employee_document';
        WHEN 'expense_documents' THEN v_entity_type := 'expense_document';
        WHEN 'financial_transactions' THEN v_entity_type := 'transaction';
        WHEN 'contracts' THEN v_entity_type := 'contract';
        WHEN 'equipments' THEN v_entity_type := 'equipment';
        WHEN 'orders' THEN v_entity_type := 'order';
        ELSE v_entity_type := TG_TABLE_NAME;
    END CASE;

    -- Inserir log de auditoria
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            entity_type,
            table_name,
            record_id,
            action,
            user_id,
            user_email,
            old_data,
            new_data
        ) VALUES (
            v_entity_type,
            TG_TABLE_NAME::text,
            v_record_id,
            v_action,
            v_user,
            v_email,
            to_jsonb(OLD),
            NULL
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            entity_type,
            table_name,
            record_id,
            action,
            user_id,
            user_email,
            old_data,
            new_data
        ) VALUES (
            v_entity_type,
            TG_TABLE_NAME::text,
            v_record_id,
            v_action,
            v_user,
            v_email,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            entity_type,
            table_name,
            record_id,
            action,
            user_id,
            user_email,
            old_data,
            new_data
        ) VALUES (
            v_entity_type,
            TG_TABLE_NAME::text,
            v_record_id,
            v_action,
            v_user,
            v_email,
            NULL,
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Testar a função corrigida
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
        RAISE NOTICE 'Testando com documento: %', test_doc_id;

        -- Testar soft delete (deve funcionar agora)
        UPDATE employee_documents
        SET deleted_at = NOW()
        WHERE id = test_doc_id;

        RAISE NOTICE '✅ Teste de employee soft delete funcionou!';

        -- Reverter o teste
        UPDATE employee_documents
        SET deleted_at = NULL
        WHERE id = test_doc_id;

        RAISE NOTICE '✅ Teste revertido com sucesso';

        -- Verificar se o audit log foi criado
        IF EXISTS (
            SELECT 1 FROM audit_logs
            WHERE table_name = 'employee_documents'
            AND record_id = test_doc_id::text
            AND entity_type = 'employee_document'
        ) THEN
            RAISE NOTICE '✅ Audit log criado corretamente';
        ELSE
            RAISE NOTICE '⚠️ Audit log não encontrado';
        END IF;

    ELSE
        RAISE NOTICE 'ℹ️ Nenhum documento encontrado para teste';
    END IF;
END
$$;

-- 5. Verificar logs de auditoria recentes
SELECT
    'ÚLTIMOS AUDIT LOGS' as info,
    entity_type,
    table_name,
    action,
    user_email,
    created_at
FROM audit_logs
WHERE table_name = 'employee_documents'
ORDER BY created_at DESC
LIMIT 5;

SELECT '🎯 FUNÇÃO DE AUDITORIA CORRIGIDA - EMPLOYEE DELETION DEVE FUNCIONAR!' as resultado;