-- ==============================================================================
-- SCRIPT TESTE SIMPLES: VERIFICAR SE OTIMIZAÇÕES FUNCIONARAM
-- ==============================================================================

-- ⚡ Teste básico das otimizações no Supabase

-- ============================================================================
-- 1. VERIFICAR ÍNDICES CRIADOS
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- 2. VERIFICAR VIEWS CRIADAS
-- ============================================================================

SELECT
  table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'financial_monthly_summary',
  'equipments_with_status',
  'orders_with_info',
  'contracts_active',
  'employees_by_center',
  'recent_activities'
)
ORDER BY table_name;

-- ============================================================================
-- 3. TESTE BÁSICO DAS VIEWS
-- ============================================================================

-- Teste 1: Resumo financeiro mensal
SELECT
  cost_center_id,
  month_year,
  expenses_total,
  receipts_total,
  balance
FROM financial_monthly_summary
ORDER BY month_year DESC
LIMIT 5;

-- Teste 2: Equipamentos com status de revisão
SELECT
  name,
  cost_center_id,
  review_status,
  next_review_date
FROM equipments_with_status
WHERE review_status IN ('vencida', 'proxima')
LIMIT 10;

-- Teste 3: Pedidos recentes
SELECT
  title,
  status,
  cost_center_id,
  days_old
FROM orders_with_info
WHERE days_old <= 30
ORDER BY created_at DESC
LIMIT 10;

-- Teste 4: Contratos vencendo
SELECT
  name,
  status,
  end_date,
  cost_center_id
FROM contracts_active
WHERE status IN ('vencido', 'vencendo')
LIMIT 10;

-- Teste 5: Atividades recentes
SELECT
  type,
  title,
  cost_center_id,
  info,
  created_at
FROM recent_activities
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 4. TESTE DE CONSULTAS OTIMIZADAS
-- ============================================================================

-- Teste consulta com índice de data
SELECT COUNT(*)
FROM financial_transactions
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Teste consulta com índice de centro de custo
SELECT COUNT(*)
FROM financial_transactions
WHERE cost_center_id = 'valenca';

-- Teste consulta de equipamentos ativos
SELECT COUNT(*)
FROM equipments
WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. COMPARAÇÃO SIMPLES
-- ============================================================================

-- Contar registros principais
SELECT
  'financial_transactions' as tabela,
  COUNT(*) as total_registros
FROM financial_transactions

UNION ALL

SELECT
  'equipments' as tabela,
  COUNT(*) as total_registros
FROM equipments
WHERE deleted_at IS NULL

UNION ALL

SELECT
  'orders' as tabela,
  COUNT(*) as total_registros
FROM orders
WHERE deleted_at IS NULL

UNION ALL

SELECT
  'contracts' as tabela,
  COUNT(*) as total_registros
FROM contracts
WHERE deleted_at IS NULL

ORDER BY total_registros DESC;

-- ============================================================================
-- RESULTADO FINAL
-- ============================================================================

SELECT
  'OTIMIZAÇÕES TESTADAS' as status,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as indices_criados,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public'
   AND table_name IN ('financial_monthly_summary', 'equipments_with_status', 'orders_with_info',
   'contracts_active', 'employees_by_center', 'recent_activities')) as views_criadas,
  NOW() as testado_em;

-- ✅ TESTE SIMPLES CONCLUÍDO!

/*
🎯 O QUE ESTE TESTE FAZ:

1. ✅ Verifica se os índices foram criados
2. ✅ Verifica se as views foram criadas
3. ✅ Testa cada view com dados reais
4. ✅ Testa consultas que devem usar índices
5. ✅ Mostra resumo geral

📊 SE TUDO FUNCIONAR:
- Você verá listas de índices e views
- As consultas retornarão dados reais
- Não haverá erros SQL

🚀 PRÓXIMO PASSO:
Se este script funcionar, as otimizações SQL estão OK
e podemos passar para otimização do React Native!
*/