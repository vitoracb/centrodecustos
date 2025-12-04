-- Criar todas as tabelas que existem no banco atual mas não no novo

-- equipment_documents
CREATE TABLE IF NOT EXISTS equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipments(id),
  file_name TEXT,
  file_url TEXT,
  mime_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- equipment_photos
CREATE TABLE IF NOT EXISTS equipment_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipments(id),
  photo_url TEXT,
  photo_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- equipment_reviews
CREATE TABLE IF NOT EXISTS equipment_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipments(id),
  review_date TEXT,
  hours_at_review INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- expense_documents
CREATE TABLE IF NOT EXISTS expense_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID,
  file_name TEXT,
  file_url TEXT,
  mime_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- fixed_expenses
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  category TEXT,
  sector TEXT,
  cost_center_id TEXT REFERENCES cost_centers(id),
  duration_months INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- order_documents
CREATE TABLE IF NOT EXISTS order_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  file_name TEXT,
  file_url TEXT,
  mime_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- order_quotes
CREATE TABLE IF NOT EXISTS order_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  quote_file_url TEXT,
  quote_file_name TEXT,
  quote_file_mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE equipment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_quotes ENABLE ROW LEVEL SECURITY;

-- Criar políticas
CREATE POLICY "Enable all for authenticated users" ON equipment_documents FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON equipment_photos FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON equipment_reviews FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON expense_documents FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON fixed_expenses FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON order_documents FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON order_quotes FOR ALL USING (true);
