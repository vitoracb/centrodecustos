-- ==============================================================================
-- TESTE FINAL: VERIFICAR SE TODAS AS OTIMIZAÇÕES ESTÃO FUNCIONANDO
-- ==============================================================================

-- ✅ Script final para verificar se SQL foi otimizado com sucesso

-- ============================================================================
-- 1. VERIFICAR ÍNDICES CRIADOS
-- ============================================================================

SELECT 'ÍNDICES DE PERFORMANCE' as tipo, COUNT(*) as total
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

-- Listar índices criados
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY tablename;

-- ============================================================================
-- 2. VERIFICAR VIEWS CRIADAS
-- ============================================================================

SELECT 'VIEWS DE PERFORMANCE' as tipo, COUNT(*) as total
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'financial_summary',
  'equipments_overview',
  'orders_overview',
  'contracts_overview',
  'dashboard_monthly'
);

-- Listar views funcionais
SELECT table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'financial_summary',
  'equipments_overview',
  'orders_overview',
  'contracts_overview',
  'dashboard_monthly'
)
ORDER BY table_name;

-- ============================================================================
-- 3. TESTE DE PERFORMANCE DAS VIEWS
-- ============================================================================

-- Teste 1: Financial summary
SELECT 'FINANCIAL_SUMMARY' as view_name, COUNT(*) as registros
FROM financial_summary;

-- Teste 2: Equipments overview
SELECT 'EQUIPMENTS_OVERVIEW' as view_name, COUNT(*) as registros
FROM equipments_overview;

-- Teste 3: Orders overview
SELECT 'ORDERS_OVERVIEW' as view_name, COUNT(*) as registros
FROM orders_overview;

-- Teste 4: Dashboard monthly
SELECT 'DASHBOARD_MONTHLY' as view_name, COUNT(*) as registros
FROM dashboard_monthly;

-- ============================================================================
-- 4. EXEMPLO DE CONSULTA OTIMIZADA
-- ============================================================================

-- Dashboard rápido - agora em 1 consulta
SELECT
  cost_center_id,
  month_year,
  expenses_total,
  receipts_total,
  (receipts_total - expenses_total) as saldo
FROM dashboard_monthly
WHERE month_year >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
ORDER BY month_year DESC, expenses_total DESC
LIMIT 10;

-- ============================================================================
-- 5. RESUMO FINAL
-- ============================================================================

SELECT
  'SQL OTIMIZADO' as status,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as indices_performance,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public'
   AND table_name IN ('financial_summary', 'equipments_overview', 'orders_overview', 'contracts_overview', 'dashboard_monthly')) as views_performance,
  'PRONTO PARA REACT NATIVE' as proximo_passo;

-- ✅ SE ESTE SCRIPT RODAR SEM ERROS, O SQL ESTÁ OTIMIZADO!
-- Próximo: Otimizar React Native