-- ==============================================================================
-- SCRIPT 3 ATUALIZADO: POLÍTICAS RLS BASEADAS NO SISTEMA EXISTENTE
-- Execute após 02_enable_rls.sql (substitui o 03_rls_policies.sql original)
-- ==============================================================================

-- ⚠️  ESTE SCRIPT SUBSTITUI O ANTERIOR - USA O SISTEMA DE PERMISSÕES EXISTENTE
-- Tabela: user_profiles
-- Roles: admin, editor, viewer

-- ============================================================================
-- COST CENTERS - TODOS PODEM VER, APENAS ADMINS MODIFICAM
-- ============================================================================

-- Drop políticas existentes se houver
DROP POLICY IF EXISTS "All authenticated users can view cost centers" ON cost_centers;
DROP POLICY IF EXISTS "Only admins can modify cost centers" ON cost_centers;

-- Política para leitura: todos os usuários autenticados podem ver todos os centros
CREATE POLICY "All authenticated users can view cost centers" ON cost_centers
FOR SELECT USING (auth.role() = 'authenticated');

-- Política para modificação: apenas admins
CREATE POLICY "Only admins can modify cost centers" ON cost_centers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- USER_PROFILES - USUÁRIOS VEEM PRÓPRIO PERFIL, ADMINS VEEM TODOS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Only admins can modify user profiles" ON user_profiles;

-- Usuários veem seu próprio perfil
CREATE POLICY "Users can view their own profile" ON user_profiles
FOR SELECT USING (id = auth.uid());

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles" ON user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Usuários podem atualizar próprio perfil (exceto role)
CREATE POLICY "Users can update their own profile" ON user_profiles
FOR UPDATE USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = OLD.role -- Não pode alterar próprio role
);

-- Apenas admins podem criar/modificar qualquer perfil
CREATE POLICY "Only admins can modify user profiles" ON user_profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- FINANCIAL TRANSACTIONS - BASEADO EM ROLES
-- ============================================================================

DROP POLICY IF EXISTS "All can view financial transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Editors and admins can insert transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Editors and admins can update transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Only admins can delete transactions" ON financial_transactions;

-- Leitura: todos os usuários autenticados (admin, editor, viewer)
CREATE POLICY "All can view financial transactions" ON financial_transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_active = true
  )
);

-- Inserção: admins e editors
CREATE POLICY "Editors and admins can insert transactions" ON financial_transactions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'editor')
    AND is_active = true
  )
);

-- Atualização: admins e editors
CREATE POLICY "Editors and admins can update transactions" ON financial_transactions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'editor')
    AND is_active = true
  )
);

-- Exclusão: apenas admins
CREATE POLICY "Only admins can delete transactions" ON financial_transactions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  )
);

-- ============================================================================
-- EQUIPMENTS - SOFT DELETE COM CONTROLE POR ROLE
-- ============================================================================

DROP POLICY IF EXISTS "All can view equipments" ON equipments;
DROP POLICY IF EXISTS "Editors and admins can insert equipments" ON equipments;
DROP POLICY IF EXISTS "Editors and admins can update equipments" ON equipments;

-- Leitura: todos os usuários
CREATE POLICY "All can view equipments" ON equipments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_active = true
  )
);

-- Inserção: admins e editors
CREATE POLICY "Editors and admins can insert equipments" ON equipments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'editor')
    AND is_active = true
  )
);

-- Atualização (incluindo soft delete): admins e editors
CREATE POLICY "Editors and admins can update equipments" ON equipments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'editor')
    AND is_active = true
  )
);

-- ============================================================================
-- CONTRACTS - CONTROLE POR ROLE
-- ============================================================================

DROP POLICY IF EXISTS "All can view contracts" ON contracts;
DROP POLICY IF EXISTS "Editors and admins can manage contracts" ON contracts;

-- Verificar se tabela contracts existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN

        DROP POLICY IF EXISTS "All can view contracts" ON contracts;
        DROP POLICY IF EXISTS "Editors and admins can manage contracts" ON contracts;

        -- Leitura: todos os usuários
        CREATE POLICY "All can view contracts" ON contracts
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_active = true
          )
        );

        -- Inserção e atualização: admins e editors
        CREATE POLICY "Editors and admins can manage contracts" ON contracts
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'editor')
            AND is_active = true
          )
        );

        -- Exclusão: apenas admins (política separada para clareza)
        CREATE POLICY "Only admins can delete contracts" ON contracts
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role = 'admin'
            AND is_active = true
          )
        );

    END IF;
END
$$;

-- ============================================================================
-- ORDERS - CONTROLE POR ROLE
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN

        DROP POLICY IF EXISTS "All can view orders" ON orders;
        DROP POLICY IF EXISTS "Editors and admins can manage orders" ON orders;
        DROP POLICY IF EXISTS "Only admins can delete orders" ON orders;

        -- Leitura: todos os usuários
        CREATE POLICY "All can view orders" ON orders
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_active = true
          )
        );

        -- Inserção e atualização: admins e editors
        CREATE POLICY "Editors and admins can manage orders" ON orders
        FOR INSERT, UPDATE USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'editor')
            AND is_active = true
          )
        );

        -- Exclusão: apenas admins
        CREATE POLICY "Only admins can delete orders" ON orders
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role = 'admin'
            AND is_active = true
          )
        );

    END IF;
END
$$;

-- ============================================================================
-- AUDIT LOGS - LOGS IMUTÁVEIS E VISIBILIDADE CONTROLADA
-- ============================================================================

DROP POLICY IF EXISTS "Users can view audit logs based on role" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON audit_logs;

-- Leitura: admins veem tudo, editors/viewers veem próprias ações
CREATE POLICY "Users can view audit logs based on role" ON audit_logs
FOR SELECT USING (
  -- Admins veem todos os logs
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  )
  OR
  -- Outros usuários veem apenas suas próprias ações
  user_id = auth.uid()
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

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se todas as políticas foram criadas
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operations
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('cost_centers', 'user_profiles', 'financial_transactions', 'equipments', 'contracts', 'orders', 'audit_logs')
ORDER BY tablename, policyname;

-- ✅ SCRIPT 3 ATUALIZADO CONCLUÍDO
-- Sistema compatível com roles existentes: admin, editor, viewer
-- Próximo: Execute 04_audit_functions.sql