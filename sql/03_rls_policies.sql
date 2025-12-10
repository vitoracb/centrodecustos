-- ==============================================================================
-- SCRIPT 3: POLÍTICAS ROW LEVEL SECURITY (RLS)
-- Execute após 02_enable_rls.sql
-- ==============================================================================

-- ============================================================================
-- COST CENTERS - TODOS PODEM VER, APENAS ADMINS MODIFICAM
-- ============================================================================

-- Drop políticas existentes se houver
DROP POLICY IF EXISTS "All authenticated users can view cost centers" ON cost_centers;
DROP POLICY IF EXISTS "Only super admins can modify cost centers" ON cost_centers;

-- Política para leitura: todos os usuários autenticados podem ver todos os centros
CREATE POLICY "All authenticated users can view cost centers" ON cost_centers
FOR SELECT USING (auth.role() = 'authenticated');

-- Política para modificação: apenas super admins
CREATE POLICY "Only super admins can modify cost centers" ON cost_centers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- ============================================================================
-- USER PERMISSIONS - USUÁRIOS VEEM APENAS SUAS PERMISSÕES
-- ============================================================================

DROP POLICY IF EXISTS "Users can only see their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Only admins can modify permissions" ON user_permissions;

-- Usuários só veem suas próprias permissões
CREATE POLICY "Users can only see their own permissions" ON user_permissions
FOR SELECT USING (user_id = auth.uid());

-- Apenas admins podem modificar permissões
CREATE POLICY "Only admins can modify permissions" ON user_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- ============================================================================
-- FINANCIAL TRANSACTIONS - BASEADO EM PERMISSÕES POR CENTRO
-- ============================================================================

DROP POLICY IF EXISTS "Users can only access authorized center transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Only writers can insert transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Only authorized users can update transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Only admins can delete transactions" ON financial_transactions;

-- Leitura: usuários com permissão de leitura no centro
CREATE POLICY "Users can only access authorized center transactions" ON financial_transactions
FOR SELECT USING (
  cost_center_id IN (
    SELECT cost_center_id
    FROM user_permissions
    WHERE user_id = auth.uid()
    AND can_read = true
  )
);

-- Inserção: usuários com permissão de escrita
CREATE POLICY "Only writers can insert transactions" ON financial_transactions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = NEW.cost_center_id
    AND can_write = true
  )
);

-- Atualização: usuários com permissão de escrita
CREATE POLICY "Only authorized users can update transactions" ON financial_transactions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = OLD.cost_center_id
    AND can_write = true
  )
);

-- Exclusão: apenas admins
CREATE POLICY "Only admins can delete transactions" ON financial_transactions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = OLD.cost_center_id
    AND is_admin = true
  )
);

-- ============================================================================
-- EQUIPMENTS - SOFT DELETE COM CONTROLE POR CENTRO
-- ============================================================================

DROP POLICY IF EXISTS "Users can only access authorized center equipments" ON equipments;
DROP POLICY IF EXISTS "Only writers can insert equipments" ON equipments;
DROP POLICY IF EXISTS "Only authorized users can soft delete equipments" ON equipments;

-- Leitura: usuários com permissão no centro
CREATE POLICY "Users can only access authorized center equipments" ON equipments
FOR SELECT USING (
  cost_center_id IN (
    SELECT cost_center_id
    FROM user_permissions
    WHERE user_id = auth.uid()
    AND can_read = true
  )
);

-- Inserção: usuários com permissão de escrita
CREATE POLICY "Only writers can insert equipments" ON equipments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = NEW.cost_center_id
    AND can_write = true
  )
);

-- Atualização (incluindo soft delete): usuários com permissão de escrita
CREATE POLICY "Only authorized users can soft delete equipments" ON equipments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = OLD.cost_center_id
    AND can_write = true
  )
);

-- ============================================================================
-- CONTRACTS - CONTROLE POR CENTRO
-- ============================================================================

DROP POLICY IF EXISTS "Users can only access authorized center contracts" ON contracts;
DROP POLICY IF EXISTS "Authorized contract creation" ON contracts;
DROP POLICY IF EXISTS "Authorized contract updates" ON contracts;

-- Leitura: usuários com permissão no centro
CREATE POLICY "Users can only access authorized center contracts" ON contracts
FOR SELECT USING (
  cost_center_id IN (
    SELECT cost_center_id
    FROM user_permissions
    WHERE user_id = auth.uid()
    AND can_read = true
  )
);

-- Inserção: usuários com permissão de escrita
CREATE POLICY "Authorized contract creation" ON contracts
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = NEW.cost_center_id
    AND can_write = true
  )
);

-- Atualização: usuários com permissão de escrita
CREATE POLICY "Authorized contract updates" ON contracts
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = OLD.cost_center_id
    AND can_write = true
  )
);

-- ============================================================================
-- ORDERS - CONTROLE POR CENTRO
-- ============================================================================

DROP POLICY IF EXISTS "Users can only access authorized center orders" ON orders;
DROP POLICY IF EXISTS "Authorized order creation" ON orders;
DROP POLICY IF EXISTS "Authorized order updates" ON orders;

-- Verificar se a tabela orders existe, senão adaptar o nome
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        -- Políticas para orders
        DROP POLICY IF EXISTS "Users can only access authorized center orders" ON orders;
        DROP POLICY IF EXISTS "Authorized order creation" ON orders;
        DROP POLICY IF EXISTS "Authorized order updates" ON orders;

        CREATE POLICY "Users can only access authorized center orders" ON orders
        FOR SELECT USING (
          cost_center_id IN (
            SELECT cost_center_id
            FROM user_permissions
            WHERE user_id = auth.uid()
            AND can_read = true
          )
        );

        CREATE POLICY "Authorized order creation" ON orders
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
            AND cost_center_id = NEW.cost_center_id
            AND can_write = true
          )
        );

        CREATE POLICY "Authorized order updates" ON orders
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
            AND cost_center_id = OLD.cost_center_id
            AND can_write = true
          )
        );
    END IF;
END
$$;

-- ============================================================================
-- AUDIT LOGS - LOGS IMUTÁVEIS E VISIBILIDADE CONTROLADA
-- ============================================================================

DROP POLICY IF EXISTS "Users can only see relevant audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON audit_logs;

-- Leitura: usuários veem logs de suas ações ou do seu centro (se admin)
CREATE POLICY "Users can only see relevant audit logs" ON audit_logs
FOR SELECT USING (
  user_id = auth.uid() OR
  cost_center_id IN (
    SELECT cost_center_id
    FROM user_permissions
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- Inserção: sistema pode inserir logs (sem restrição para aplicação)
CREATE POLICY "System can insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (true);

-- Atualização: proibida (logs são imutáveis)
CREATE POLICY "Audit logs are immutable" ON audit_logs
FOR UPDATE USING (false);

-- Exclusão: proibida
CREATE POLICY "Audit logs cannot be deleted" ON audit_logs
FOR DELETE USING (false);

-- ✅ SCRIPT 3 CONCLUÍDO
-- Próximo: Execute 04_audit_functions.sql