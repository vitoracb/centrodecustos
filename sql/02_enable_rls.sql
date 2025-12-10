-- ==============================================================================
-- SCRIPT 2: ATIVAR ROW LEVEL SECURITY (RLS)
-- Execute após 01_create_audit_table.sql
-- ==============================================================================

-- Ativar RLS em todas as tabelas críticas
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Verificar se user_permissions existe e ativar RLS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_permissions') THEN
        ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
    ELSE
        -- Criar tabela user_permissions se não existir
        CREATE TABLE user_permissions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            cost_center_id TEXT NOT NULL,
            can_read BOOLEAN DEFAULT false,
            can_write BOOLEAN DEFAULT false,
            is_admin BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Ativar RLS na nova tabela
        ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

        -- Criar índices
        CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
        CREATE INDEX idx_user_permissions_cost_center ON user_permissions(cost_center_id);
    END IF;
END
$$;

-- Verificar se profiles existe para roles de usuário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Criar tabela profiles se não existir
        CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            email TEXT,
            name TEXT,
            role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Ativar RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

        -- Política básica para profiles
        CREATE POLICY "Users can view their own profile" ON profiles
        FOR SELECT USING (auth.uid() = id);

        CREATE POLICY "Users can update their own profile" ON profiles
        FOR UPDATE USING (auth.uid() = id);
    END IF;
END
$$;

-- ✅ SCRIPT 2 CONCLUÍDO
-- Próximo: Execute 03_rls_policies.sql