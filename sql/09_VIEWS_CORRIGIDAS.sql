-- ==============================================================================
-- VIEWS CORRIGIDAS - PROBLEMA DO DATE_TRUNC RESOLVIDO
-- ==============================================================================

-- 🔧 CORREÇÃO: Cast explícito da coluna date de TEXT para DATE

-- ============================================================================
-- VIEW 1: FINANCIAL MONTHLY SUMMARY (CORRIGIDA)
-- ============================================================================

CREATE OR REPLACE VIEW financial_monthly_summary AS
SELECT
  cost_center_id,
  DATE_TRUNC('month', date::date) as month_year,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN type = 'expense' THEN value::numeric ELSE 0 END) as expenses_total,
  SUM(CASE WHEN type = 'receipt' THEN value::numeric ELSE 0 END) as receipts_total
FROM financial_transactions
WHERE date::date >= '2023-01-01'::date
GROUP BY cost_center_id, DATE_TRUNC('month', date::date)
ORDER BY month_year DESC;

-- Testar:
SELECT * FROM financial_monthly_summary LIMIT 3;

-- ============================================================================
-- VIEW 2: EQUIPMENTS WITH STATUS (SIMPLES)
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

-- Testar:
SELECT * FROM equipments_with_status LIMIT 3;

-- ============================================================================
-- VIEW 3: ORDERS WITH INFO (SIMPLES)
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

-- Testar:
SELECT * FROM orders_with_info LIMIT 3;

-- ============================================================================
-- VIEW 4: CONTRACTS ACTIVE (SIMPLES)
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

-- Testar:
SELECT * FROM contracts_active LIMIT 3;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

SELECT 'VIEWS CRIADAS COM SUCESSO' as status;

SELECT table_name as view_criada
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'financial_monthly_summary',
  'equipments_with_status',
  'orders_with_info',
  'contracts_active'
)
ORDER BY table_name;

-- ✅ AGORA DEVE FUNCIONAR!
-- A correção principal foi: date::date para converter TEXT em DATE