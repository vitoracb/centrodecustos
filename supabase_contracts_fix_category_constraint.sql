-- ============================================
-- CORRIGE A CONSTRAINT DE CATEGORIA
-- ============================================
-- Este script remove a constraint antiga e cria uma nova com os valores corretos

-- Remove a constraint antiga se existir
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_category_check;

-- Adiciona a constraint correta
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_category_check 
  CHECK (category IN ('principal', 'terceirizados'));

-- Verifica se a constraint foi aplicada corretamente
-- Execute: SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'contracts_category_check';

