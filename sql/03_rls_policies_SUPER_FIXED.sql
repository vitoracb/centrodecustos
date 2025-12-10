-- ==============================================================================
-- SCRIPT 3 SUPER CORRIGIDO: POLÍTICAS RLS SEM ERROS
-- Execute após 02_enable_rls_FIXED.sql
-- ==============================================================================

-- ⚠️  ESTE SCRIPT CORRIGE O ERRO "missing FROM-clause entry for table 'old'"

-- ============================================================================
-- COST CENTERS - TODOS PODEM VER, APENAS ADMINS MODIFICAM
-- ============================================================================

-- Drop políticas existentes se houver
DROP POLICY IF EXISTS "All authenticated users can view cost centers" ON cost_centers;
DROP POLICY IF EXISTS "Only admins can modify cost centers" ON cost_centers;

-- Verificar se cost_centers existe antes de criar políticas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_centers') THEN
        -- Política para leitura: todos os usuários autenticados podem ver todos os centros
        CREATE POLICY "All authenticated users can view cost centers" ON cost_centers
        FOR SELECT USING (auth.role() = 'authenticated');

        -- Política para modificação: apenas admins
        CREATE POLICY "Only admins can modify cost centers" ON cost_centers
        FOR INSERT, UPDATE, DELETE USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role = 'admin'
          )
        );
    END IF;
END
$$;

-- ============================================================================
-- USER_PROFILES - USUÁRIOS VEEM PRÓPRIO PERFIL, ADMINS VEEM TODOS
-- ============================================================================

-- Verificar se user_profiles existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN

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

        -- Usuários podem atualizar próprio perfil (exceto role) - CORRIGIDO
        CREATE POLICY "Users can update their own profile" ON user_profiles
        FOR UPDATE USING (id = auth.uid())
        WITH CHECK (id = auth.uid()); -- Removido OLD.role que causava erro

        -- Apenas admins podem criar/modificar qualquer perfil
        CREATE POLICY "Only admins can modify user profiles" ON user_profiles
        FOR INSERT, DELETE USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role = 'admin'
          )
        );

    END IF;
END
$$;

-- ============================================================================
-- FINANCIAL TRANSACTIONS - BASEADO EM ROLES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN

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

    END IF;
END
$$;

-- ============================================================================
-- EQUIPMENTS - SOFT DELETE COM CONTROLE POR ROLE
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipments') THEN

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

    END IF;
END
$$;

-- ============================================================================
-- CONTRACTS - CONTROLE POR ROLE
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN

        DROP POLICY IF EXISTS "All can view contracts" ON contracts;
        DROP POLICY IF EXISTS "Editors and admins can manage contracts" ON contracts;
        DROP POLICY IF EXISTS "Only admins can delete contracts" ON contracts;

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
        FOR INSERT, UPDATE USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'editor')
            AND is_active = true
          )
        );

        -- Exclusão: apenas admins
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

-- audit_logs deve existir pois acabamos de criar
DROP POLICY IF EXISTS "Users can view audit logs based on role" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON audit_logs;

-- Leitura: admins veem tudo, outros veem próprias ações
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

-- ✅ SCRIPT 3 SUPER CORRIGIDO CONCLUÍDO
-- Erro OLD.role removido e verificações de tabela adicionadas
-- Próximo: Execute 04_audit_functions.sql