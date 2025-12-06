-- ============================================
-- AUDITORIA DE SEGURANÇA - RLS
-- Centro de Custos App - VERSÃO FINAL CORRETA
-- Data: 2025-12-05
-- 
-- COLUNAS CORRETAS:
-- - financial_transactions.cost_center_id
-- - user_permissions.cost_center_id
-- - equipments.cost_center_id (assumido)
-- - employees.cost_center_id (assumido)
-- - contracts.cost_center_id (assumido)
-- - orders.cost_center_id (assumido)
-- ============================================

-- ============================================
-- SEÇÃO 1: VERIFICAR RLS ATIVO (2 min)
-- ============================================
SELECT 
    tablename as "Tabela",
    rowsecurity as "RLS Ativo",
    CASE 
        WHEN rowsecurity = true THEN '✅ Protegido'
        ELSE '⚠️ VULNERÁVEL'
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

-- RESULTADO ESPERADO: 6 tabelas com ✅ Protegido

-- ============================================
-- SEÇÃO 2: CONTAR POLÍTICAS POR TABELA (1 min)
-- ============================================
SELECT 
    tablename as "Tabela",
    COUNT(*) as "Nº Políticas",
    string_agg(DISTINCT cmd::text, ', ') as "Operações"
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
GROUP BY tablename
ORDER BY tablename;

-- RESULTADO ESPERADO: Todas as 6 tabelas aparecem com 2-4 políticas cada

-- ============================================
-- SEÇÃO 3: VERIFICAR STORAGE (1 min)
-- ============================================
SELECT 
    name as "Bucket",
    public as "Público?",
    CASE 
        WHEN public = true THEN '⚠️ VULNERÁVEL'
        ELSE '✅ Seguro'
    END as "Status"
FROM storage.buckets
ORDER BY name;

-- RESULTADO ESPERADO: Todos com ✅ Seguro (public = false)

-- ============================================
-- SEÇÃO 4: CHECKLIST RESUMIDO (1 min)
-- ============================================
SELECT 
    'RLS Ativo' as "Item",
    COUNT(*)::text || '/6' as "Status",
    CASE WHEN COUNT(*) = 6 THEN '✅' ELSE '⚠️' END as "OK?"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('financial_transactions', 'equipments', 'employees', 'contracts', 'orders', 'user_permissions')
    AND rowsecurity = true

UNION ALL

SELECT 
    'Com Políticas',
    COUNT(DISTINCT tablename)::text || '/6',
    CASE WHEN COUNT(DISTINCT tablename) = 6 THEN '✅' ELSE '⚠️' END
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('financial_transactions', 'equipments', 'employees', 'contracts', 'orders', 'user_permissions')

UNION ALL

SELECT 
    'Storage Privado',
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE COUNT(*)::text || ' públicos' END,
    CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '⚠️' END
FROM storage.buckets
WHERE public = true;

-- RESULTADO ESPERADO:
-- RLS Ativo       | 6/6 | ✅
-- Com Políticas   | 6/6 | ✅
-- Storage Privado | OK  | ✅

-- ============================================
-- TESTE MANUAL NO APP (NÃO PRECISA SQL!)
-- ============================================

/*
INSTRUÇÕES PARA TESTE MANUAL:

1. Crie usuário teste (se não tiver):
   - No Supabase: Authentication → Users → Add user
   - Email: teste.valenca@nowtrading.com
   - Password: Teste123!

2. Adicione permissão:
   - No Supabase: Table Editor → user_permissions → Insert row
   - user_id: [ID do usuário criado]
   - cost_center_id: valenca
   - permission: user

3. Faça login no APP com teste.valenca@nowtrading.com

4. Verifique no APP:
   ✅ Dashboard mostra apenas dados de Valença?
   ✅ Financeiro mostra apenas transações de Valença?
   ✅ Equipamentos mostra apenas equipamentos de Valença?
   ✅ Ao criar despesa, só permite criar em Valença?

5. Se conseguir ver dados de CNA ou Cabrália = PROBLEMA DE SEGURANÇA!

RESULTADO ESPERADO:
✅ Usuário vê APENAS dados do seu centro (Valença)
✅ Usuário cria APENAS no seu centro
✅ Não consegue acessar outros centros
*/

-- ============================================
-- CORREÇÕES (SE NECESSÁRIO)
-- ============================================

/*
-- Se alguma tabela não tiver RLS:
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;

-- Se algum bucket estiver público:
UPDATE storage.buckets SET public = false WHERE name = 'documents';

-- Se alguma tabela não tiver políticas, criar políticas básicas:
-- (Exemplo para financial_transactions)

CREATE POLICY "Users view own center"
ON financial_transactions FOR SELECT
USING (
    cost_center_id = (
        SELECT cost_center_id FROM user_permissions WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users insert own center"
ON financial_transactions FOR INSERT
WITH CHECK (
    cost_center_id = (
        SELECT cost_center_id FROM user_permissions WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users update own center"
ON financial_transactions FOR UPDATE
USING (
    cost_center_id = (
        SELECT cost_center_id FROM user_permissions WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users delete own center"
ON financial_transactions FOR DELETE
USING (
    cost_center_id = (
        SELECT cost_center_id FROM user_permissions WHERE user_id = auth.uid()
    )
);

-- Repita para outras tabelas (equipments, employees, contracts, orders)
*/

-- ============================================
-- APROVAÇÃO FINAL
-- ============================================

/*
CRITÉRIOS PARA APROVAR:

✅ SEÇÃO 1: 6/6 tabelas com RLS ativo
✅ SEÇÃO 2: 6/6 tabelas com políticas
✅ SEÇÃO 3: Todos os buckets privados
✅ TESTE MANUAL: Usuário vê apenas seu centro

SE TODOS OS ✅ ESTIVEREM OK:
🎉 APROVADO - PRONTO PARA PRODUÇÃO

SE ALGUM ⚠️:
❌ REPROVADO - Corrigir antes de produção
*/

-- ============================================
-- FIM DA AUDITORIA
-- ============================================

-- TEMPO TOTAL: ~5 minutos
-- PRÓXIMO PASSO: Testar APK Android
