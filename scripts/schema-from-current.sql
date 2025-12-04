-- Schema completo do banco atual
-- Execute este SQL no novo banco

-- Tabela: equipments
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS purchase_date TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS active BOOLEAN;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS next_review_date TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS current_hours INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS hours_per_revision INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS last_revision_hours TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS next_revision_hours INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS hours_until_revision INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS cost_center_id TEXT;

-- Tabela: contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS active BOOLEAN;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS value INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cost_center_id TEXT;

-- Tabela: orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_file_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_file_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_file_mime_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost_center_id TEXT;

-- Tabela: employee_documents
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS document_date TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS cost_center_id TEXT;

-- Tabela: financial_transactions
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS value INTEGER;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS fixed_duration_months TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS installment_total TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS cost_center_id TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS debit_amount INTEGER;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS debit_description TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS has_debit BOOLEAN;

