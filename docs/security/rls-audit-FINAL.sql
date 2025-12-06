-- ============================================
-- AUDITORIA DE SEGURANÇA - RLS (Row Level Security)
-- Centro de Custos App - VERSÃO FINAL CORRIGIDA
-- Data: 2025-12-05
-- Coluna de centro: cost_center_id
-- ============================================

-- ============================================
-- 1. VERIFICAR SE RLS ESTÁ ATIVO
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
-- 2. LISTAR TODAS AS POLÍTICAS RLS
-- ============================================
SELECT 
    tablename as "Tabela",
    policyname as "Política",
    cmd as "Operação",
    LEFT(qual::text, 100) as "Condição (primeiros 100 chars)"
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
-- 3. VERIFICAR TABELAS SEM POLÍTICAS
-- ============================================
SELECT 
    t.tablename as "⚠️ Tabela SEM Política",
    'CRÍTICO - Criar políticas RLS' as "Ação Necessária"
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
-- 4. VERIFICAR STORAGE BUCKETS
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
-- 5. VERIFICAR POLÍTICAS DE STORAGE
-- ============================================
SELECT 
    bucket_id as "Bucket",
    name as "Política",
    LEFT(definition, 100) as "Definição (primeiros 100 chars)"
FROM storage.policies
ORDER BY bucket_id, name;

-- ============================================
-- 6. TESTE DE ISOLAMENTO - FINANCIAL TRANSACTIONS
-- ============================================
-- IMPORTANTE: Execute isso logado como usuário NORMAL (não admin)
-- Este teste verifica se você consegue ver dados de OUTROS centros

SELECT 
    '🔒 Teste de Isolamento - Financial Transactions' as "Teste",
    COUNT(*) as "Registros de OUTROS centros visíveis",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ISOLAMENTO OK - Não vê outros centros'
        ELSE '⚠️ VAZAMENTO - Consegue ver outros centros!'
    END as "Resultado"
FROM financial_transactions
WHERE cost_center_id != (
    SELECT center FROM user_permissions WHERE user_id = auth.uid()
);

-- ============================================
-- 7. TESTE DE ISOLAMENTO - EQUIPMENTS
-- ============================================
SELECT 
    '🔒 Teste de Isolamento - Equipments' as "Teste",
    COUNT(*) as "Registros de OUTROS centros visíveis",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ISOLAMENTO OK'
        ELSE '⚠️ VAZAMENTO'
    END as "Resultado"
FROM equipments
WHERE cost_center_id != (
    SELECT center FROM user_permissions WHERE user_id = auth.uid()
);

-- ============================================
-- 8. TESTE DE ISOLAMENTO - EMPLOYEES
-- ============================================
SELECT 
    '🔒 Teste de Isolamento - Employees' as "Teste",
    COUNT(*) as "Registros de OUTROS centros visíveis",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ISOLAMENTO OK'
        ELSE '⚠️ VAZAMENTO'
    END as "Resultado"
FROM employees
WHERE cost_center_id != (
    SELECT center FROM user_permissions WHERE user_id = auth.uid()
);

-- ============================================
-- 9. TESTE DE INSERÇÃO CROSS-CENTER
-- ============================================
-- Este teste DEVE FALHAR com erro de permissão
-- Se conseguir inserir, há um problema de segurança!

/*
-- DESCOMENTE PARA TESTAR (vai dar erro, que é o esperado):

INSERT INTO financial_transactions (
    type,
    description,
    value,
    date,
    cost_center_id
) VALUES (
    'expense',
    'TESTE DE INVASÃO',
    999.99,
    CURRENT_DATE,
    'OUTRO_CENTRO_AQUI'  -- Substitua por um centro que NÃO é o seu
);

-- Resultado esperado: ERRO de permissão
-- Se inserir com sucesso = PROBLEMA DE SEGURANÇA!
*/

-- ============================================
-- 10. CHECKLIST FINAL
-- ============================================
SELECT 
    'CHECKLIST DE SEGURANÇA' as "Categoria",
    'Status' as "Item",
    'Resultado' as "Avaliação"

UNION ALL

SELECT 
    '1. RLS Ativo',
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ Todas as 6 tabelas protegidas'
        ELSE '⚠️ ' || (6 - COUNT(*))::text || ' tabelas SEM RLS'
    END,
    CASE 
        WHEN COUNT(*) = 6 THEN 'APROVADO'
        ELSE 'REPROVADO'
    END
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
    '2. Políticas RLS',
    CASE 
        WHEN COUNT(DISTINCT tablename) = 6 THEN '✅ Todas as tabelas têm políticas'
        ELSE '⚠️ ' || (6 - COUNT(DISTINCT tablename))::text || ' tabelas sem políticas'
    END,
    CASE 
        WHEN COUNT(DISTINCT tablename) = 6 THEN 'APROVADO'
        ELSE 'REPROVADO'
    END
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
    '3. Storage Privado',
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Nenhum bucket público'
        ELSE '⚠️ ' || COUNT(*)::text || ' buckets públicos'
    END,
    CASE 
        WHEN COUNT(*) = 0 THEN 'APROVADO'
        ELSE 'REPROVADO'
    END
FROM storage.buckets
WHERE public = true;

-- ============================================
-- 11. CORREÇÕES RÁPIDAS (SE NECESSÁRIO)
-- ============================================

-- Se alguma tabela não tiver RLS ativo:
-- ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;

-- Se alguma tabela não tiver políticas, criar políticas básicas:
/*
-- Exemplo para financial_transactions:

CREATE POLICY "Users view own center transactions"
ON financial_transactions FOR SELECT
USING (
    cost_center_id = (
        SELECT center FROM user_permissions WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users insert own center transactions"
ON financial_transactions FOR INSERT
WITH CHECK (
    cost_center_id = (
        SELECT center FROM user_permissions WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users update own center transactions"
ON financial_transactions FOR UPDATE
USING (
    cost_center_id = (
        SELECT center FROM user_permissions WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users delete own center transactions"
ON financial_transactions FOR DELETE
USING (
    cost_center_id = (
        SELECT center FROM user_permissions WHERE user_id = auth.uid()
    )
);
*/

-- Se algum bucket estiver público:
-- UPDATE storage.buckets SET public = false WHERE name = 'nome_do_bucket';

-- ============================================
-- FIM DA AUDITORIA
-- ============================================

-- RESUMO:
-- ✅ Execute as seções 1-5 para verificar configuração
-- ✅ Execute as seções 6-9 para testar isolamento (como usuário normal)
-- ✅ Execute a seção 10 para ver checklist final
-- ✅ Use a seção 11 para correções se necessário
