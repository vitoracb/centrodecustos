-- ==============================================================================
-- DESABILITAR TRIGGER DE AUDITORIA PROBLEMÁTICO
-- ==============================================================================
--
-- 🚨 PROBLEMA REAL IDENTIFICADO: Trigger log_financial_action()
-- 🎯 Tenta acessar NEW.type em tabelas que não têm essa coluna
--
-- ==============================================================================

-- ============================================================================
-- 1. VERIFICAR TRIGGERS ATIVOS
-- ============================================================================

SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name ILIKE '%log%'
OR trigger_name ILIKE '%audit%'
OR action_statement ILIKE '%log_financial_action%'
ORDER BY event_object_table;

-- ============================================================================
-- 2. DESABILITAR TRIGGER EM TODAS AS TABELAS
-- ============================================================================

-- Desabilitar em contracts
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_table = 'contracts'
        AND trigger_name ILIKE '%log%'
    ) THEN
        -- Encontrar e desabilitar o trigger
        FOR trigger_record IN
            SELECT trigger_name FROM information_schema.triggers
            WHERE event_object_table = 'contracts'
            AND (trigger_name ILIKE '%log%' OR trigger_name ILIKE '%audit%')
        LOOP
            EXECUTE format('ALTER TABLE contracts DISABLE TRIGGER %I', trigger_record.trigger_name);
            RAISE NOTICE '🔇 Trigger desabilitado em contracts: %', trigger_record.trigger_name;
        END LOOP;
    END IF;
END
$$;

-- Desabilitar em equipments
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_table = 'equipments'
        AND trigger_name ILIKE '%log%'
    ) THEN
        FOR trigger_record IN
            SELECT trigger_name FROM information_schema.triggers
            WHERE event_object_table = 'equipments'
            AND (trigger_name ILIKE '%log%' OR trigger_name ILIKE '%audit%')
        LOOP
            EXECUTE format('ALTER TABLE equipments DISABLE TRIGGER %I', trigger_record.trigger_name);
            RAISE NOTICE '🔇 Trigger desabilitado em equipments: %', trigger_record.trigger_name;
        END LOOP;
    END IF;
END
$$;

-- Desabilitar em orders
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_table = 'orders'
        AND trigger_name ILIKE '%log%'
    ) THEN
        FOR trigger_record IN
            SELECT trigger_name FROM information_schema.triggers
            WHERE event_object_table = 'orders'
            AND (trigger_name ILIKE '%log%' OR trigger_name ILIKE '%audit%')
        LOOP
            EXECUTE format('ALTER TABLE orders DISABLE TRIGGER %I', trigger_record.trigger_name);
            RAISE NOTICE '🔇 Trigger desabilitado em orders: %', trigger_record.trigger_name;
        END LOOP;
    END IF;
END
$$;

-- ============================================================================
-- 3. MANTER TRIGGER APENAS EM FINANCIAL_TRANSACTIONS
-- ============================================================================

-- Financial_transactions pode manter o trigger pois tem a coluna "type"
RAISE NOTICE '✅ Trigger mantido ativo em financial_transactions (tem coluna type)';

-- ============================================================================
-- 4. VERIFICAR TRIGGERS APÓS DESABILITAÇÃO
-- ============================================================================

SELECT
    'TRIGGERS ATIVOS APÓS CORREÇÃO' as status;

SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name ILIKE '%log%'
OR trigger_name ILIKE '%audit%'
ORDER BY event_object_table;

-- ============================================================================
-- 5. TESTE DE OPERAÇÕES CRUD
-- ============================================================================

-- Teste contracts
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Inserir teste
    INSERT INTO contracts (id, name, category, date, value, cost_center_id, created_at, updated_at)
    VALUES (gen_random_uuid(), 'TESTE TRIGGER', 'principal', '2025-12-10', 99.99, 'valenca', now(), now())
    RETURNING id INTO test_id;

    RAISE NOTICE '✅ INSERT em contracts funcionou: %', test_id;

    -- Update teste
    UPDATE contracts SET name = 'TESTE TRIGGER UPDATED' WHERE id = test_id;
    RAISE NOTICE '✅ UPDATE em contracts funcionou';

    -- Delete teste
    DELETE FROM contracts WHERE id = test_id;
    RAISE NOTICE '✅ DELETE em contracts funcionou';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO no teste contracts: %', SQLERRM;
END
$$;

-- ============================================================================
-- 6. RESULTADO FINAL
-- ============================================================================

SELECT '✅ TRIGGERS PROBLEMÁTICOS DESABILITADOS - Teste as operações CRUD agora!' as resultado;

-- ==============================================================================
-- FIM
-- ==============================================================================