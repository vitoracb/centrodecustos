-- ============================================
-- MIGRAÇÃO: cost_center_id UUID -> TEXT (code)
-- ============================================
-- Este script converte cost_center_id de UUID para TEXT (código do centro de custo)
-- para facilitar a visualização nas tabelas do Supabase
-- 
-- Tabelas afetadas:
-- - equipments
-- - contracts
-- - employee_documents
-- - orders
-- - financial_transactions (expenses/receipts)
-- ============================================

-- ============================================
-- 1. EQUIPMENTS
-- ============================================
-- Remove foreign key constraint
ALTER TABLE public.equipments
DROP CONSTRAINT IF EXISTS equipments_cost_center_id_fkey;

-- Adiciona coluna temporária com código
ALTER TABLE public.equipments
ADD COLUMN IF NOT EXISTS cost_center_code_temp TEXT;

-- Migra dados: UUID -> code
UPDATE public.equipments e
SET cost_center_code_temp = cc.code
FROM public.cost_centers cc
WHERE e.cost_center_id = cc.id;

-- Remove coluna antiga
ALTER TABLE public.equipments
DROP COLUMN IF EXISTS cost_center_id;

-- Renomeia coluna temporária
ALTER TABLE public.equipments
RENAME COLUMN cost_center_code_temp TO cost_center_id;

-- Altera tipo para TEXT
ALTER TABLE public.equipments
ALTER COLUMN cost_center_id TYPE TEXT USING cost_center_id::TEXT;

-- Adiciona constraint CHECK para validar valores
ALTER TABLE public.equipments
ADD CONSTRAINT equipments_cost_center_id_check 
CHECK (cost_center_id IN ('valenca', 'cna', 'cabralia'));

-- Recria índice
DROP INDEX IF EXISTS idx_equipments_cost_center_id;
CREATE INDEX IF NOT EXISTS idx_equipments_cost_center_id
ON public.equipments(cost_center_id);

-- ============================================
-- 2. CONTRACTS
-- ============================================
-- Remove foreign key constraint
ALTER TABLE public.contracts
DROP CONSTRAINT IF EXISTS contracts_cost_center_id_fkey;

-- Adiciona coluna temporária com código
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS cost_center_code_temp TEXT;

-- Migra dados: UUID -> code
UPDATE public.contracts c
SET cost_center_code_temp = cc.code
FROM public.cost_centers cc
WHERE c.cost_center_id = cc.id;

-- Remove coluna antiga
ALTER TABLE public.contracts
DROP COLUMN IF EXISTS cost_center_id;

-- Renomeia coluna temporária
ALTER TABLE public.contracts
RENAME COLUMN cost_center_code_temp TO cost_center_id;

-- Altera tipo para TEXT
ALTER TABLE public.contracts
ALTER COLUMN cost_center_id TYPE TEXT USING cost_center_id::TEXT;

-- Adiciona constraint CHECK para validar valores
ALTER TABLE public.contracts
ADD CONSTRAINT contracts_cost_center_id_check 
CHECK (cost_center_id IN ('valenca', 'cna', 'cabralia'));

-- Recria índice
DROP INDEX IF EXISTS idx_contracts_cost_center_id;
CREATE INDEX IF NOT EXISTS idx_contracts_cost_center_id
ON public.contracts(cost_center_id);

-- ============================================
-- 3. EMPLOYEE_DOCUMENTS
-- ============================================
-- Remove foreign key constraint
ALTER TABLE public.employee_documents
DROP CONSTRAINT IF EXISTS employee_documents_cost_center_id_fkey;

-- Adiciona coluna temporária com código
ALTER TABLE public.employee_documents
ADD COLUMN IF NOT EXISTS cost_center_code_temp TEXT;

-- Migra dados: UUID -> code
UPDATE public.employee_documents ed
SET cost_center_code_temp = cc.code
FROM public.cost_centers cc
WHERE ed.cost_center_id = cc.id;

-- Remove coluna antiga
ALTER TABLE public.employee_documents
DROP COLUMN IF EXISTS cost_center_id;

-- Renomeia coluna temporária
ALTER TABLE public.employee_documents
RENAME COLUMN cost_center_code_temp TO cost_center_id;

-- Altera tipo para TEXT
ALTER TABLE public.employee_documents
ALTER COLUMN cost_center_id TYPE TEXT USING cost_center_id::TEXT;

-- Adiciona constraint CHECK para validar valores
ALTER TABLE public.employee_documents
ADD CONSTRAINT employee_documents_cost_center_id_check 
CHECK (cost_center_id IN ('valenca', 'cna', 'cabralia'));

-- Recria índice
DROP INDEX IF EXISTS idx_employee_documents_center;
CREATE INDEX IF NOT EXISTS idx_employee_documents_center
ON public.employee_documents(cost_center_id);

-- ============================================
-- 4. ORDERS
-- ============================================
-- Remove foreign key constraint
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_cost_center_id_fkey;

-- Adiciona coluna temporária com código
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cost_center_code_temp TEXT;

-- Migra dados: UUID -> code
UPDATE public.orders o
SET cost_center_code_temp = cc.code
FROM public.cost_centers cc
WHERE o.cost_center_id = cc.id;

-- Remove coluna antiga
ALTER TABLE public.orders
DROP COLUMN IF EXISTS cost_center_id;

-- Renomeia coluna temporária
ALTER TABLE public.orders
RENAME COLUMN cost_center_code_temp TO cost_center_id;

-- Altera tipo para TEXT
ALTER TABLE public.orders
ALTER COLUMN cost_center_id TYPE TEXT USING cost_center_id::TEXT;

-- Adiciona constraint CHECK para validar valores
ALTER TABLE public.orders
ADD CONSTRAINT orders_cost_center_id_check 
CHECK (cost_center_id IN ('valenca', 'cna', 'cabralia'));

-- Recria índice
DROP INDEX IF EXISTS idx_orders_cost_center_id;
CREATE INDEX IF NOT EXISTS idx_orders_cost_center_id
ON public.orders(cost_center_id);

-- ============================================
-- 5. FINANCIAL_TRANSACTIONS (EXPENSES/RECEIPTS)
-- ============================================
-- Remove foreign key constraint
ALTER TABLE public.financial_transactions
DROP CONSTRAINT IF EXISTS financial_transactions_cost_center_id_fkey;

-- Adiciona coluna temporária com código
ALTER TABLE public.financial_transactions
ADD COLUMN IF NOT EXISTS cost_center_code_temp TEXT;

-- Migra dados: UUID -> code
UPDATE public.financial_transactions ft
SET cost_center_code_temp = cc.code
FROM public.cost_centers cc
WHERE ft.cost_center_id = cc.id;

-- Remove coluna antiga
ALTER TABLE public.financial_transactions
DROP COLUMN IF EXISTS cost_center_id;

-- Renomeia coluna temporária
ALTER TABLE public.financial_transactions
RENAME COLUMN cost_center_code_temp TO cost_center_id;

-- Altera tipo para TEXT
ALTER TABLE public.financial_transactions
ALTER COLUMN cost_center_id TYPE TEXT USING cost_center_id::TEXT;

-- Adiciona constraint CHECK para validar valores
ALTER TABLE public.financial_transactions
ADD CONSTRAINT financial_transactions_cost_center_id_check 
CHECK (cost_center_id IN ('valenca', 'cna', 'cabralia'));

-- Recria índice
DROP INDEX IF EXISTS idx_financial_transactions_cost_center_id;
CREATE INDEX IF NOT EXISTS idx_financial_transactions_cost_center_id
ON public.financial_transactions(cost_center_id);

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Verifica se a migração foi bem-sucedida
SELECT 
  'equipments' as tabela,
  cost_center_id,
  COUNT(*) as total
FROM public.equipments
GROUP BY cost_center_id
UNION ALL
SELECT 
  'contracts' as tabela,
  cost_center_id,
  COUNT(*) as total
FROM public.contracts
GROUP BY cost_center_id
UNION ALL
SELECT 
  'employee_documents' as tabela,
  cost_center_id,
  COUNT(*) as total
FROM public.employee_documents
GROUP BY cost_center_id
UNION ALL
SELECT 
  'orders' as tabela,
  cost_center_id,
  COUNT(*) as total
FROM public.orders
GROUP BY cost_center_id
UNION ALL
SELECT 
  'financial_transactions' as tabela,
  cost_center_id,
  COUNT(*) as total
FROM public.financial_transactions
GROUP BY cost_center_id
ORDER BY tabela, cost_center_id;

