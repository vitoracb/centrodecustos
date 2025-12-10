-- ==============================================================================
-- VERIFICAR ESTRUTURA REAL DA AUDIT_LOGS
-- ==============================================================================

-- 1. Verificar se a tabela audit_logs existe
SELECT
    'TABELA AUDIT_LOGS' as info,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public')
        THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as status;

-- 2. Mostrar TODAS as colunas da audit_logs
SELECT
    'TODAS AS COLUNAS DE AUDIT_LOGS' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar constraints NOT NULL
SELECT
    'CONSTRAINTS NOT NULL' as info,
    column_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
AND table_schema = 'public'
AND is_nullable = 'NO'
ORDER BY column_name;

-- 4. Mostrar um exemplo de dados da tabela (se existir dados)
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM audit_logs;

    IF row_count > 0 THEN
        RAISE NOTICE 'Tabela audit_logs tem % registros', row_count;
        -- Mostrar estrutura baseada em dados reais
        RAISE NOTICE 'Verificando primeiros registros...';
    ELSE
        RAISE NOTICE 'Tabela audit_logs está vazia';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao acessar audit_logs: %', SQLERRM;
END
$$;

-- 5. Verificar outras tabelas de auditoria se existirem
SELECT
    'OUTRAS TABELAS DE AUDIT' as info,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE '%audit%' OR table_name LIKE '%log%')
ORDER BY table_name;

-- 6. Verificar se existe uma função que cria a tabela
SELECT
    'FUNÇÕES DE AUDIT' as info,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%audit%' OR routine_name LIKE '%log%')
ORDER BY routine_name;

SELECT '🔍 VERIFICAÇÃO COMPLETA DA AUDIT_LOGS!' as resultado;