-- ==============================================================================
-- SCRIPT PERFORMANCE SIMPLES: VIEWS BÁSICAS PARA SUPABASE
-- ==============================================================================

-- ⚡ Views essenciais que funcionam no Supabase

-- ============================================================================
-- 1. RESUMO FINANCEIRO MENSAL
-- ============================================================================

CREATE OR REPLACE VIEW financial_monthly_summary AS
SELECT
  cost_center_id,
  DATE_TRUNC('month', date) as month_year,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN type = 'expense' THEN 1 END) as expenses_count,
  COUNT(CASE WHEN type = 'receipt' THEN 1 END) as receipts_count,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN value END), 0) as expenses_total,
  COALESCE(SUM(CASE WHEN type = 'receipt' THEN value END), 0) as receipts_total,
  COALESCE(SUM(CASE WHEN type = 'receipt' THEN value END), 0) -
  COALESCE(SUM(CASE WHEN type = 'expense' THEN value END), 0) as balance
FROM financial_transactions
WHERE date >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY cost_center_id, DATE_TRUNC('month', date)
ORDER BY month_year DESC, cost_center_id;

-- ============================================================================
-- 2. EQUIPAMENTOS COM STATUS
-- ============================================================================

CREATE OR REPLACE VIEW equipments_with_status AS
SELECT
  id,
  name,
  brand,
  model,
  cost_center_id,
  next_review_date,
  active,
  created_at,
  CASE
    WHEN next_review_date IS NULL THEN 'sem_revisao'
    WHEN next_review_date < CURRENT_DATE THEN 'vencida'
    WHEN next_review_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'proxima'
    ELSE 'ok'
  END as review_status
FROM equipments
WHERE deleted_at IS NULL
ORDER BY next_review_date ASC NULLS LAST;

-- ============================================================================
-- 3. ORDERS COM INFORMAÇÕES BÁSICAS
-- ============================================================================

CREATE OR REPLACE VIEW orders_with_info AS
SELECT
  id,
  title,
  description,
  status,
  equipment_ids,
  cost_center_id,
  created_at,
  updated_at,
  EXTRACT(days FROM NOW() - created_at)::integer as days_old
FROM orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- ============================================================================
-- 4. CONTRATOS ATIVOS
-- ============================================================================

CREATE OR REPLACE VIEW contracts_active AS
SELECT
  id,
  name,
  description,
  start_date,
  end_date,
  cost_center_id,
  created_at,
  CASE
    WHEN end_date IS NULL THEN 'indefinido'
    WHEN end_date < CURRENT_DATE THEN 'vencido'
    WHEN end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'vencendo'
    ELSE 'ativo'
  END as status
FROM contracts
WHERE deleted_at IS NULL
ORDER BY end_date ASC NULLS LAST;

-- ============================================================================
-- 5. RESUMO DE FUNCIONÁRIOS POR CENTRO
-- ============================================================================

CREATE OR REPLACE VIEW employees_by_center AS
SELECT
  cost_center_id,
  COUNT(DISTINCT employee_name) as total_employees,
  COUNT(*) as total_documents,
  MAX(created_at) as last_document_date
FROM employee_documents
WHERE deleted_at IS NULL
GROUP BY cost_center_id
ORDER BY total_employees DESC;

-- ============================================================================
-- 6. ATIVIDADES RECENTES (SIMPLES)
-- ============================================================================

CREATE OR REPLACE VIEW recent_activities AS
-- Transações financeiras recentes
SELECT
  'financial' as type,
  description as title,
  cost_center_id,
  value::text as info,
  created_at
FROM financial_transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

-- Equipamentos recentes
SELECT
  'equipment' as type,
  name as title,
  cost_center_id,
  brand as info,
  created_at
FROM equipments
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
AND deleted_at IS NULL

UNION ALL

-- Pedidos recentes
SELECT
  'order' as type,
  title,
  cost_center_id,
  status as info,
  created_at
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
AND deleted_at IS NULL

ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- VERIFICAÇÃO DAS VIEWS
-- ============================================================================

-- Listar views criadas
SELECT
  table_name as view_name,
  'VIEW' as type
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

-- Teste rápido das views
SELECT 'financial_monthly_summary' as view_name, COUNT(*) as records FROM financial_monthly_summary
UNION ALL
SELECT 'equipments_with_status' as view_name, COUNT(*) as records FROM equipments_with_status
UNION ALL
SELECT 'orders_with_info' as view_name, COUNT(*) as records FROM orders_with_info
UNION ALL
SELECT 'contracts_active' as view_name, COUNT(*) as records FROM contracts_active
UNION ALL
SELECT 'employees_by_center' as view_name, COUNT(*) as records FROM employees_by_center
UNION ALL
SELECT 'recent_activities' as view_name, COUNT(*) as records FROM recent_activities;

-- ✅ VIEWS BÁSICAS CRIADAS!
-- Muito mais simples e compatível com Supabase