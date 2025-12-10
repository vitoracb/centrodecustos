-- ==============================================================================
-- SCRIPT URGENTE CORRIGIDO: DIAGNOSTICAR PROBLEMA DE ROLES
-- Execute IMEDIATAMENTE no Supabase
-- ==============================================================================

-- 🚨 CORREÇÃO: Removido referência à coluna 'name' que pode não existir

-- ============================================================================
-- 0. PRIMEIRO: VERIFICAR ESTRUTURA DA TABELA USER_PROFILES
-- ============================================================================

-- Ver estrutura real da tabela user_profiles
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ============================================================================
-- 1. DIAGNÓSTICO: VERIFICAR USUÁRIOS AUTENTICADOS
-- ============================================================================

-- Ver todos os usuários na tabela auth.users
SELECT
  id,
  email,
  created_at,
  updated_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- ============================================================================
-- 2. DIAGNÓSTICO: VERIFICAR PERFIS DE USUÁRIO
-- ============================================================================

-- Ver todos os perfis e seus roles (SEM coluna name)
SELECT
  id as user_id,
  email,
  role,
  is_active,
  created_at,
  updated_at
FROM user_profiles
ORDER BY created_at DESC;

-- ============================================================================
-- 3. DIAGNÓSTICO: VERIFICAR ASSOCIAÇÕES AUTH.USERS <-> USER_PROFILES
-- ============================================================================

-- Ver usuários autenticados que NÃO têm perfil
SELECT
  u.id,
  u.email,
  u.created_at as auth_created,
  'SEM PERFIL' as status
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE up.id IS NULL
ORDER BY u.created_at DESC;

-- Ver perfis que NÃO têm usuário autenticado
SELECT
  up.id,
  up.email,
  up.role,
  'PERFIL SEM AUTH' as status
FROM user_profiles up
LEFT JOIN auth.users u ON u.id = up.id
WHERE u.id IS NULL;

-- ============================================================================
-- 4. VERIFICAR USUÁRIO ATUAL LOGADO
-- ============================================================================

-- Ver qual usuário está logado AGORA
SELECT
  auth.uid() as current_user_id,
  u.email as current_email,
  up.role as current_role,
  up.is_active,
  'USUÁRIO ATUAL' as info
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.id = auth.uid();

-- ============================================================================
-- 5. VERIFICAR POLÍTICAS RLS EM AÇÃO
-- ============================================================================

-- Testar se consegue ver centros de custo (deve funcionar para todos)
SELECT
  'Teste RLS: Centros de Custo' as test_name,
  COUNT(*) as visible_records,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ OK'
    ELSE '❌ BLOQUEADO'
  END as status
FROM cost_centers;

-- Testar se consegue ver transações financeiras
SELECT
  'Teste RLS: Transações Financeiras' as test_name,
  COUNT(*) as visible_records,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ OK'
    ELSE '❌ BLOQUEADO'
  END as status
FROM financial_transactions;

-- ============================================================================
-- 6. IDENTIFICAR PROBLEMA ESPECÍFICO
-- ============================================================================

-- Verificar exatamente qual é o problema
SELECT
  CASE
    WHEN auth.uid() IS NULL THEN '🚨 USUÁRIO NÃO AUTENTICADO'
    WHEN NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()) THEN '🚨 USUÁRIO SEM PERFIL'
    WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = false) THEN '🚨 USUÁRIO INATIVO'
    WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'viewer') THEN '⚠️ USUÁRIO COM ROLE VIEWER'
    WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'editor') THEN '✅ USUÁRIO EDITOR'
    WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin') THEN '✅ USUÁRIO ADMIN'
    ELSE '🚨 PROBLEMA DESCONHECIDO'
  END as diagnostic_result;

-- ============================================================================
-- 7. VERIFICAR SE EXISTEM OUTROS ADMINS
-- ============================================================================

-- Ver quantos admins existem no sistema
SELECT
  'ADMINS NO SISTEMA' as info,
  COUNT(*) as admin_count,
  string_agg(email, ', ') as admin_emails
FROM user_profiles
WHERE role = 'admin' AND is_active = true;

-- ============================================================================
-- 8. SOLUÇÕES RÁPIDAS (EXECUTE APENAS UMA CONFORME NECESSÁRIO)
-- ============================================================================

-- SOLUÇÃO A: Se usuário autenticado não tem perfil, criar perfil admin
-- DESCOMENTE APENAS SE O DIAGNÓSTICO MOSTRAR "USUÁRIO SEM PERFIL"
/*
INSERT INTO user_profiles (id, email, role, is_active, created_at, updated_at)
SELECT
  id,
  email,
  'admin',
  true,
  NOW(),
  NOW()
FROM auth.users
WHERE id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid());

SELECT 'PERFIL ADMIN CRIADO PARA USUÁRIO ATUAL' as resultado;
*/

-- SOLUÇÃO B: Se usuário tem perfil mas não é admin, promover para admin
-- DESCOMENTE APENAS SE O DIAGNÓSTICO MOSTRAR "USUÁRIO COM ROLE VIEWER/EDITOR"
/*
UPDATE user_profiles
SET
  role = 'admin',
  is_active = true,
  updated_at = NOW()
WHERE id = auth.uid()
AND role != 'admin';

SELECT 'USUÁRIO ATUAL PROMOVIDO PARA ADMIN' as resultado;
*/

-- SOLUÇÃO C: Se usuário está inativo, reativar
-- DESCOMENTE APENAS SE O DIAGNÓSTICO MOSTRAR "USUÁRIO INATIVO"
/*
UPDATE user_profiles
SET
  is_active = true,
  updated_at = NOW()
WHERE id = auth.uid()
AND is_active = false;

SELECT 'USUÁRIO ATUAL REATIVADO' as resultado;
*/

-- ============================================================================
-- 9. VERIFICAÇÃO FINAL
-- ============================================================================

-- Status atual após qualquer correção
SELECT
  '=== STATUS FINAL ===' as info,
  auth.uid() as user_id,
  u.email,
  COALESCE(up.role, 'SEM PERFIL') as role,
  COALESCE(up.is_active, false) as is_active,
  CASE
    WHEN up.role = 'admin' AND up.is_active = true THEN '✅ ADMIN ATIVO'
    WHEN up.role = 'editor' AND up.is_active = true THEN '✅ EDITOR ATIVO'
    WHEN up.role = 'viewer' AND up.is_active = true THEN '✅ VIEWER ATIVO'
    WHEN up.is_active = false THEN '❌ USUÁRIO INATIVO'
    WHEN up.role IS NULL THEN '❌ SEM PERFIL'
    ELSE '❌ PROBLEMA'
  END as final_status
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.id = auth.uid();

-- ============================================================================
-- INSTRUÇÕES PARA USO
-- ============================================================================

/*
🔧 COMO RESOLVER:

1. Execute este script completo PRIMEIRO
2. Olhe o resultado da seção "6. IDENTIFICAR PROBLEMA ESPECÍFICO"
3. Baseado no problema, descomente UMA das soluções da seção 8
4. Execute novamente para ver a seção "9. VERIFICAÇÃO FINAL"

🚨 ENVIE-ME:
- O resultado da seção 6 (diagnostic_result)
- O status final da seção 9
- Quantos admins existem (seção 7)

Com essas informações vou te orientar na solução exata!
*/

-- ✅ EXECUTE E ME DIGA OS RESULTADOS!