-- ==============================================================================
-- 🛠️ SCRIPT DE DIAGNÓSTICO E CORREÇÃO AUTOMÁTICA DE PERMISSÕES
-- ==============================================================================
--
-- ESTE SCRIPT VAI:
-- 1. Verificar quem você é no sistema
-- 2. Criar seu perfil de usuário se não existir
-- 3. Te dar permissão de ADMIN (acesso total)
-- 4. Verificar se as tabelas estão acessíveis
--
-- ==============================================================================

BEGIN;

-- 1. IDENTIFICAR USUÁRIO ATUAL
DO $$
DECLARE
    current_user_id uuid;
    current_email text;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '⚠️ AVISO: Nenhum usuário autenticado detectado neste script.';
        RAISE NOTICE '   Se você está rodando no Editor SQL do Supabase, certifique-se de estar rodando como o usuário correto ou verifique na tabela auth.users.';
    ELSE
        SELECT email INTO current_email FROM auth.users WHERE id = current_user_id;
        RAISE NOTICE '👤 Usuário detectado: % (ID: %)', current_email, current_user_id;
        
        -- 2. GARANTIR QUE PERFIL EXISTE E É ADMIN
        INSERT INTO public.user_profiles (id, email, role, is_active, first_name, last_name, created_at, updated_at)
        VALUES (
            current_user_id, 
            current_email, 
            'admin', 
            true, 
            'Admin', 
            'User', 
            now(), 
            now()
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            role = 'admin',
            is_active = true,
            updated_at = now();
            
        RAISE NOTICE '✅ PERMISSÕES CORRIGIDAS! Você agora é ADMIN.';
    END IF;
END $$;

-- 3. VERIFICAR LISTA DE ADMINS
SELECT 
    up.id, 
    up.email, 
    up.role, 
    up.is_active,
    CASE WHEN u.id IS NOT NULL THEN '✅ Conta Auth OK' ELSE '❌ Sem Conta Auth' END as auth_status
FROM public.user_profiles up
LEFT JOIN auth.users u ON u.id = up.id
WHERE up.role = 'admin';

-- 4. CORREÇÃO DE EMERGÊNCIA PARA TODOS OS USUÁRIOS (Use com cuidado)
-- Se o passo acima não funcionou, descomente as linhas abaixo para tornar TODOS os usuários existentes em admins
/*
UPDATE public.user_profiles
SET role = 'admin', is_active = true;
*/

COMMIT;

-- 5. TESTE DE ACESSO (Simulação)
SELECT count(*) as "Total Centros de Custo (Se ver número > 0, leitura ok)" FROM public.cost_centers;
SELECT count(*) as "Total Transações (Se ver número > 0, leitura ok)" FROM public.financial_transactions;

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
