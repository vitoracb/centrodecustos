-- ==============================================================================
-- SCRIPT 5: TESTES DE SEGURANÇA E VERIFICAÇÃO
-- Execute após 04_audit_functions.sql
-- ==============================================================================

-- ============================================================================
-- VERIFICAÇÕES DE ESTRUTURA
-- ============================================================================

-- 1. Verificar se RLS está ativado nas tabelas principais
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('financial_transactions', 'equipments', 'contracts', 'orders', 'cost_centers', 'audit_logs', 'user_permissions')
ORDER BY tablename;

-- 2. Verificar políticas RLS criadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as command,
  qual as condition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Verificar triggers de auditoria
SELECT
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation as trigger_event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'audit_%'
ORDER BY event_object_table;

-- 4. Verificar funções criadas
SELECT
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('log_financial_action', 'validate_financial_values', 'cleanup_old_audit_logs')
ORDER BY routine_name;

-- 5. Verificar estrutura da tabela audit_logs
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- ============================================================================
-- TESTES FUNCIONAIS (EXECUTE APENAS SE TIVER DADOS DE TESTE)
-- ============================================================================

-- IMPORTANTE: Os testes abaixo devem ser executados apenas se você tiver
-- um usuário de teste configurado e dados de exemplo. Adapte conforme necessário.

-- Teste 1: Verificar se usuário pode ver centros de custo
-- (Este deve funcionar para qualquer usuário autenticado)
/*
SELECT id, code, name FROM cost_centers LIMIT 5;
*/

-- Teste 2: Verificar inserção de log de auditoria
-- (Este deve funcionar)
/*
INSERT INTO audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  cost_center_id,
  metadata
) VALUES (
  auth.uid(),
  'CREATE',
  'EXPENSE',
  'test-123',
  'valenca',
  '{"test": true}'
);
*/

-- Teste 3: Tentar atualizar log de auditoria
-- (Este deve FALHAR - logs são imutáveis)
/*
UPDATE audit_logs SET action = 'UPDATE' WHERE entity_id = 'test-123';
*/

-- Teste 4: Tentar deletar log de auditoria
-- (Este deve FALHAR - logs não podem ser deletados)
/*
DELETE FROM audit_logs WHERE entity_id = 'test-123';
*/

-- ============================================================================
-- QUERIES DE MONITORAMENTO
-- ============================================================================

-- Monitorar tentativas de acesso negado (execute periodicamente)
SELECT
  log_time,
  user_name,
  database_name,
  command_tag,
  message
FROM pg_log
WHERE message LIKE '%permission denied%'
OR message LIKE '%policy violation%'
ORDER BY log_time DESC
LIMIT 10;

-- Estatísticas de uso da auditoria
SELECT
  entity_type,
  action,
  COUNT(*) as count,
  MIN(timestamp) as first_occurrence,
  MAX(timestamp) as last_occurrence
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY entity_type, action
ORDER BY count DESC;

-- Usuários mais ativos nos logs
SELECT
  COALESCE(p.email, 'sistema') as user_email,
  COUNT(*) as actions_count,
  COUNT(DISTINCT al.cost_center_id) as centers_accessed
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.user_id
WHERE al.timestamp > NOW() - INTERVAL '7 days'
GROUP BY p.email
ORDER BY actions_count DESC;

-- ============================================================================
-- QUERIES PARA ADMINISTRAÇÃO
-- ============================================================================

-- Ver permissões de usuários
/*
SELECT
  p.email,
  p.name,
  p.role,
  up.cost_center_id,
  cc.name as cost_center_name,
  up.can_read,
  up.can_write,
  up.is_admin
FROM profiles p
LEFT JOIN user_permissions up ON up.user_id = p.id
LEFT JOIN cost_centers cc ON cc.code = up.cost_center_id
ORDER BY p.email, up.cost_center_id;
*/

-- Adicionar permissão de exemplo (apenas para teste)
/*
-- EXEMPLO: Dar permissão de leitura e escrita para um usuário no centro 'valenca'
INSERT INTO user_permissions (user_id, cost_center_id, can_read, can_write, is_admin)
VALUES (
  'seu-user-id-aqui',
  'valenca',
  true,
  true,
  false
);
*/

-- ============================================================================
-- LIMPEZA DE TESTE (EXECUTE SE NECESSÁRIO)
-- ============================================================================

-- Remover logs de teste criados
/*
DELETE FROM audit_logs WHERE metadata->>'test' = 'true';
*/

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Contar registros por tabela principal
SELECT 'cost_centers' as table_name, COUNT(*) as record_count FROM cost_centers
UNION ALL
SELECT 'audit_logs' as table_name, COUNT(*) as record_count FROM audit_logs
UNION ALL
SELECT 'user_permissions' as table_name, COUNT(*) as record_count FROM user_permissions
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_permissions')
ORDER BY table_name;

-- Status final
SELECT
  'RLS Setup Complete' as status,
  NOW() as completion_time,
  current_user as executed_by;

-- ✅ SCRIPT 5 CONCLUÍDO
-- SEGURANÇA RLS TOTALMENTE CONFIGURADA!

-- ============================================================================
-- PRÓXIMOS PASSOS
-- ============================================================================

/*
1. ✅ Execute os scripts 1-5 na ordem no Supabase SQL Editor
2. 🔧 Configure permissões de usuário na tabela user_permissions
3. 🧪 Teste com usuários reais da aplicação
4. 📊 Monitore logs de auditoria regularmente
5. 🔄 Execute cleanup_old_audit_logs() mensalmente se necessário

EXEMPLO DE CONFIGURAÇÃO DE USUÁRIO:

INSERT INTO user_permissions (user_id, cost_center_id, can_read, can_write, is_admin)
VALUES
  ('user-uuid-1', 'valenca', true, true, false),
  ('user-uuid-1', 'cna', true, false, false),
  ('user-uuid-1', 'cabralia', true, false, false);

Isso daria ao usuário:
- Leitura/Escrita em Valença
- Apenas Leitura em CNA e Cabrália
*/