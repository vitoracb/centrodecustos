-- ============================================
-- DESABILITAR RLS - ACESSO TOTAL
-- Versão Final - Apenas tabelas que existem
-- ============================================

-- Desabilitar RLS em todas as tabelas principais
ALTER TABLE financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;

-- Tornar storage privado (apenas usuários autenticados)
UPDATE storage.buckets SET public = false WHERE public = true;

-- Verificar resultado
SELECT 
    tablename as "Tabela",
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS Desabilitado - Acesso Total'
        ELSE '⚠️ RLS Ainda Ativo'
    END as "Status"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'contracts',
        'orders',
        'user_permissions'
    )
ORDER BY tablename;

-- Verificar storage
SELECT 
    name as "Bucket",
    CASE 
        WHEN public = false THEN '✅ Privado'
        ELSE '⚠️ Público'
    END as "Status"
FROM storage.buckets;

-- ============================================
-- RESULTADO ESPERADO:
-- ✅ 5 tabelas com "RLS Desabilitado"
-- ✅ Todos os buckets "Privado"
-- ✅ Usuários autenticados veem TUDO
-- ============================================
