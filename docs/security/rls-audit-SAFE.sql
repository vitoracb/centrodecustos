-- ============================================
-- AUDITORIA DE SEGURANÇA - RLS (VERSÃO SEGURA)
-- Centro de Custos App
-- Esta versão NÃO faz testes de isolamento automáticos
-- ============================================

-- ============================================
-- PASSO 1: DESCOBRIR ESTRUTURA DAS TABELAS
-- ============================================
-- Execute PRIMEIRO para ver os nomes das colunas

SELECT 
    table_name as "Tabela",
    column_name as "Coluna",
    data_type as "Tipo"
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'financial_transactions',
        'user_permissions',
        'equipments',
        'employees',
        'contracts',
        'orders'
    )
ORDER BY table_name, ordinal_position;

-- ============================================
-- SEÇÃO 1: VERIFICAR RLS ATIVO
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

-- ============================================
-- SEÇÃO 2: LISTAR POLÍTICAS RLS
-- ============================================
SELECT 
    tablename as "Tabela",
    COUNT(*) as "Número de Políticas",
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

-- ============================================
-- SEÇÃO 3: DETALHES DAS POLÍTICAS
-- ============================================
SELECT 
    tablename as "Tabela",
    policyname as "Política",
    cmd as "Op",
    LEFT(qual::text, 60) as "Condição"
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
ORDER BY tablename, cmd;

-- ============================================
-- SEÇÃO 4: VERIFICAR TABELAS SEM POLÍTICAS
-- ============================================
SELECT 
    t.tablename as "⚠️ Tabela SEM Política"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
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
-- SEÇÃO 5: VERIFICAR STORAGE
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

-- ============================================
-- SEÇÃO 6: CHECKLIST FINAL
-- ============================================
SELECT 
    'RLS Ativo' as "Item",
    COUNT(*)::text || '/6 tabelas' as "Status",
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ OK'
        ELSE '⚠️ CORRIGIR'
    END as "Resultado"
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
    'Políticas RLS' as "Item",
    COUNT(DISTINCT tablename)::text || '/6 tabelas' as "Status",
    CASE 
        WHEN COUNT(DISTINCT tablename) = 6 THEN '✅ OK'
        ELSE '⚠️ CORRIGIR'
    END as "Resultado"
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
    'Storage Privado' as "Item",
    CASE 
        WHEN COUNT(*) = 0 THEN 'Nenhum bucket público'
        ELSE COUNT(*)::text || ' buckets públicos'
    END as "Status",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ OK'
        ELSE '⚠️ CORRIGIR'
    END as "Resultado"
FROM storage.buckets
WHERE public = true;

-- ============================================
-- INSTRUÇÕES PARA TESTES MANUAIS
-- ============================================

/*
TESTES DE ISOLAMENTO (FAZER MANUALMENTE NO APP):

1. Crie um usuário teste:
   - Email: teste.valenca@nowtrading.com
   - Adicione em user_permissions com center = 'valenca'

2. Faça login no APP com esse usuário

3. Verifique que ele vê APENAS dados de Valença:
   - Dashboard deve mostrar apenas dados de Valença
   - Financeiro deve mostrar apenas transações de Valença
   - Equipamentos deve mostrar apenas equipamentos de Valença
   - Etc.

4. Tente criar uma despesa:
   - Deve criar apenas em Valença (seu centro)
   - Não deve conseguir escolher outro centro

5. Se conseguir ver dados de outros centros = PROBLEMA DE SEGURANÇA!

RESULTADO ESPERADO:
✅ Usuário vê apenas seu centro
✅ Usuário cria apenas em seu centro
✅ Não consegue acessar dados de outros centros
*/

-- ============================================
-- CORREÇÕES (SE NECESSÁRIO)
-- ============================================

/*
-- Ativar RLS em tabela:
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;

-- Tornar bucket privado:
UPDATE storage.buckets SET public = false WHERE name = 'documents';

-- Criar políticas básicas (AJUSTE os nomes das colunas conforme descoberto no PASSO 1):
CREATE POLICY "Users view own center"
ON nome_da_tabela FOR SELECT
USING (
    cost_center_id = (
        SELECT COLUNA_CENTER FROM user_permissions WHERE user_id = auth.uid()
    )
);
*/

-- ============================================
-- FIM DA AUDITORIA
-- ============================================
