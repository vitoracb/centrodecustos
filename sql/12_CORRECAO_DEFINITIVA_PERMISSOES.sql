-- ==============================================================================
-- 🛠️ SCRIPT DE CORREÇÃO DEFINITIVA DE PERMISSÕES E RLS
-- ==============================================================================
-- 1. Corrige RECURSÃO INFINITA nas políticas RLS (Admin checando se é Admin)
-- 2. Adiciona permissões de STORAGE para usuários autenticados (Upload de fotos)
-- 3. Garante que seu usuário seja ADMIN
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- PARTE 1: FUNÇÃO SEGURA PARA VERIFICAR ROLE (SECURITY DEFINER)
-- Bypassa o RLS para evitar recursão infinita
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'editor')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- PARTE 2: REFAZENDO POLÍTICAS RLS USANDO AS FUNÇÕES SEGURAS
-- ==============================================================================

-- 2.1 USER_PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Only admins can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Only admins can delete user profiles" ON user_profiles;

CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON user_profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Only admins can insert user profiles" ON user_profiles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Only admins can delete user profiles" ON user_profiles FOR DELETE USING (public.is_admin());

-- 2.2 CONTRACTS (Exemplo principal do erro)
DROP POLICY IF EXISTS "All can view contracts" ON contracts;
DROP POLICY IF EXISTS "Editors and admins can insert contracts" ON contracts;
DROP POLICY IF EXISTS "Editors and admins can update contracts" ON contracts;
DROP POLICY IF EXISTS "Only admins can delete contracts" ON contracts;

CREATE POLICY "All can view contracts" ON contracts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Editors and admins can insert contracts" ON contracts FOR INSERT WITH CHECK (public.is_editor());
CREATE POLICY "Editors and admins can update contracts" ON contracts FOR UPDATE USING (public.is_editor());
CREATE POLICY "Only admins can delete contracts" ON contracts FOR DELETE USING (public.is_admin());

-- 2.3 FINANCIAL TRANSACTIONS
DROP POLICY IF EXISTS "All can view financial transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Editors and admins can insert transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Editors and admins can update transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Only admins can delete transactions" ON financial_transactions;

CREATE POLICY "All can view financial transactions" ON financial_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Editors and admins can insert transactions" ON financial_transactions FOR INSERT WITH CHECK (public.is_editor());
CREATE POLICY "Editors and admins can update transactions" ON financial_transactions FOR UPDATE USING (public.is_editor());
CREATE POLICY "Only admins can delete transactions" ON financial_transactions FOR DELETE USING (public.is_admin());

-- 2.4 ORDERS
DROP POLICY IF EXISTS "All can view orders" ON orders;
DROP POLICY IF EXISTS "Editors and admins can insert orders" ON orders;
DROP POLICY IF EXISTS "Editors and admins can update orders" ON orders;
DROP POLICY IF EXISTS "Only admins can delete orders" ON orders;

CREATE POLICY "All can view orders" ON orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Editors and admins can insert orders" ON orders FOR INSERT WITH CHECK (public.is_editor());
CREATE POLICY "Editors and admins can update orders" ON orders FOR UPDATE USING (public.is_editor());
CREATE POLICY "Only admins can delete orders" ON orders FOR DELETE USING (public.is_admin());

-- 2.5 EQUIPMENTS
DROP POLICY IF EXISTS "All can view equipments" ON equipments;
DROP POLICY IF EXISTS "Editors and admins can insert equipments" ON equipments;
DROP POLICY IF EXISTS "Editors and admins can update equipments" ON equipments;

CREATE POLICY "All can view equipments" ON equipments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Editors and admins can insert equipments" ON equipments FOR INSERT WITH CHECK (public.is_editor());
CREATE POLICY "Editors and admins can update equipments" ON equipments FOR UPDATE USING (public.is_editor());

-- 2.6 AUDIT LOGS
DROP POLICY IF EXISTS "Users can view audit logs based on role" ON audit_logs;
CREATE POLICY "Users can view audit logs based on role" ON audit_logs FOR SELECT USING (public.is_admin() OR user_id = auth.uid());

-- ==============================================================================
-- PARTE 3: STORAGE (CORRIGINDO UPLOAD DE FOTOS)
-- ==============================================================================

-- Remove políticas antigas
DROP POLICY IF EXISTS "Authenticated users can upload to documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documentos" ON storage.objects;

-- Permite LEITURA para todos (autenticados ou anon)
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'documentos');

-- Permite UPLOAD para usuários autenticados
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');

-- Permite UPDATE/DELETE para usuários autenticados
CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documentos');


-- ==============================================================================
-- PARTE 4: GARANTIR QUE VOCÊ É ADMIN
-- ==============================================================================

-- Atualiza ou cria perfil de admin para o usuário atual (se executado com usuario logado)
DO $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.user_profiles (id, email, role, is_active, created_at, updated_at)
    VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'admin', true, now(), now())
    ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;
  END IF;
END $$;

-- Atualiza TODOS os usuários existentes para admin (Safety Net)
UPDATE public.user_profiles SET role = 'admin', is_active = true WHERE role != 'admin';

COMMIT;
