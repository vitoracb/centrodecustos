-- ==============================================================================
-- VERIFICAR E CORRIGIR ESTRUTURA DA TABELA CONTRACTS
-- ==============================================================================

-- 1. Verificar estrutura atual
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar se há registros
SELECT COUNT(*) as total_records FROM contracts;

-- 3. Mostrar algumas linhas para entender a estrutura
SELECT * FROM contracts LIMIT 3;

-- 4. Verificar índices
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'contracts'
AND schemaname = 'public';

-- 5. Verificar políticas RLS
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'contracts'
ORDER BY policyname;