-- ==============================================================================
-- SCRIPT PERFORMANCE SIMPLES: ÍNDICES BÁSICOS PARA SUPABASE
-- ==============================================================================

-- ⚡ Apenas índices essenciais que funcionam no Supabase

-- ============================================================================
-- FINANCIAL TRANSACTIONS - TABELA MAIS IMPORTANTE
-- ============================================================================

-- Índice para consultas por data
CREATE INDEX IF NOT EXISTS idx_financial_date
ON financial_transactions(date DESC);

-- Índice para consultas por centro de custo
CREATE INDEX IF NOT EXISTS idx_financial_center
ON financial_transactions(cost_center_id);

-- Índice composto data + centro
CREATE INDEX IF NOT EXISTS idx_financial_date_center
ON financial_transactions(date DESC, cost_center_id);

-- Índice para busca por tipo
CREATE INDEX IF NOT EXISTS idx_financial_type
ON financial_transactions(type);

-- ============================================================================
-- EQUIPMENTS - SEGUNDA MAIS IMPORTANTE
-- ============================================================================

-- Índice para equipamentos ativos
CREATE INDEX IF NOT EXISTS idx_equipments_not_deleted
ON equipments(id, name) WHERE deleted_at IS NULL;

-- Índice para busca por centro de custo
CREATE INDEX IF NOT EXISTS idx_equipments_center
ON equipments(cost_center_id) WHERE deleted_at IS NULL;

-- Índice para próximas revisões
CREATE INDEX IF NOT EXISTS idx_equipments_review_date
ON equipments(next_review_date) WHERE deleted_at IS NULL;

-- ============================================================================
-- ORDERS
-- ============================================================================

-- Índice para orders por status
CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status) WHERE deleted_at IS NULL;

-- Índice para orders por centro
CREATE INDEX IF NOT EXISTS idx_orders_center
ON orders(cost_center_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- CONTRACTS
-- ============================================================================

-- Índice para contratos ativos
CREATE INDEX IF NOT EXISTS idx_contracts_not_deleted
ON contracts(id, name) WHERE deleted_at IS NULL;

-- Índice para contratos por centro
CREATE INDEX IF NOT EXISTS idx_contracts_center
ON contracts(cost_center_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- EMPLOYEE DOCUMENTS
-- ============================================================================

-- Índice para documentos ativos por centro
CREATE INDEX IF NOT EXISTS idx_employee_docs_center
ON employee_documents(cost_center_id) WHERE deleted_at IS NULL;

-- Índice para busca por nome de funcionário
CREATE INDEX IF NOT EXISTS idx_employee_docs_name
ON employee_documents(employee_name) WHERE deleted_at IS NULL;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Ver índices criados
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ✅ ÍNDICES BÁSICOS CRIADOS!
-- Execute este primeiro, depois me diga se funcionou.