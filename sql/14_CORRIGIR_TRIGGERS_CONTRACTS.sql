-- ==============================================================================
-- CORRIGIR TRIGGERS E FUNÇÕES DA TABELA CONTRACTS
-- ==============================================================================
--
-- 🚨 PROBLEMA: Erro "record new has no field type" ao fazer operações
-- 🎯 SOLUÇÃO: Verificar e corrigir triggers/funções que referenciam coluna "type"
--
-- Execute este script no Supabase SQL Editor
--
-- ==============================================================================

-- ============================================================================
-- 1. VERIFICAR TRIGGERS NA TABELA CONTRACTS
-- ============================================================================

SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'contracts'
AND event_object_schema = 'public'
ORDER BY trigger_name;

-- ============================================================================
-- 2. VERIFICAR FUNÇÕES QUE PODEM ESTAR RELACIONADAS
-- ============================================================================

-- Procurar funções que mencionam "type" e "contracts"
SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_result(p.oid) as result_type,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%contracts%'
AND pg_get_functiondef(p.oid) ILIKE '%type%'
ORDER BY p.proname;

-- ============================================================================
-- 3. VERIFICAR SE HÁ AUDIT TRIGGERS PROBLEMÁTICOS
-- ============================================================================

-- Verificar se há triggers de auditoria que podem estar causando o problema
SELECT
    t.trigger_name,
    t.event_manipulation,
    t.action_timing,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM information_schema.triggers t
JOIN pg_proc p ON p.proname = substring(t.action_statement from 'EXECUTE FUNCTION ([^(]+)')
WHERE t.event_object_table = 'contracts'
AND t.event_object_schema = 'public';

-- ============================================================================
-- 4. LISTAR TODAS AS FUNÇÕES DE TRIGGER QUE PODEM ESTAR AFETANDO
-- ============================================================================

SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%contracts%'
AND routine_definition ILIKE '%NEW.type%'
AND routine_schema = 'public';

-- ============================================================================
-- 5. VERIFICAR SE EXISTEM CONSTRAINTS PROBLEMÁTICAS
-- ============================================================================

SELECT
    constraint_name,
    constraint_type,
    table_name,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'contracts'
AND tc.table_schema = 'public';

-- ============================================================================
-- 6. DESABILITAR TEMPORARIAMENTE TRIGGERS PROBLEMÁTICOS SE ENCONTRADOS
-- ============================================================================

-- Se encontrarmos triggers problemáticos, vamos desabilitá-los temporariamente
-- Isso será feito condicionalmente baseado no que encontrarmos

DO $$
DECLARE
    trigger_record RECORD;
    function_def TEXT;
BEGIN
    -- Procurar triggers que podem estar causando problemas
    FOR trigger_record IN
        SELECT trigger_name, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'contracts'
        AND event_object_schema = 'public'
    LOOP
        -- Verificar se o trigger executa uma função que pode ter o problema
        IF trigger_record.action_statement ILIKE '%type%' THEN
            RAISE NOTICE 'Trigger potencialmente problemático encontrado: %', trigger_record.trigger_name;

            -- Aqui poderíamos desabilitar o trigger se necessário
            -- EXECUTE format('ALTER TABLE contracts DISABLE TRIGGER %I', trigger_record.trigger_name);
        END IF;
    END LOOP;

    RAISE NOTICE 'Verificação de triggers concluída';
END
$$;

-- ============================================================================
-- 7. CRIAR FUNÇÃO DE AUDITORIA CORRIGIDA SE NECESSÁRIO
-- ============================================================================

-- Se o problema for uma função de auditoria, vamos criar uma versão corrigida
-- que não tenta acessar a coluna "type" que não existe em contracts

-- Esta é uma função de exemplo que pode substituir uma problemática
CREATE OR REPLACE FUNCTION public.audit_contracts_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Função de auditoria que NÃO tenta acessar NEW.type
    -- Apenas registra as mudanças sem referenciar colunas que não existem

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            table_name,
            operation,
            row_id,
            new_values,
            changed_at,
            changed_by
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            NEW.id,
            row_to_json(NEW),
            now(),
            auth.uid()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            table_name,
            operation,
            row_id,
            old_values,
            new_values,
            changed_at,
            changed_by
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            now(),
            auth.uid()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            table_name,
            operation,
            row_id,
            old_values,
            changed_at,
            changed_by
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            OLD.id,
            row_to_json(OLD),
            now(),
            auth.uid()
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- ============================================================================
-- 8. TESTE RÁPIDO DE OPERAÇÃO
-- ============================================================================

-- Tentar fazer um update simples para ver se ainda há erro
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Pegar um ID existente para testar
    SELECT id INTO test_id FROM contracts LIMIT 1;

    IF test_id IS NOT NULL THEN
        -- Tentar um update simples
        UPDATE contracts
        SET updated_at = NOW()
        WHERE id = test_id;

        RAISE NOTICE 'Teste de update executado com sucesso para ID: %', test_id;
    ELSE
        RAISE NOTICE 'Nenhum contrato encontrado para testar';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste de update: %', SQLERRM;
END
$$;

-- ============================================================================
-- 9. RESULTADO FINAL
-- ============================================================================

SELECT '✅ ANÁLISE DE TRIGGERS CONCLUÍDA - Verifique os resultados acima' as status;

-- ==============================================================================
-- FIM DO SCRIPT DE DIAGNÓSTICO
-- ==============================================================================