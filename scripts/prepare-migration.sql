-- Script para preparar o banco para migração
-- Execute ANTES de rodar o script de migração

-- 1. Remover constraints NOT NULL temporariamente
ALTER TABLE contracts ALTER COLUMN date DROP NOT NULL;
ALTER TABLE employee_documents ALTER COLUMN employee DROP NOT NULL;

-- 2. Desabilitar triggers de foreign key (não funciona no Supabase, mas vamos tentar outra abordagem)
-- Vamos remover as foreign keys temporariamente e recriar depois

-- Remover foreign keys
ALTER TABLE equipments DROP CONSTRAINT IF EXISTS equipments_cost_center_id_fkey;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_cost_center_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_cost_center_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_equipment_id_fkey;
ALTER TABLE employee_documents DROP CONSTRAINT IF EXISTS employee_documents_cost_center_id_fkey;
ALTER TABLE employee_documents DROP CONSTRAINT IF EXISTS employee_documents_equipment_id_fkey;
ALTER TABLE contract_documents DROP CONSTRAINT IF EXISTS contract_documents_contract_id_fkey;
ALTER TABLE review_notifications DROP CONSTRAINT IF EXISTS review_notifications_equipment_id_fkey;
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_cost_center_id_fkey;
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_equipment_id_fkey;
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_contract_id_fkey;
