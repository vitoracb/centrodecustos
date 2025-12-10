-- ==============================================================================
-- VIEWS FUNCIONAIS - BASEADAS NA ESTRUTURA REAL
-- ==============================================================================

-- ✅ Agora sei as colunas reais! Vou criar views que funcionam

-- ============================================================================
-- VIEW 1: FINANCIAL SUMMARY (CONHECEMOS A ESTRUTURA)
-- ============================================================================

CREATE OR REPLACE VIEW financial_summary AS
SELECT
  cost_center_id,
  type,
  COALESCE(value, 0) as value,
  date,
  description,
  created_at
FROM financial_transactions
ORDER BY created_at DESC;

-- Testar:
SELECT * FROM financial_summary LIMIT 3;

-- ============================================================================
-- VIEW 2: EQUIPMENTS OVERVIEW (BASEADO NA ESTRUTURA REAL)
-- ============================================================================

CREATE OR REPLACE VIEW equipments_overview AS
SELECT
  id,
  name,
  brand,
  year,
  purchase_date,
  next_review,  -- nome correto da coluna
  status,       -- não é 'active', é 'status'
  cost_center_id,
  created_at,

  -- Status da revisão calculado
  CASE
    WHEN next_review IS NULL THEN 'sem_revisao'
    WHEN next_review::date < CURRENT_DATE THEN 'vencida'
    WHEN next_review::date <= CURRENT_DATE + INTERVAL '30 days' THEN 'proxima'
    ELSE 'ok'
  END as review_status

FROM equipments
WHERE deleted_at IS NULL
ORDER BY next_review ASC NULLS LAST;

-- Testar:
SELECT * FROM equipments_overview LIMIT 3;

-- ============================================================================
-- VIEW 3: ORDERS BASIC (SEM ASSUMIR COLUNAS QUE NÃO EXISTEM)
-- ============================================================================

CREATE OR REPLACE VIEW orders_overview AS
SELECT
  id,
  cost_center_id,
  status,
  equipment_ids,
  created_at,

  -- Calcular dias desde criação
  EXTRACT(days FROM NOW() - created_at)::integer as days_old

FROM orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- Testar:
SELECT * FROM orders_overview LIMIT 3;

-- ============================================================================
-- VIEW 4: CONTRACTS OVERVIEW
-- ============================================================================

CREATE OR REPLACE VIEW contracts_overview AS
SELECT
  id,
  name,
  description,
  start_date,
  end_date,
  cost_center_id,
  created_at,

  -- Status do contrato
  CASE
    WHEN end_date IS NULL THEN 'indefinido'
    WHEN end_date::date < CURRENT_DATE THEN 'vencido'
    WHEN end_date::date <= CURRENT_DATE + INTERVAL '30 days' THEN 'vencendo'
    ELSE 'ativo'
  END as contract_status

FROM contracts
WHERE deleted_at IS NULL
ORDER BY end_date ASC NULLS LAST;

-- Testar:
SELECT * FROM contracts_overview LIMIT 3;

-- ============================================================================
-- VIEW 5: DASHBOARD MENSAL (COM CAST CORRETO)
-- ============================================================================

CREATE OR REPLACE VIEW dashboard_monthly AS
SELECT
  cost_center_id,
  DATE_TRUNC('month', date::date) as month_year,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN type = 'expense' THEN 1 END) as expenses_count,
  COUNT(CASE WHEN type = 'receipt' THEN 1 END) as receipts_count,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN value::numeric END), 0) as expenses_total,
  COALESCE(SUM(CASE WHEN type = 'receipt' THEN value::numeric END), 0) as receipts_total

FROM financial_transactions
WHERE date IS NOT NULL
  AND date::date >= '2023-01-01'::date
GROUP BY cost_center_id, DATE_TRUNC('month', date::date)
ORDER BY month_year DESC, cost_center_id;

-- Testar:
SELECT * FROM dashboard_monthly LIMIT 5;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Listar views criadas
SELECT
  table_name as view_name,
  'CRIADA' as status
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

-- Contar registros em cada view
SELECT 'financial_summary' as view_name, COUNT(*) as records FROM financial_summary
UNION ALL
SELECT 'equipments_overview' as view_name, COUNT(*) as records FROM equipments_overview
UNION ALL
SELECT 'orders_overview' as view_name, COUNT(*) as records FROM orders_overview
UNION ALL
SELECT 'contracts_overview' as view_name, COUNT(*) as records FROM contracts_overview
UNION ALL
SELECT 'dashboard_monthly' as view_name, COUNT(*) as records FROM dashboard_monthly
ORDER BY view_name;

-- ✅ AGORA DEVEM FUNCIONAR TODAS AS VIEWS!
-- Baseadas na estrutura real que você mostrou