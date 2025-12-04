-- Script de criação de tabelas para o novo banco Supabase
-- Execute este arquivo no SQL Editor do Supabase

-- 1. Criar tabela cost_centers
CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela equipments
CREATE TABLE IF NOT EXISTS equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  year INTEGER NOT NULL,
  purchase_date TEXT,
  next_review TEXT,
  status TEXT DEFAULT 'ativo',
  cost_center_id TEXT REFERENCES cost_centers(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT,
  observations TEXT,
  cost_center_id TEXT REFERENCES cost_centers(id),
  equipment_id UUID REFERENCES equipments(id),
  is_fixed BOOLEAN DEFAULT FALSE,
  installment_number INTEGER,
  total_installments INTEGER,
  parent_id UUID,
  documents JSONB,
  status TEXT DEFAULT 'pendente',
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar tabela receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT,
  observations TEXT,
  cost_center_id TEXT REFERENCES cost_centers(id),
  equipment_id UUID REFERENCES equipments(id),
  documents JSONB,
  status TEXT DEFAULT 'pendente',
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar tabela contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  value NUMERIC,
  cost_center_id TEXT REFERENCES cost_centers(id),
  equipment_id UUID REFERENCES equipments(id),
  documents JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Criar tabela orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  date TEXT,
  order_date TEXT,
  cost_center_id TEXT REFERENCES cost_centers(id),
  equipment_id UUID REFERENCES equipments(id),
  documents JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Criar tabela employee_documents
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee TEXT NOT NULL,
  equipment_id UUID REFERENCES equipments(id),
  cost_center_id TEXT REFERENCES cost_centers(id),
  document_type TEXT NOT NULL,
  document_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Habilitar RLS (Row Level Security)
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- 9. Criar políticas de acesso (permite tudo - ajuste depois se necessário)
CREATE POLICY "Enable all for authenticated users" ON cost_centers FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON equipments FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON expenses FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON receipts FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON contracts FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON orders FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON employee_documents FOR ALL USING (true);
