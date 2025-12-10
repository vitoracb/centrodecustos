-- ==============================================================================
-- SCRIPT ULTRA SIMPLES: DIAGNÓSTICO E CORREÇÃO RÁPIDA
-- ==============================================================================

-- 🎯 VAMOS DIRETO AO PONTO!

-- ============================================================================
-- 1. VERIFICAR USUÁRIO ATUAL
-- ============================================================================

SELECT
  'USUÁRIO ATUAL:' as info,
  auth.uid() as seu_user_id,
  u.email as seu_email
FROM auth.users u
WHERE u.id = auth.uid();

-- ============================================================================
-- 2. VERIFICAR SE TEM PERFIL
-- ============================================================================

SELECT
  'SEU PERFIL:' as info,
  CASE
    WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()) THEN 'TEM PERFIL'
    ELSE 'SEM PERFIL'
  END as status_perfil,
  up.role as seu_role,
  up.is_active as esta_ativo
FROM user_profiles up
WHERE up.id = auth.uid();

-- ============================================================================
-- 3. VER TODOS OS ADMINS
-- ============================================================================

SELECT
  'TODOS OS ADMINS:' as info,
  up.email as admin_email,
  up.role,
  up.is_active
FROM user_profiles up
WHERE up.role = 'admin';

-- ============================================================================
-- 4. SOLUÇÃO RÁPIDA: CRIAR/CORRIGIR SEU PERFIL ADMIN
-- ============================================================================

-- Se você não tem perfil, criar um:
INSERT INTO user_profiles (id, email, role, is_active, created_at, updated_at)
SELECT
  auth.uid(),
  u.email,
  'admin',
  true,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid())
ON CONFLICT (id) DO NOTHING;

-- Se você tem perfil mas não é admin, promover:
UPDATE user_profiles
SET
  role = 'admin',
  is_active = true,
  updated_at = NOW()
WHERE id = auth.uid()
AND (role != 'admin' OR is_active = false);

-- ============================================================================
-- 5. VERIFICAÇÃO FINAL
-- ============================================================================

SELECT
  '=== RESULTADO FINAL ===' as info,
  auth.uid() as user_id,
  u.email,
  up.role,
  up.is_active,
  CASE
    WHEN up.role = 'admin' AND up.is_active = true THEN '✅ ADMIN ATIVO'
    ELSE '❌ AINDA COM PROBLEMA'
  END as status_final
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.id = auth.uid();

-- ============================================================================
-- 6. TESTAR ACESSO
-- ============================================================================

-- Teste básico: consegue ver centros?
SELECT
  'TESTE DE ACESSO:' as info,
  COUNT(*) as centros_visiveis,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ACESSO OK'
    ELSE '❌ SEM ACESSO'
  END as resultado_teste
FROM cost_centers;

-- ============================================================================
-- INSTRUÇÕES
-- ============================================================================

/*
🚀 ESTE SCRIPT:

1. ✅ Verifica seu usuário atual
2. ✅ Mostra se você tem perfil
3. ✅ Lista todos os admins
4. ⚡ CORRIGE automaticamente seu perfil para admin
5. ✅ Testa se o acesso voltou

📱 APÓS EXECUTAR:
- Faça logout do app
- Faça login novamente
- Teste as funcionalidades

🎯 SE AINDA NÃO FUNCIONAR:
Me envie o resultado da seção "5. VERIFICAÇÃO FINAL"
*/

-- ✅ EXECUTE TUDO DE UMA VEZ!