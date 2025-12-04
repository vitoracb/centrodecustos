-- Criar tabela de perfis de usuário com roles e permissões

-- 1. Criar tipo ENUM para roles
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

-- 2. Criar tabela de perfis
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acesso
-- Todos podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem atualizar perfis
CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem criar perfis (convidar usuários)
CREATE POLICY "Admins can create profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Função para criar perfil automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    -- Primeiro usuário é admin, demais são viewer por padrão
    CASE 
      WHEN (SELECT COUNT(*) FROM public.user_profiles) = 0 THEN 'admin'::user_role
      ELSE 'viewer'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Criar tabela de convites
CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Habilitar RLS para convites
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- 9. Políticas para convites
-- Admins podem criar convites
CREATE POLICY "Admins can create invites"
  ON user_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem ver convites
CREATE POLICY "Admins can view invites"
  ON user_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Qualquer um pode ver convite pelo token (para validar)
CREATE POLICY "Anyone can view invite by token"
  ON user_invites FOR SELECT
  USING (true);
