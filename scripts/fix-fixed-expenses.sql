-- Adicionar colunas faltantes em fixed_expenses
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS day_of_month INTEGER;

-- Adicionar colunas faltantes em equipment_documents
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS date TEXT;
