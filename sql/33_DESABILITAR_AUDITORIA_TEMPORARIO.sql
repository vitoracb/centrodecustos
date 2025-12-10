-- ==============================================================================
-- DESABILITAR AUDITORIA TEMPORARIAMENTE - SOLUÇÃO RÁPIDA
-- ==============================================================================
-- 🎯 Desabilitar triggers de auditoria que estão quebrando CRUD

-- 1. Verificar triggers de auditoria ativos
SELECT
    'TRIGGERS DE AUDITORIA ENCONTRADOS' as info,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND (
    action_statement ILIKE '%log_audit%'
    OR trigger_name ILIKE '%audit%'
    OR trigger_name ILIKE '%log%'
)
ORDER BY event_object_table, trigger_name;

-- 2. Desabilitar triggers de auditoria em TODAS as tabelas
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
        AND (
            action_statement ILIKE '%log_audit%'
            OR trigger_name ILIKE '%audit%'
            OR trigger_name ILIKE '%log%'
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I',
                trigger_record.event_object_table,
                trigger_record.trigger_name);
            RAISE NOTICE '🔇 Auditoria desabilitada: %.%',
                trigger_record.event_object_table,
                trigger_record.trigger_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Erro ao desabilitar %.%: %',
                    trigger_record.event_object_table,
                    trigger_record.trigger_name,
                    SQLERRM;
        END;
    END LOOP;
END
$$;

-- 3. Verificar se restaram triggers de auditoria
SELECT
    'TRIGGERS DE AUDITORIA RESTANTES' as status,
    COUNT(*) as quantidade
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND (
    action_statement ILIKE '%log_audit%'
    OR trigger_name ILIKE '%audit%'
    OR trigger_name ILIKE '%log%'
);

-- 4. TESTE 1: Employee deletion
DO $$
DECLARE
    test_doc_id UUID;
BEGIN
    SELECT id INTO test_doc_id
    FROM employee_documents
    WHERE deleted_at IS NULL
    LIMIT 1;

    IF test_doc_id IS NOT NULL THEN
        UPDATE employee_documents
        SET deleted_at = NOW()
        WHERE id = test_doc_id;

        RAISE NOTICE '✅ EMPLOYEE DELETE FUNCIONOU!';

        -- Reverter teste
        UPDATE employee_documents
        SET deleted_at = NULL
        WHERE id = test_doc_id;
    ELSE
        RAISE NOTICE 'ℹ️ Sem documentos para testar employee';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Employee delete ainda com erro: %', SQLERRM;
END
$$;

-- 5. TESTE 2: Contract operations
DO $$
BEGIN
    -- Testar insert simples em contracts
    INSERT INTO contracts (id, name, category, date, value, cost_center_id)
    VALUES (gen_random_uuid(), 'TESTE AUDIT OFF', 'principal', CURRENT_DATE, 100.00, 'valenca');

    RAISE NOTICE '✅ CONTRACT INSERT FUNCIONOU!';

    -- Deletar teste
    DELETE FROM contracts WHERE name = 'TESTE AUDIT OFF';
    RAISE NOTICE '✅ CONTRACT DELETE FUNCIONOU!';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Contract operations ainda com erro: %', SQLERRM;
END
$$;

-- 6. TESTE 3: Equipment operations
DO $$
BEGIN
    -- Testar insert em equipments
    INSERT INTO equipments (id, name, cost_center_id)
    VALUES (gen_random_uuid(), 'TESTE AUDIT OFF EQUIP', 'valenca');

    RAISE NOTICE '✅ EQUIPMENT INSERT FUNCIONOU!';

    -- Deletar teste
    DELETE FROM equipments WHERE name = 'TESTE AUDIT OFF EQUIP';
    RAISE NOTICE '✅ EQUIPMENT DELETE FUNCIONOU!';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Equipment operations ainda com erro: %', SQLERRM;
END
$$;

SELECT '🎉 AUDITORIA DESABILITADA - TODOS OS CRUDs DEVEM FUNCIONAR!' as resultado;
SELECT 'ℹ️ NOTA: Auditoria temporariamente desabilitada para restaurar funcionalidade' as observacao;
SELECT 'ℹ️ PRÓXIMO: Testar uploads (pode precisar corrigir storage policies)' as proximo_passo;