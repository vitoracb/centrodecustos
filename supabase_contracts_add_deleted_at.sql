-- Adiciona coluna deleted_at para Soft Delete na tabela contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Cria índice para melhor performance em consultas que filtram deletados
CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at ON contracts(deleted_at);
