-- ==============================================================================
-- DESABILITAR APENAS TRIGGERS CUSTOMIZADOS
-- ==============================================================================

-- Primeiro, ver quais triggers existem (que não são do sistema)
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('contracts', 'equipments', 'orders', 'financial_transactions')
AND trigger_name NOT LIKE '%ConstraintTrigger%'
AND trigger_name NOT LIKE 'RI_%'
ORDER BY event_object_table, trigger_name;

-- Desabilitar apenas triggers customizados específicos
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Buscar triggers customizados (não do sistema)
    FOR trigger_record IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
        AND event_object_table IN ('contracts', 'equipments', 'orders', 'financial_transactions')
        AND trigger_name NOT LIKE '%ConstraintTrigger%'
        AND trigger_name NOT LIKE 'RI_%'
        AND trigger_name NOT LIKE '%_pkey%'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I',
                trigger_record.event_object_table,
                trigger_record.trigger_name);
            RAISE NOTICE '🔇 Trigger desabilitado: %.%',
                trigger_record.event_object_table,
                trigger_record.trigger_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Não foi possível desabilitar trigger %.%: %',
                    trigger_record.event_object_table,
                    trigger_record.trigger_name,
                    SQLERRM;
        END;
    END LOOP;
END
$$;

-- Verificar triggers restantes
SELECT
    'TRIGGERS CUSTOMIZADOS RESTANTES' as status,
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('contracts', 'equipments', 'orders', 'financial_transactions')
AND trigger_name NOT LIKE '%ConstraintTrigger%'
AND trigger_name NOT LIKE 'RI_%'
ORDER BY event_object_table;

SELECT '✅ TRIGGERS CUSTOMIZADOS PROCESSADOS!' as resultado;