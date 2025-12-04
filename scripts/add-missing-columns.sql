-- Script para adicionar colunas faltantes nas tabelas existentes
-- Execute este script no SQL Editor do Supabase

-- EQUIPMENTS
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS current_hours NUMERIC;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS hours_per_revision NUMERIC;

-- CONTRACTS
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date TEXT;

-- ORDERS
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_file_mime_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_file_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_file_url TEXT;

-- EMPLOYEE_DOCUMENTS
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS document_date TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS employee_name TEXT;

-- REVIEW_NOTIFICATIONS
ALTER TABLE review_notifications ADD COLUMN IF NOT EXISTS notified_date TEXT;

-- FINANCIAL_TRANSACTIONS
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS debit_amount NUMERIC;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS debit_description TEXT;
