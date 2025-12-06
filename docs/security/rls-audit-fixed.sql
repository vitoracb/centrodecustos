-- ============================================
-- AUDITORIA DE SEGURANÇA - RLS (Row Level Security)
-- Centro de Custos App - VERSÃO CORRIGIDA
-- Data: 2025-12-05
-- ============================================

-- ============================================
-- 0. DESCOBRIR ESTRUTURA DAS TABELAS
-- ============================================

-- Listar todas as colunas das tabelas principais
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    )
ORDER BY table_name, ordinal_position;

-- ============================================
-- 1. VERIFICAR SE RLS ESTÁ ATIVO EM TODAS AS TABELAS
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Ativo",
    CASE 
        WHEN rowsecurity = true THEN '✅ Protegido'
        ELSE '⚠️ VULNERÁVEL'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2. LISTAR TODAS AS POLÍTICAS RLS
-- ============================================
SELECT 
    schemaname as "Schema",
    tablename as "Tabela",
    policyname as "Política",
    permissive as "Permissivo",
    roles as "Roles",
    cmd as "Comando",
    qual as "Condição WHERE",
    with_check as "Condição CHECK"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 3. VERIFICAR TABELAS SEM POLÍTICAS RLS
-- ============================================
SELECT 
    t.tablename as "Tabela sem Política",
    '⚠️ VULNERÁVEL - Sem políticas RLS' as "Status"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND p.policyname IS NULL
ORDER BY t.tablename;

-- ============================================
-- 4. VERIFICAR POLÍTICAS POR TABELA CRÍTICA
-- ============================================

-- 4.1 Financial Transactions
SELECT 
    '📊 FINANCIAL_TRANSACTIONS' as "Tabela",
    policyname as "Política",
    cmd as "Operação",
    qual as "Condição"
FROM pg_policies
WHERE tablename = 'financial_transactions';

-- 4.2 Equipments
SELECT 
    '🔧 EQUIPMENTS' as "Tabela",
    policyname as "Política",
    cmd as "Operação",
    qual as "Condição"
FROM pg_policies
WHERE tablename = 'equipments';

-- 4.3 Employees
SELECT 
    '👥 EMPLOYEES' as "Tabela",
    policyname as "Política",
    cmd as "Operação",
    qual as "Condição"
FROM pg_policies
WHERE tablename = 'employees';

-- 4.4 Contracts
SELECT 
    '📄 CONTRACTS' as "Tabela",
    policyname as "Política",
    cmd as "Operação",
    qual as "Condição"
FROM pg_policies
WHERE tablename = 'contracts';

-- 4.5 Orders
SELECT 
    '🛒 ORDERS' as "Tabela",
    policyname as "Política",
    cmd as "Operação",
    qual as "Condição"
FROM pg_policies
WHERE tablename = 'orders';

-- 4.6 User Permissions
SELECT 
    '🔐 USER_PERMISSIONS' as "Tabela",
    policyname as "Política",
    cmd as "Operação",
    qual as "Condição"
FROM pg_policies
WHERE tablename = 'user_permissions';

-- ============================================
-- 5. VERIFICAR PERMISSÕES DE UPLOAD/STORAGE
-- ============================================

-- 5.1 Políticas de Storage
SELECT 
    name as "Bucket",
    public as "Público",
    CASE 
        WHEN public = true THEN '⚠️ Bucket Público'
        ELSE '✅ Bucket Privado'
    END as "Status"
FROM storage.buckets;

-- 5.2 Políticas de Storage por Bucket
SELECT 
    bucket_id as "Bucket",
    name as "Política",
    definition as "Definição"
FROM storage.policies
ORDER BY bucket_id, name;

-- ============================================
-- 6. VERIFICAR FUNÇÕES E TRIGGERS DE SEGURANÇA
-- ============================================

-- 6.1 Listar triggers relacionados à segurança
SELECT 
    trigger_name as "Trigger",
    event_object_table as "Tabela",
    action_statement as "Ação"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- 6.2 Verificar função de auditoria
SELECT 
    routine_name as "Função",
    routine_type as "Tipo",
    CASE 
        WHEN routine_name LIKE '%audit%' THEN '✅ Auditoria'
        WHEN routine_name LIKE '%log%' THEN '✅ Log'
        ELSE 'Outra'
    END as "Categoria"
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND (routine_name LIKE '%audit%' OR routine_name LIKE '%log%')
ORDER BY routine_name;

-- ============================================
-- 7. CHECKLIST DE SEGURANÇA
-- ============================================

-- Execute esta query para ter um resumo geral
SELECT 
    'RLS Ativo em todas as tabelas' as "Item",
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true)
        THEN '✅ OK'
        ELSE '⚠️ REVISAR'
    END as "Status"
FROM pg_tables
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Todas as tabelas têm políticas RLS' as "Item",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ OK'
        ELSE '⚠️ REVISAR'
    END as "Status"
FROM (
    SELECT t.tablename
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public'
        AND t.rowsecurity = true
        AND p.policyname IS NULL
) as tables_without_policies

UNION ALL

SELECT 
    'Storage buckets privados' as "Item",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ OK'
        ELSE '⚠️ REVISAR'
    END as "Status"
FROM storage.buckets
WHERE public = true;

-- ============================================
-- 8. INSTRUÇÕES PARA TESTES MANUAIS
-- ============================================

-- IMPORTANTE: Os testes abaixo devem ser executados APÓS
-- descobrir o nome correto da coluna que armazena o centro de custo.
-- 
-- Execute primeiro a seção 0 para ver a estrutura das tabelas.
-- 
-- Depois, substitua 'NOME_DA_COLUNA_CENTER' pelo nome real
-- (pode ser 'center', 'cost_center', 'centro', etc.)

/*
-- Exemplo de teste de isolamento (AJUSTAR NOME DA COLUNA):

-- Teste 1: Verificar se usuário vê apenas seu centro
SELECT 
    'Teste: Acesso Cross-Center' as teste,
    COUNT(*) as registros_visiveis,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Isolamento OK'
        ELSE '⚠️ VAZAMENTO DE DADOS'
    END as status
FROM financial_transactions
WHERE NOME_DA_COLUNA_CENTER != 'SEU_CENTRO_AQUI';

-- Teste 2: Tentar inserir em outro centro
INSERT INTO financial_transactions (
    name, 
    type, 
    value, 
    date, 
    NOME_DA_COLUNA_CENTER, 
    user_id
) VALUES (
    'Teste Invasão', 
    'expense', 
    100, 
    '2025-12-05', 
    'OUTRO_CENTRO', 
    auth.uid()
);
-- Resultado esperado: ERRO de permissão
*/

-- ============================================
-- 9. RECOMENDAÇÕES DE CORREÇÃO
-- ============================================

-- Se encontrar problemas, use estes comandos para corrigir:

-- Ativar RLS em uma tabela:
-- ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;

-- Criar política básica de leitura por centro:
-- CREATE POLICY "Users can view own center data"
--   ON nome_da_tabela
--   FOR SELECT
--   USING (
--     NOME_DA_COLUNA_CENTER = (
--       SELECT center FROM user_permissions WHERE user_id = auth.uid()
--     )
--   );

-- Criar política de inserção:
-- CREATE POLICY "Users can insert own center data"
--   ON nome_da_tabela
--   FOR INSERT
--   WITH CHECK (
--     NOME_DA_COLUNA_CENTER = (
--       SELECT center FROM user_permissions WHERE user_id = auth.uid()
--     )
--   );

-- Tornar bucket privado:
-- UPDATE storage.buckets SET public = false WHERE name = 'nome_do_bucket';

-- ============================================
-- FIM DA AUDITORIA
-- ============================================
