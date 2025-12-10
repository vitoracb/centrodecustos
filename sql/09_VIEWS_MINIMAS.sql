-- ==============================================================================
-- VIEWS MÍNIMAS - APENAS COLUNAS QUE EXISTEM
-- ==============================================================================

-- ⚡ Views ultra-seguras com apenas colunas básicas

-- ============================================================================
-- VIEW 1: FINANCIAL SUMMARY (SÓ O ESSENCIAL)
-- ============================================================================

CREATE OR REPLACE VIEW financial_simple AS
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
SELECT * FROM financial_simple LIMIT 3;

-- ============================================================================
-- VIEW 2: EQUIPMENTS SIMPLE (SÓ O BÁSICO)
-- ============================================================================

CREATE OR REPLACE VIEW equipments_simple AS
SELECT
  id,
  name,
  cost_center_id,
  created_at
FROM equipments
WHERE deleted_at IS NULL
ORDER BY name;

-- Testar:
SELECT * FROM equipments_simple LIMIT 3;

-- ============================================================================
-- VIEW 3: ORDERS SIMPLE (SEM ASSUMIR COLUNAS)
-- ============================================================================

CREATE OR REPLACE VIEW orders_simple AS
SELECT
  id,
  cost_center_id,
  status,
  created_at
FROM orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- Testar:
SELECT * FROM orders_simple LIMIT 3;

-- ============================================================================
-- VIEW 4: CONTRACTS SIMPLE
-- ============================================================================

CREATE OR REPLACE VIEW contracts_simple AS
SELECT
  id,
  name,
  cost_center_id,
  created_at
FROM contracts
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- Testar:
SELECT * FROM contracts_simple LIMIT 3;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

SELECT 'VIEWS MÍNIMAS CRIADAS' as resultado;

SELECT table_name as view_criada
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE '%_simple'
ORDER BY table_name;

-- ✅ ESTAS VIEWS DEVEM FUNCIONAR!
-- Usam apenas colunas básicas que toda tabela tem