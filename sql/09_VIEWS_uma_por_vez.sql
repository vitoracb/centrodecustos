-- ==============================================================================
-- VIEWS ULTRA SIMPLES - UMA POR VEZ
-- Execute cada bloco separadamente para identificar qual view está causando erro
-- ==============================================================================

-- ============================================================================
-- VIEW 1: FINANCIAL MONTHLY SUMMARY (EXECUTE PRIMEIRO)
-- ============================================================================

CREATE OR REPLACE VIEW financial_monthly_summary AS
SELECT
  cost_center_id,
  DATE_TRUNC('month', date) as month_year,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN type = 'expense' THEN value ELSE 0 END) as expenses_total,
  SUM(CASE WHEN type = 'receipt' THEN value ELSE 0 END) as receipts_total
FROM financial_transactions
WHERE date >= '2023-01-01'
GROUP BY cost_center_id, DATE_TRUNC('month', date)
ORDER BY month_year DESC;

-- Testar esta view:
SELECT * FROM financial_monthly_summary LIMIT 3;

-- ============================================================================
-- VIEW 2: EQUIPMENTS WITH STATUS (EXECUTE DEPOIS)
-- ============================================================================

CREATE OR REPLACE VIEW equipments_with_status AS
SELECT
  id,
  name,
  brand,
  cost_center_id,
  next_review_date,
  active,
  created_at
FROM equipments
WHERE deleted_at IS NULL
ORDER BY name;

-- Testar esta view:
SELECT * FROM equipments_with_status LIMIT 3;

-- ============================================================================
-- VIEW 3: ORDERS WITH INFO (EXECUTE DEPOIS)
-- ============================================================================

CREATE OR REPLACE VIEW orders_with_info AS
SELECT
  id,
  title,
  status,
  cost_center_id,
  created_at
FROM orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- Testar esta view:
SELECT * FROM orders_with_info LIMIT 3;

-- ============================================================================
-- VIEW 4: CONTRACTS ACTIVE (EXECUTE DEPOIS)
-- ============================================================================

CREATE OR REPLACE VIEW contracts_active AS
SELECT
  id,
  name,
  cost_center_id,
  start_date,
  end_date,
  created_at
FROM contracts
WHERE deleted_at IS NULL
ORDER BY name;

-- Testar esta view:
SELECT * FROM contracts_active LIMIT 3;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Ver quais views foram criadas
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'financial_monthly_summary',
  'equipments_with_status',
  'orders_with_info',
  'contracts_active'
)
ORDER BY table_name;

-- ✅ EXECUTE UM BLOCO POR VEZ!
-- Me diga qual view dá erro para eu corrigir especificamente.