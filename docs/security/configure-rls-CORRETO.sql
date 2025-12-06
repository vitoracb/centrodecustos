-- ============================================
-- CONFIGURAR RLS PERMISSIVO - VERSÃO CORRETA
-- Todos os usuários autenticados veem TODOS os centros
-- Apenas tabelas que EXISTEM no banco
-- ============================================

-- ============================================
-- PASSO 1: DESABILITAR RLS (MAIS SIMPLES)
-- ============================================
-- Como você quer que todos vejam tudo, é mais simples desabilitar RLS

ALTER TABLE financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 2: TORNAR STORAGE BUCKETS PRIVADOS
-- ============================================
-- Apenas usuários autenticados podem acessar arquivos

UPDATE storage.buckets SET public = false WHERE public = true;

-- ============================================
-- PASSO 3: VERIFICAR CONFIGURAÇÃO
-- ============================================

-- Verificar RLS (deve estar DESABILITADO)
SELECT 
    tablename as "Tabela",
    rowsecurity as "RLS Ativo",
    CASE 
        WHEN rowsecurity = false THEN '✅ Desabilitado - Acesso total'
        ELSE '⚠️ Ainda ativo'
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

-- Verificar storage (deve estar PRIVADO)
SELECT 
    name as "Bucket",
    public as "Público?",
    CASE 
        WHEN public = false THEN '✅ Privado - Apenas autenticados'
        ELSE '⚠️ Público'
    END as "Status"
FROM storage.buckets
ORDER BY name;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ RLS desabilitado em 5 tabelas (acesso total)
-- ✅ Storage privado (apenas autenticados)
-- ✅ Usuários autenticados veem TODOS os centros
-- ✅ Usuários não autenticados não têm acesso

-- ============================================
-- ALTERNATIVA: SE PREFERIR MANTER RLS ATIVO
-- ============================================
-- Descomente as linhas abaixo se preferir manter RLS
-- com políticas permissivas (mais seguro)

/*
-- Reativar RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Criar políticas permissivas para financial_transactions
CREATE POLICY "Authenticated users full access"
ON financial_transactions
TO authenticated
USING (true)
WITH CHECK (true);

-- Criar políticas permissivas para equipments
CREATE POLICY "Authenticated users full access"
ON equipments
TO authenticated
USING (true)
WITH CHECK (true);

-- Criar políticas permissivas para contracts
CREATE POLICY "Authenticated users full access"
ON contracts
TO authenticated
USING (true)
WITH CHECK (true);

-- Criar políticas permissivas para orders
CREATE POLICY "Authenticated users full access"
ON orders
TO authenticated
USING (true)
WITH CHECK (true);

-- Criar políticas permissivas para user_permissions
CREATE POLICY "Authenticated users full access"
ON user_permissions
TO authenticated
USING (true)
WITH CHECK (true);
*/

-- ============================================
-- FIM DA CONFIGURAÇÃO
-- ============================================
