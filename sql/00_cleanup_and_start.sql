-- ==============================================================================
-- SCRIPT 0: LIMPEZA E PREPARAÇÃO (Execute se houver problemas)
-- ==============================================================================

-- ⚠️  CUIDADO: Este script remove tudo relacionado à auditoria
-- Só execute se quiser recomeçar do zero

-- Remover triggers existentes
DROP TRIGGER IF EXISTS audit_financial_transactions ON financial_transactions;
DROP TRIGGER IF EXISTS validate_financial_data ON financial_transactions;
DROP TRIGGER IF EXISTS audit_equipments ON equipments;
DROP TRIGGER IF EXISTS audit_contracts ON contracts;
DROP TRIGGER IF EXISTS audit_orders ON orders;

-- Remover funções existentes
DROP FUNCTION IF EXISTS log_financial_action() CASCADE;
DROP FUNCTION IF EXISTS validate_financial_values() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_audit_logs() CASCADE;

-- Remover views existentes
DROP VIEW IF EXISTS audit_summary CASCADE;
DROP VIEW IF EXISTS financial_with_audit CASCADE;

-- Remover políticas RLS existentes
DROP POLICY IF EXISTS "Users can view audit logs based on role" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON audit_logs;

-- Remover tabela audit_logs completamente
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Verificar limpeza
SELECT
    'LIMPEZA CONCLUÍDA' as status,
    'Execute agora 01_create_audit_table_FIXED.sql' as proximo_passo;