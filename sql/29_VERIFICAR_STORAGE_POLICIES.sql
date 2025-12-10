-- ==============================================================================
-- VERIFICAR POLÍTICAS DE STORAGE PARA UPLOAD
-- ==============================================================================

-- 1. Verificar buckets existentes
SELECT
    'BUCKETS DISPONÍVEIS' as info,
    name as bucket_name,
    public,
    created_at
FROM storage.buckets
ORDER BY name;

-- 2. Verificar políticas de storage
SELECT
    'POLÍTICAS DE STORAGE' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- 3. Verificar se usuários conseguem acessar buckets
SELECT
    'VERIFICANDO ACESSO AOS BUCKETS' as info;

-- Testar acesso ao bucket expense-documents
DO $$
BEGIN
    -- Simular verificação de acesso (sem realmente fazer upload)
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'expense-documents') THEN
        RAISE NOTICE '✅ Bucket expense-documents existe';

        -- Verificar política de INSERT
        IF EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
            AND tablename = 'objects'
            AND policyname ILIKE '%expense%'
            AND cmd = 'INSERT'
        ) THEN
            RAISE NOTICE '✅ Política de INSERT encontrada para expense-documents';
        ELSE
            RAISE NOTICE '⚠️ Política de INSERT não encontrada para expense-documents';
        END IF;

    ELSE
        RAISE NOTICE '❌ Bucket expense-documents não existe';
    END IF;
END
$$;

-- 4. Verificar bucket contract-documents
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'contract-documents') THEN
        RAISE NOTICE '✅ Bucket contract-documents existe';

        -- Verificar política de INSERT
        IF EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
            AND tablename = 'objects'
            AND policyname ILIKE '%contract%'
            AND cmd = 'INSERT'
        ) THEN
            RAISE NOTICE '✅ Política de INSERT encontrada para contract-documents';
        ELSE
            RAISE NOTICE '⚠️ Política de INSERT não encontrada para contract-documents';
        END IF;

    ELSE
        RAISE NOTICE '❌ Bucket contract-documents não existe';
    END IF;
END
$$;

-- 5. Mostrar políticas específicas de storage
SELECT
    'POLÍTICAS DETALHADAS' as info,
    policyname,
    cmd as operacao,
    qual as condicao,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND (
    policyname ILIKE '%expense%'
    OR policyname ILIKE '%contract%'
    OR policyname ILIKE '%upload%'
    OR policyname ILIKE '%authenticated%'
)
ORDER BY policyname;

-- 6. Verificar se há políticas restritivas demais
SELECT
    'VERIFICANDO POLÍTICAS RESTRITIVAS' as info;

-- Contar políticas por operação
SELECT
    cmd as operacao,
    COUNT(*) as quantidade_politicas
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
GROUP BY cmd
ORDER BY cmd;

SELECT '🔍 VERIFICAÇÃO DE STORAGE POLICIES CONCLUÍDA!' as resultado;