-- ==============================================================================
-- SCRIPT 1 CORRIGIDO: CRIAÇÃO/CORREÇÃO DA TABELA AUDIT_LOGS
-- Execute este script PRIMEIRO (substitui o 01_create_audit_table.sql)
-- ==============================================================================

-- Primeiro, vamos verificar se a tabela já existe e remover se necessário
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Criar tabela de audit logs com estrutura completa
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('EXPENSE', 'RECEIPT', 'CONTRACT', 'EQUIPMENT', 'ORDER')),
  entity_id TEXT NOT NULL,
  cost_center_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para consultas rápidas
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_cost_center ON audit_logs(cost_center_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Comentários para documentação
COMMENT ON TABLE audit_logs IS 'Registro de auditoria para operações críticas do sistema';
COMMENT ON COLUMN audit_logs.user_id IS 'ID do usuário que realizou a ação';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de ação: CREATE, UPDATE ou DELETE';
COMMENT ON COLUMN audit_logs.entity_type IS 'Tipo de entidade afetada';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID da entidade afetada';
COMMENT ON COLUMN audit_logs.cost_center_id IS 'Centro de custo relacionado';
COMMENT ON COLUMN audit_logs.old_values IS 'Valores anteriores (para UPDATE/DELETE)';
COMMENT ON COLUMN audit_logs.new_values IS 'Valores novos (para CREATE/UPDATE)';
COMMENT ON COLUMN audit_logs.metadata IS 'Metadados adicionais (IP, user agent, etc.)';

-- Verificar se a tabela foi criada corretamente
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ✅ SCRIPT 1 CORRIGIDO CONCLUÍDO
-- Próximo: Execute 02_enable_rls.sql