-- ==============================================================================
-- CORREÇÃO RÁPIDA: VIEW ORDERS
-- ==============================================================================

-- 🔧 CORREÇÃO: equipment_ids → equipment_id

-- ============================================================================
-- VIEW ORDERS CORRIGIDA
-- ============================================================================

CREATE OR REPLACE VIEW orders_overview AS
SELECT
  id,
  cost_center_id,
  status,
  equipment_id,  -- CORRIGIDO: singular, não plural
  created_at,

  -- Calcular dias desde criação
  EXTRACT(days FROM NOW() - created_at)::integer as days_old

FROM orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- Testar:
SELECT * FROM orders_overview LIMIT 3;

-- ============================================================================
-- VERIFICAR SE FUNCIONOU
-- ============================================================================

SELECT 'ORDERS VIEW CORRIGIDA' as status;

SELECT COUNT(*) as total_orders FROM orders_overview;

-- ✅ AGORA DEVE FUNCIONAR!
-- Correção: equipment_ids → equipment_id