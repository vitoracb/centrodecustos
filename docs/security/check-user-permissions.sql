-- Verificar estrutura da tabela user_permissions
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_permissions'
    AND table_schema = 'public'
ORDER BY ordinal_position;
