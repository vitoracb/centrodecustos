-- ==============================================================================
-- INVESTIGAR PROBLEMA COM DESPESAS APÓS DESABILITAR AUDITORIA
-- ==============================================================================

-- 1. Verificar se despesas existem na tabela
SELECT
    'DESPESAS NA TABELA' as info,
    COUNT(*) as total_despesas,
    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as despesas_ativas,
    COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as despesas_deletadas
FROM financial_transactions
WHERE type = 'expense';

-- 2. Verificar últimas despesas criadas
SELECT
    'ÚLTIMAS 5 DESPESAS' as info,
    id,
    description,
    amount,
    date,
    cost_center_id,
    created_at,
    deleted_at
FROM financial_transactions
WHERE type = 'expense'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar triggers que foram desabilitados relacionados a financial_transactions
SELECT
    'TRIGGERS DESABILITADOS EM FINANCIAL_TRANSACTIONS' as info,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'financial_transactions'
AND trigger_name NOT LIKE '%ConstraintTrigger%'
AND trigger_name NOT LIKE 'RI_%'
ORDER BY trigger_name;

-- 4. Verificar se algum trigger é necessário para funcionalidade (não só auditoria)
SELECT
    'VERIFICANDO TRIGGERS CRÍTICOS' as info;

-- Verificar se existe trigger para cálculos ou atualizações
SELECT
    trigger_name,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'financial_transactions'
AND action_statement NOT ILIKE '%log_audit%'
AND action_statement NOT ILIKE '%audit_logs%'
ORDER BY trigger_name;

-- 5. Verificar views relacionadas a despesas
SELECT
    'VIEWS DE DESPESAS' as info,
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND (
    view_definition ILIKE '%financial_transactions%'
    OR view_definition ILIKE '%expense%'
    OR table_name ILIKE '%financial%'
)
ORDER BY table_name;

-- 6. Teste rápido de consulta básica de despesas
DO $$
DECLARE
    despesa_count INTEGER;
BEGIN
    -- Contar despesas ativas
    SELECT COUNT(*) INTO despesa_count
    FROM financial_transactions
    WHERE type = 'expense'
    AND (deleted_at IS NULL OR deleted_at > NOW());

    RAISE NOTICE 'Despesas ativas encontradas: %', despesa_count;

    -- Testar view se existir
    BEGIN
        SELECT COUNT(*) INTO despesa_count FROM financial_basic WHERE type = 'expense';
        RAISE NOTICE 'Despesas na view financial_basic: %', despesa_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'View financial_basic não acessível: %', SQLERRM;
    END;

END
$$;

SELECT '🔍 DIAGNÓSTICO DE DESPESAS CONCLUÍDO!' as resultado;