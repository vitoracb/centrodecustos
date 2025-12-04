-- Script para adicionar colunas faltantes nas tabelas existentes
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna active em equipments
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Adicionar coluna active em contracts  
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Adicionar coluna quote_file_mime_type em orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_file_mime_type TEXT;

-- Adicionar coluna document_date em employee_documents
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS document_date TEXT;

-- Adicionar coluna notified_date em review_notifications
ALTER TABLE review_notifications ADD COLUMN IF NOT EXISTS notified_date TEXT;

-- Adicionar coluna contract_id em financial_transactions
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id);
