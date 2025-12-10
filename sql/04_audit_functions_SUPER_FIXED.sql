-- ==============================================================================
-- SCRIPT 4 SUPER CORRIGIDO: FUNÇÕES E TRIGGERS DE AUDITORIA
-- Execute após 03_rls_policies_FINAL_FIX.sql
-- ==============================================================================

-- ⚡ CORREÇÃO: Tabela "profiles" não existe - usando auth.users

-- ============================================================================
-- FUNÇÃO PRINCIPAL DE AUDITORIA
-- ============================================================================

-- Drop função existente se houver
DROP FUNCTION IF EXISTS log_financial_action() CASCADE;

-- Função para registrar ações sensíveis automaticamente
CREATE OR REPLACE FUNCTION log_financial_action()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir log de auditoria
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    cost_center_id,
    old_values,
    new_values,
    metadata,
    timestamp
  ) VALUES (
    auth.uid(), -- ID do usuário atual
    TG_OP, -- Tipo de operação (INSERT, UPDATE, DELETE)
    CASE
      WHEN TG_TABLE_NAME = 'financial_transactions' THEN
        CASE
          WHEN COALESCE(NEW.type, OLD.type) = 'RECEITA' THEN 'RECEIPT'
          ELSE 'EXPENSE'
        END
      WHEN TG_TABLE_NAME = 'equipments' THEN 'EQUIPMENT'
      WHEN TG_TABLE_NAME = 'contracts' THEN 'CONTRACT'
      WHEN TG_TABLE_NAME = 'orders' THEN 'ORDER'
      ELSE UPPER(TG_TABLE_NAME)
    END,
    COALESCE(NEW.id, OLD.id)::TEXT, -- ID da entidade
    COALESCE(NEW.cost_center_id, OLD.cost_center_id), -- Centro de custo
    CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
      ELSE NULL
    END, -- Valores antigos
    CASE
      WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)
      WHEN TG_OP = 'UPDATE' THEN row_to_json(NEW)
      ELSE NULL
    END, -- Valores novos
    json_build_object(
      'table_name', TG_TABLE_NAME,
      'schema_name', TG_TABLE_SCHEMA,
      'session_user', session_user,
      'current_timestamp', NOW()
    ), -- Metadados
    NOW() -- Timestamp
  );

  -- Retornar registro apropriado
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNÇÃO DE VALIDAÇÃO DE VALORES FINANCEIROS
-- ============================================================================

-- Drop função existente se houver
DROP FUNCTION IF EXISTS validate_financial_values() CASCADE;

-- Função para validar valores monetários e datas
CREATE OR REPLACE FUNCTION validate_financial_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar valor positivo (adaptar campo conforme sua tabela)
  IF NEW.value IS NOT NULL AND NEW.value <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero: %', NEW.value;
  END IF;

  -- Se sua tabela usa 'amount' ao invés de 'value'
  IF NEW.amount IS NOT NULL AND NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero: %', NEW.amount;
  END IF;

  -- Validar valor máximo (limite de segurança)
  IF COALESCE(NEW.value, NEW.amount, 0) > 10000000 THEN
    RAISE EXCEPTION 'Valor muito alto, requer aprovação manual: %', COALESCE(NEW.value, NEW.amount);
  END IF;

  -- Validar data não muito no futuro
  IF NEW.date IS NOT NULL AND NEW.date > CURRENT_DATE + INTERVAL '2 years' THEN
    RAISE EXCEPTION 'Data muito distante no futuro: %', NEW.date;
  END IF;

  -- Validar data não muito antiga
  IF NEW.date IS NOT NULL AND NEW.date < '2020-01-01' THEN
    RAISE EXCEPTION 'Data muito antiga, verifique se está correta: %', NEW.date;
  END IF;

  -- Validar descrição não vazia
  IF NEW.description IS NOT NULL AND LENGTH(TRIM(NEW.description)) = 0 THEN
    RAISE EXCEPTION 'Descrição não pode estar vazia';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION PARA CLEANUP DE LOGS ANTIGOS
-- ============================================================================

-- Função para limpar logs muito antigos (manter últimos 2 anos)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '2 years';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log da limpeza
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    cost_center_id,
    metadata,
    timestamp
  ) VALUES (
    NULL,
    'DELETE',
    'AUDIT_LOG',
    'CLEANUP',
    'SYSTEM',
    json_build_object(
      'deleted_count', deleted_count,
      'cleanup_date', NOW(),
      'retention_policy', '2 years'
    ),
    NOW()
  );

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS PARA AUDITORIA AUTOMÁTICA
-- ============================================================================

-- Verificar se as tabelas existem antes de criar triggers
DO $$
BEGIN
  -- Trigger para transações financeiras
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN
    DROP TRIGGER IF EXISTS audit_financial_transactions ON financial_transactions;
    CREATE TRIGGER audit_financial_transactions
      AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
      FOR EACH ROW
      EXECUTE FUNCTION log_financial_action();

    -- Trigger para validação
    DROP TRIGGER IF EXISTS validate_financial_data ON financial_transactions;
    CREATE TRIGGER validate_financial_data
      BEFORE INSERT OR UPDATE ON financial_transactions
      FOR EACH ROW
      EXECUTE FUNCTION validate_financial_values();
  END IF;

  -- Trigger para equipamentos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipments') THEN
    DROP TRIGGER IF EXISTS audit_equipments ON equipments;
    CREATE TRIGGER audit_equipments
      AFTER INSERT OR UPDATE OR DELETE ON equipments
      FOR EACH ROW
      EXECUTE FUNCTION log_financial_action();
  END IF;

  -- Trigger para contratos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
    DROP TRIGGER IF EXISTS audit_contracts ON contracts;
    CREATE TRIGGER audit_contracts
      AFTER INSERT OR UPDATE OR DELETE ON contracts
      FOR EACH ROW
      EXECUTE FUNCTION log_financial_action();
  END IF;

  -- Trigger para pedidos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    DROP TRIGGER IF EXISTS audit_orders ON orders;
    CREATE TRIGGER audit_orders
      AFTER INSERT OR UPDATE OR DELETE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION log_financial_action();
  END IF;
END
$$;

-- ============================================================================
-- VIEWS PARA CONSULTA DE AUDITORIA - CORRIGIDAS
-- ============================================================================

-- View para relatório de auditoria simplificado
CREATE OR REPLACE VIEW audit_summary AS
SELECT
  al.id,
  al.timestamp,
  al.action,
  al.entity_type,
  al.entity_id,
  al.cost_center_id,
  cc.name as cost_center_name,
  COALESCE(u.email, 'sistema') as user_email
FROM audit_logs al
LEFT JOIN cost_centers cc ON cc.code = al.cost_center_id
LEFT JOIN auth.users u ON u.id = al.user_id
ORDER BY al.timestamp DESC;

-- View para transações financeiras com auditoria
CREATE OR REPLACE VIEW financial_with_audit AS
SELECT
  ft.*,
  (
    SELECT COUNT(*)
    FROM audit_logs al
    WHERE al.entity_type IN ('EXPENSE', 'RECEIPT')
    AND al.entity_id = ft.id::TEXT
  ) as audit_count,
  (
    SELECT al.timestamp
    FROM audit_logs al
    WHERE al.entity_type IN ('EXPENSE', 'RECEIPT')
    AND al.entity_id = ft.id::TEXT
    ORDER BY al.timestamp DESC
    LIMIT 1
  ) as last_audit_timestamp
FROM financial_transactions ft
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions');

-- View para estatísticas de usuários (CORRIGIDA)
CREATE OR REPLACE VIEW user_activity_stats AS
SELECT
  COALESCE(u.email, 'Sistema') as user_email,
  al.entity_type,
  al.action,
  COUNT(*) as action_count,
  MAX(al.timestamp) as last_action,
  MIN(al.timestamp) as first_action
FROM audit_logs al
LEFT JOIN auth.users u ON u.id = al.user_id
GROUP BY u.email, al.entity_type, al.action
ORDER BY last_action DESC;

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON FUNCTION log_financial_action() IS 'Registra automaticamente operações CRUD em tabelas críticas';
COMMENT ON FUNCTION validate_financial_values() IS 'Valida valores e datas antes de inserir/atualizar transações financeiras';
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Remove logs de auditoria mais antigos que 2 anos (execute manualmente)';
COMMENT ON VIEW audit_summary IS 'View simplificada para relatórios de auditoria';
COMMENT ON VIEW financial_with_audit IS 'Transações financeiras com informações de auditoria';
COMMENT ON VIEW user_activity_stats IS 'Estatísticas de atividade por usuário';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar funções criadas
SELECT
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('log_financial_action', 'validate_financial_values', 'cleanup_old_audit_logs')
ORDER BY routine_name;

-- Verificar triggers criados
SELECT
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation as events
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'audit_%'
ORDER BY event_object_table;

-- Verificar views criadas
SELECT
  table_name as view_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'VIEW'
AND table_name IN ('audit_summary', 'financial_with_audit', 'user_activity_stats')
ORDER BY table_name;

-- ✅ SCRIPT 4 SUPER CORRIGIDO CONCLUÍDO
-- Todas as referências à tabela inexistente "profiles" foram corrigidas para "auth.users"
-- Próximo: Execute 05_test_security.sql para verificar tudo