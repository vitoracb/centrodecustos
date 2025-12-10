-- ==============================================================================
-- SCRIPT PERFORMANCE 3: TESTE DAS OTIMIZAÇÕES
-- Valida se índices e views estão funcionando corretamente
-- ==============================================================================

-- 🧪 Scripts de teste para verificar performance antes/depois

-- ============================================================================
-- 1. VERIFICAR SE ÍNDICES FORAM CRIADOS
-- ============================================================================

-- Lista todos os índices de performance criados
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- ============================================================================
-- 2. VERIFICAR SE VIEWS FORAM CRIADAS
-- ============================================================================

-- Lista views de performance criadas
SELECT
  table_name as view_name,
  'VIEW' as object_type
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'dashboard_monthly_summary',
  'equipment_overview',
  'orders_complete',
  'contract_overview',
  'employee_summary',
  'activity_timeline',
  'global_search_index'
)
ORDER BY table_name;

-- ============================================================================
-- 3. TESTE DE PERFORMANCE - CONSULTAS OTIMIZADAS
-- ============================================================================

-- Ativar timing para medir performance
\timing on

-- TESTE 1: Dashboard summary (antes: múltiplas consultas, agora: 1 view)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  cost_center_name,
  month_year,
  expenses_value,
  receipts_value,
  balance,
  total_expenses + total_receipts as total_transactions
FROM dashboard_monthly_summary
WHERE month_year >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
ORDER BY month_year DESC, expenses_value DESC
LIMIT 20;

-- TESTE 2: Equipamentos com status (antes: consulta + cálculos, agora: view)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  name,
  brand,
  cost_center_name,
  review_status,
  days_to_review,
  equipment_age_years
FROM equipment_overview
WHERE review_status IN ('vencida', 'proxima')
ORDER BY days_to_review ASC NULLS LAST
LIMIT 10;

-- TESTE 3: Busca de texto otimizada (usando índice GIN)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  entity_type,
  search_text,
  cost_center_name,
  additional_info
FROM global_search_index
WHERE to_tsvector('portuguese', search_text) @@ to_tsquery('portuguese', 'equipamento | bomba')
ORDER BY created_at DESC
LIMIT 10;

-- TESTE 4: Transações financeiras por período (usando índice)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  cost_center_id,
  type,
  description,
  value,
  date
FROM financial_transactions
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
AND cost_center_id IN ('valenca', 'cna')
ORDER BY date DESC, value DESC
LIMIT 50;

-- TESTE 5: Orders completas (view vs JOINs manuais)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  title,
  status,
  cost_center_name,
  equipment_names,
  documents_count,
  documents_status,
  days_since_created
FROM orders_complete
WHERE status IN ('pendente', 'em_andamento')
AND days_since_created <= 30
ORDER BY days_since_created DESC;

-- ============================================================================
-- 4. COMPARAÇÃO DE PERFORMANCE (SIMULAÇÃO ANTES/DEPOIS)
-- ============================================================================

-- SIMULAÇÃO "ANTES" - consultas não otimizadas
-- (Comente estas se causarem lentidão)

/*
-- Consulta não otimizada para dashboard (ANTES)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  ft.cost_center_id,
  cc.name as cost_center_name,
  COUNT(CASE WHEN ft.type = 'expense' THEN 1 END) as expenses,
  COUNT(CASE WHEN ft.type = 'receipt' THEN 1 END) as receipts,
  SUM(CASE WHEN ft.type = 'expense' THEN ft.value END) as expense_total,
  SUM(CASE WHEN ft.type = 'receipt' THEN ft.value END) as receipt_total
FROM financial_transactions ft
LEFT JOIN cost_centers cc ON cc.code = ft.cost_center_id
WHERE ft.date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY ft.cost_center_id, cc.name
ORDER BY expense_total DESC;
*/

-- ============================================================================
-- 5. TESTE DE ÍNDICES ESPECÍFICOS
-- ============================================================================

-- Verificar se índice de data está sendo usado
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*)
FROM financial_transactions
WHERE date BETWEEN '2024-01-01' AND '2024-12-31';

-- Verificar se índice de texto está sendo usado
EXPLAIN (ANALYZE, BUFFERS)
SELECT name, brand
FROM equipments
WHERE to_tsvector('portuguese', name || ' ' || COALESCE(brand, '')) @@ to_tsquery('portuguese', 'bomba')
AND deleted_at IS NULL;

-- Verificar se índice de status em orders está sendo usado
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title, status
FROM orders
WHERE status = 'pendente'
AND deleted_at IS NULL
ORDER BY created_at DESC;

-- ============================================================================
-- 6. ESTATÍSTICAS DE USO DOS ÍNDICES
-- ============================================================================

-- Ver estatísticas de uso dos índices
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as total_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- ============================================================================
-- 7. TAMANHO DAS TABELAS E PERFORMANCE
-- ============================================================================

-- Ver tamanho das tabelas principais
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                 pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'financial_transactions',
  'equipments',
  'orders',
  'contracts',
  'employee_documents'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- 8. TESTE DE CACHE DE QUERIES
-- ============================================================================

-- Executar a mesma query duas vezes para ver cache effect
-- Primeira execução
SELECT 'PRIMEIRA EXECUÇÃO' as test_round;
SELECT COUNT(*) FROM dashboard_monthly_summary;

-- Segunda execução (deveria ser mais rápida devido ao cache)
SELECT 'SEGUNDA EXECUÇÃO (CACHE)' as test_round;
SELECT COUNT(*) FROM dashboard_monthly_summary;

-- ============================================================================
-- 9. RECOMENDAÇÕES BASEADAS NOS RESULTADOS
-- ============================================================================

-- Análise de queries mais lentas
SELECT
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE query LIKE '%financial_transactions%'
OR query LIKE '%equipments%'
OR query LIKE '%orders%'
ORDER BY mean_time DESC
LIMIT 10;

-- ============================================================================
-- RESULTADO FINAL
-- ============================================================================

SELECT
  'TESTE DE PERFORMANCE CONCLUÍDO' as status,
  COUNT(DISTINCT indexname) as indices_criados,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public'
   AND table_name LIKE '%_overview' OR table_name LIKE '%_summary' OR table_name LIKE '%timeline%') as views_criadas,
  NOW() as test_completed_at
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

-- ✅ SCRIPT 3 CONCLUÍDO

/*
📊 COMO INTERPRETAR OS RESULTADOS:

🔍 EXPLAIN ANALYZE:
- "Index Scan" = índice sendo usado ✅
- "Seq Scan" = varredura completa da tabela ❌
- "Execution Time" < 100ms = muito bom ✅
- "Execution Time" > 1000ms = precisa otimizar ❌

📈 PERFORMANCE ESPERADA:
ANTES (sem otimizações):
- Dashboard: 2000-5000ms
- Lista equipamentos: 500-2000ms
- Busca global: 3000-8000ms

DEPOIS (com otimizações):
- Dashboard: 100-500ms
- Lista equipamentos: 50-200ms
- Busca global: 200-800ms

🎯 SE OS TEMPOS AINDA ESTÃO ALTOS:
1. Execute VACUUM ANALYZE nas tabelas principais
2. Verifique se os índices estão sendo usados
3. Considere aumentar work_mem no PostgreSQL

EXECUTE E ME DIGA OS RESULTADOS!
*/