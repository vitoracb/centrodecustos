-- ==============================================================================
-- SCRIPT URGENTE: DIAGNOSTICAR E CORRIGIR PROBLEMA DE ROLES
-- Execute IMEDIATAMENTE no Supabase para identificar o problema
-- ==============================================================================

-- 🚨 PROBLEMA: Após reset de senha, usuário perdeu acesso admin

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

-- Ver todos os perfis e seus roles
SELECT
  id as user_id,
  email,
  name,
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
  up.is_active
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

-- Verificar se o problema é:
-- A) Usuário sem perfil
-- B) Perfil com role incorreto
-- C) Usuário inativo
-- D) Problema nas políticas RLS

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
-- 7. SOLUÇÕES AUTOMÁTICAS (EXECUTE APENAS SE NECESSÁRIO)
-- ============================================================================

-- SOLUÇÃO A: Se usuário autenticado não tem perfil, criar perfil admin
/*
INSERT INTO user_profiles (id, email, name, role, is_active)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', email),
  'admin',
  true
FROM auth.users
WHERE id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid());
*/

-- SOLUÇÃO B: Se usuário tem perfil mas não é admin, promover para admin
/*
UPDATE user_profiles
SET
  role = 'admin',
  is_active = true,
  updated_at = NOW()
WHERE id = auth.uid()
AND role != 'admin';
*/

-- SOLUÇÃO C: Se usuário está inativo, reativar
/*
UPDATE user_profiles
SET
  is_active = true,
  updated_at = NOW()
WHERE id = auth.uid()
AND is_active = false;
*/

-- ============================================================================
-- 8. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar status após correções
SELECT
  '=== STATUS ATUAL ===' as info,
  auth.uid() as user_id,
  u.email,
  up.role,
  up.is_active,
  CASE
    WHEN up.role = 'admin' AND up.is_active = true THEN '✅ ADMIN ATIVO'
    WHEN up.role = 'editor' AND up.is_active = true THEN '✅ EDITOR ATIVO'
    WHEN up.role = 'viewer' AND up.is_active = true THEN '✅ VIEWER ATIVO'
    WHEN up.is_active = false THEN '❌ USUÁRIO INATIVO'
    ELSE '❌ PROBLEMA'
  END as final_status
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.id = auth.uid();

-- ============================================================================
-- INSTRUÇÕES
-- ============================================================================

/*
🔧 COMO USAR ESTE SCRIPT:

1. Execute todo o script de diagnóstico primeiro
2. Analise os resultados das seções 1-6
3. Se necessário, descomente e execute UMA das soluções da seção 7
4. Execute a verificação final da seção 8

🚨 PROBLEMAS MAIS COMUNS:
- Reset de senha criou novo auth.users mas não atualizou user_profiles
- Perfil perdeu role admin
- Usuário foi marcado como inativo
- Políticas RLS estão bloqueando acesso

💡 APÓS RESOLVER:
- Faça logout/login no app
- Teste funcionalidades admin
- Verifique outros usuários
*/

-- ✅ EXECUTE E ME DIGA OS RESULTADOS!