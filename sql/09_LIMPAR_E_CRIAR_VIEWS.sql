-- ==============================================================================
-- LIMPAR E CRIAR VIEWS DO ZERO
-- ==============================================================================

-- 🔧 SOLUÇÃO: Primeiro dropar todas as views, depois criar novas

-- ============================================================================
-- 1. REMOVER VIEWS EXISTENTES
-- ============================================================================

-- Dropar todas as views que podem existir
DROP VIEW IF EXISTS financial_summary CASCADE;
DROP VIEW IF EXISTS financial_monthly_summary CASCADE;
DROP VIEW IF EXISTS equipments_overview CASCADE;
DROP VIEW IF EXISTS equipments_with_status CASCADE;
DROP VIEW IF EXISTS orders_overview CASCADE;
DROP VIEW IF EXISTS orders_with_info CASCADE;
DROP VIEW IF EXISTS contracts_overview CASCADE;
DROP VIEW IF EXISTS contracts_active CASCADE;
DROP VIEW IF EXISTS dashboard_monthly CASCADE;
DROP VIEW IF EXISTS financial_basic CASCADE;
DROP VIEW IF EXISTS equipments_simple CASCADE;
DROP VIEW IF EXISTS orders_simple CASCADE;

-- ============================================================================
-- 2. CRIAR VIEWS NOVAS (ESTRUTURA LIMPA)
-- ============================================================================

-- VIEW 1: Equipments Overview
CREATE VIEW equipments_overview AS
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

-- VIEW 2: Orders Overview
CREATE VIEW orders_overview AS
SELECT
  id,
  cost_center_id,
  status,
  equipment_id,
  created_at
FROM orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- VIEW 3: Financial Basic
CREATE VIEW financial_basic AS
SELECT
  cost_center_id,
  type,
  value,
  date,
  created_at
FROM financial_transactions
WHERE date IS NOT NULL
ORDER BY created_at DESC;

-- ============================================================================
-- 3. TESTAR VIEWS CRIADAS
-- ============================================================================

-- Testar cada view
SELECT 'equipments_overview' as view_name, COUNT(*) as registros FROM equipments_overview;
SELECT 'orders_overview' as view_name, COUNT(*) as registros FROM orders_overview;
SELECT 'financial_basic' as view_name, COUNT(*) as registros FROM financial_basic;

-- ============================================================================
-- 4. VERIFICAÇÃO FINAL
-- ============================================================================

-- Listar views funcionais
SELECT table_name as view_criada
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('equipments_overview', 'orders_overview', 'financial_basic')
ORDER BY table_name;

SELECT 'VIEWS RECRIADAS COM SUCESSO' as status;

-- ✅ AGORA DEVE FUNCIONAR!
-- Primeiro remove tudo, depois cria limpo