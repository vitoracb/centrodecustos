-- ============================================
-- AUDITORIA DE SEGURANÇA - RLS (Row Level Security)
-- Centro de Custos App - VERSÃO FUNCIONAL
-- Data: 2025-12-05
-- ============================================

-- ============================================
-- SEÇÃO 1: VERIFICAR RLS ATIVO
-- ============================================
SELECT 
    tablename as "Tabela",
    rowsecurity as "RLS Ativo",
    CASE 
        WHEN rowsecurity = true THEN '✅ Protegido'
        ELSE '⚠️ VULNERÁVEL - ATIVAR RLS'
    END as "Status"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    )
ORDER BY tablename;

-- ============================================
-- SEÇÃO 2: LISTAR POLÍTICAS RLS
-- ============================================
SELECT 
    tablename as "Tabela",
    policyname as "Política",
    cmd as "Operação",
    LEFT(qual::text, 80) as "Condição"
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    )
ORDER BY tablename, cmd, policyname;

-- ============================================
-- SEÇÃO 3: VERIFICAR TABELAS SEM POLÍTICAS
-- ============================================
SELECT 
    t.tablename as "⚠️ Tabela SEM Política"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    )
    AND t.rowsecurity = true
    AND p.policyname IS NULL
GROUP BY t.tablename;

-- ============================================
-- SEÇÃO 4: VERIFICAR STORAGE BUCKETS
-- ============================================
SELECT 
    name as "Bucket",
    public as "É Público?",
    CASE 
        WHEN public = true THEN '⚠️ VULNERÁVEL - Tornar privado'
        ELSE '✅ Seguro'
    END as "Status"
FROM storage.buckets
ORDER BY name;

-- ============================================
-- SEÇÃO 5: CHECKLIST RESUMIDO
-- ============================================
SELECT 
    '1. RLS Ativo' as "Item",
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ APROVADO - 6/6 tabelas'
        ELSE '⚠️ REPROVADO - ' || COUNT(*)::text || '/6 tabelas'
    END as "Status"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    )
    AND rowsecurity = true

UNION ALL

SELECT 
    '2. Políticas RLS' as "Item",
    CASE 
        WHEN COUNT(DISTINCT tablename) = 6 THEN '✅ APROVADO - 6/6 tabelas'
        ELSE '⚠️ REPROVADO - ' || COUNT(DISTINCT tablename)::text || '/6 tabelas'
    END as "Status"
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    )

UNION ALL

SELECT 
    '3. Storage Privado' as "Item",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ APROVADO - Nenhum bucket público'
        ELSE '⚠️ REPROVADO - ' || COUNT(*)::text || ' buckets públicos'
    END as "Status"
FROM storage.buckets
WHERE public = true;

-- ============================================
-- SEÇÕES 6-9: TESTES DE ISOLAMENTO
-- IMPORTANTE: Execute APENAS como usuário NORMAL (não admin)
-- ============================================

-- SEÇÃO 6: Teste Financial Transactions
SELECT 
    '🔒 Financial Transactions' as "Teste",
    COUNT(*) as "Registros de outros centros",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ISOLAMENTO OK'
        ELSE '⚠️ VAZAMENTO DE DADOS!'
    END as "Resultado"
FROM financial_transactions
WHERE cost_center_id != (
    SELECT center FROM user_permissions WHERE user_id = auth.uid()
);

-- SEÇÃO 7: Teste Equipments
SELECT 
    '🔒 Equipments' as "Teste",
    COUNT(*) as "Registros de outros centros",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ISOLAMENTO OK'
        ELSE '⚠️ VAZAMENTO!'
    END as "Resultado"
FROM equipments
WHERE cost_center_id != (
    SELECT center FROM user_permissions WHERE user_id = auth.uid()
);

-- SEÇÃO 8: Teste Employees
SELECT 
    '🔒 Employees' as "Teste",
    COUNT(*) as "Registros de outros centros",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ISOLAMENTO OK'
        ELSE '⚠️ VAZAMENTO!'
    END as "Resultado"
FROM employees
WHERE cost_center_id != (
    SELECT center FROM user_permissions WHERE user_id = auth.uid()
);

-- SEÇÃO 9: Teste Contracts
SELECT 
    '🔒 Contracts' as "Teste",
    COUNT(*) as "Registros de outros centros",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ISOLAMENTO OK'
        ELSE '⚠️ VAZAMENTO!'
    END as "Resultado"
FROM contracts
WHERE cost_center_id != (
    SELECT center FROM user_permissions WHERE user_id = auth.uid()
);

-- ============================================
-- SEÇÃO 10: CHECKLIST FINAL COMPLETO
-- ============================================
SELECT 
    'AUDITORIA DE SEGURANÇA RLS' as "Categoria",
    'Status' as "Resultado"

UNION ALL

SELECT 
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

UNION ALL

SELECT 
    '✅ RLS Ativo em todas as tabelas',
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables 
              WHERE schemaname = 'public' 
              AND tablename IN ('financial_transactions', 'equipments', 'employees', 'contracts', 'orders', 'user_permissions')
              AND rowsecurity = true) = 6 
        THEN 'APROVADO'
        ELSE 'REPROVADO'
    END

UNION ALL

SELECT 
    '✅ Todas as tabelas têm políticas',
    CASE 
        WHEN (SELECT COUNT(DISTINCT tablename) FROM pg_policies 
              WHERE schemaname = 'public' 
              AND tablename IN ('financial_transactions', 'equipments', 'employees', 'contracts', 'orders', 'user_permissions')) = 6
        THEN 'APROVADO'
        ELSE 'REPROVADO'
    END

UNION ALL

SELECT 
    '✅ Storage buckets privados',
    CASE 
        WHEN (SELECT COUNT(*) FROM storage.buckets WHERE public = true) = 0
        THEN 'APROVADO'
        ELSE 'REPROVADO'
    END

UNION ALL

SELECT 
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

UNION ALL

SELECT 
    'STATUS FINAL',
    CASE 
        WHEN (
            (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('financial_transactions', 'equipments', 'employees', 'contracts', 'orders', 'user_permissions') AND rowsecurity = true) = 6
            AND
            (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('financial_transactions', 'equipments', 'employees', 'contracts', 'orders', 'user_permissions')) = 6
            AND
            (SELECT COUNT(*) FROM storage.buckets WHERE public = true) = 0
        )
        THEN '🎉 APROVADO - PRONTO PARA PRODUÇÃO'
        ELSE '⚠️ REPROVADO - CORRIGIR PROBLEMAS'
    END;

-- ============================================
-- SEÇÃO 11: CORREÇÕES (SE NECESSÁRIO)
-- ============================================

/*
-- Se alguma tabela não tiver RLS:
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;

-- Se alguma tabela não tiver políticas (exemplo para financial_transactions):
CREATE POLICY "Users view own center"
ON financial_transactions FOR SELECT
USING (cost_center_id = (SELECT center FROM user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users insert own center"
ON financial_transactions FOR INSERT
WITH CHECK (cost_center_id = (SELECT center FROM user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users update own center"
ON financial_transactions FOR UPDATE
USING (cost_center_id = (SELECT center FROM user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users delete own center"
ON financial_transactions FOR DELETE
USING (cost_center_id = (SELECT center FROM user_permissions WHERE user_id = auth.uid()));

-- Se algum bucket estiver público:
UPDATE storage.buckets SET public = false WHERE name = 'nome_do_bucket';
*/

-- ============================================
-- FIM DA AUDITORIA
-- ============================================
