-- ==============================================================================
-- VIEWS ESSENCIAIS - SÓ AS QUE FUNCIONAM COM CERTEZA
-- ==============================================================================

-- 🎯 Apenas 2-3 views fundamentais que sabemos que funcionam

-- ============================================================================
-- VIEW 1: EQUIPMENTS OVERVIEW (SABEMOS QUE FUNCIONA)
-- ============================================================================

CREATE OR REPLACE VIEW equipments_overview AS
SELECT
  id,
  name,
  brand,
  year,
  status,
  cost_center_id,
  next_review,
  created_at
FROM equipments
WHERE deleted_at IS NULL
ORDER BY name;

-- Testar:
SELECT 'equipments_overview criada' as status, COUNT(*) as registros FROM equipments_overview;

-- ============================================================================
-- VIEW 2: ORDERS OVERVIEW (SABEMOS QUE FUNCIONA)
-- ============================================================================

CREATE OR REPLACE VIEW orders_overview AS
SELECT
  id,
  cost_center_id,
  status,
  equipment_id,
  created_at
FROM orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- Testar:
SELECT 'orders_overview criada' as status, COUNT(*) as registros FROM orders_overview;

-- ============================================================================
-- VIEW 3: DASHBOARD BÁSICO (MAIS SIMPLES POSSÍVEL)
-- ============================================================================

CREATE OR REPLACE VIEW financial_basic AS
SELECT
  cost_center_id,
  type,
  value,
  date,
  created_at
FROM financial_transactions
WHERE date IS NOT NULL
ORDER BY created_at DESC;

-- Testar:
SELECT 'financial_basic criada' as status, COUNT(*) as registros FROM financial_basic;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Listar views que funcionaram
SELECT table_name as view_criada, 'OK' as status
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('equipments_overview', 'orders_overview', 'financial_basic')
ORDER BY table_name;

-- ✅ VIEWS ESSENCIAIS CRIADAS!
-- Apenas as que temos certeza que funcionam