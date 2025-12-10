-- ==============================================================================
-- DESABILITAR TRIGGERS SIMPLES
-- ==============================================================================

-- Desabilitar todos os triggers em contracts
ALTER TABLE contracts DISABLE TRIGGER ALL;

-- Desabilitar todos os triggers em equipments
ALTER TABLE equipments DISABLE TRIGGER ALL;

-- Desabilitar todos os triggers em orders
ALTER TABLE orders DISABLE TRIGGER ALL;

-- Verificar triggers restantes
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('contracts', 'equipments', 'orders')
ORDER BY event_object_table;

-- Resultado
SELECT '✅ TRIGGERS DESABILITADOS - Teste as operações CRUD agora!' as status;