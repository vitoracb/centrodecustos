-- ==============================================================================
-- VERIFICAR ESTRUTURA REAL DAS TABELAS
-- ==============================================================================

-- 🔍 Vamos ver quais colunas realmente existem em cada tabela

-- ============================================================================
-- VERIFICAR COLUNAS DE CADA TABELA
-- ============================================================================

-- 1. Financial Transactions
SELECT 'FINANCIAL_TRANSACTIONS' as tabela, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'financial_transactions'
ORDER BY ordinal_position;

-- 2. Equipments
SELECT 'EQUIPMENTS' as tabela, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'equipments'
ORDER BY ordinal_position;

-- 3. Orders
SELECT 'ORDERS' as tabela, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- 4. Contracts
SELECT 'CONTRACTS' as tabela, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'contracts'
ORDER BY ordinal_position;

-- 5. Employee Documents
SELECT 'EMPLOYEE_DOCUMENTS' as tabela, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employee_documents'
ORDER BY ordinal_position;

-- ============================================================================
-- VERIFICAR DADOS DE EXEMPLO
-- ============================================================================

-- Ver algumas linhas reais para entender a estrutura
SELECT 'EXEMPLO FINANCIAL_TRANSACTIONS:' as info;
SELECT * FROM financial_transactions LIMIT 2;

SELECT 'EXEMPLO ORDERS:' as info;
SELECT * FROM orders LIMIT 2;

SELECT 'EXEMPLO EQUIPMENTS:' as info;
SELECT * FROM equipments LIMIT 2;

-- ✅ EXECUTE ESTE SCRIPT PRIMEIRO!
-- Com essas informações vou criar views que realmente funcionam