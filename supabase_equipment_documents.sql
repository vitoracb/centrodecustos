-- ============================================
-- TABELA: equipment_documents
-- Descrição: Armazena documentos vinculados a equipamentos
-- ============================================

CREATE TABLE IF NOT EXISTS public.equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_equipment_documents_equipment_id 
  ON public.equipment_documents(equipment_id);

CREATE INDEX IF NOT EXISTS idx_equipment_documents_date 
  ON public.equipment_documents(date);

-- Comentários para documentação
COMMENT ON TABLE public.equipment_documents IS 'Documentos vinculados a equipamentos';
COMMENT ON COLUMN public.equipment_documents.equipment_id IS 'ID do equipamento';
COMMENT ON COLUMN public.equipment_documents.name IS 'Nome do documento';
COMMENT ON COLUMN public.equipment_documents.date IS 'Data do documento';
COMMENT ON COLUMN public.equipment_documents.file_name IS 'Nome do arquivo';
COMMENT ON COLUMN public.equipment_documents.file_url IS 'URL do arquivo no Supabase Storage';
COMMENT ON COLUMN public.equipment_documents.mime_type IS 'Tipo MIME do arquivo';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuários anônimos
CREATE POLICY "Allow anon select equipment documents"
  ON public.equipment_documents
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert equipment documents"
  ON public.equipment_documents
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update equipment documents"
  ON public.equipment_documents
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete equipment documents"
  ON public.equipment_documents
  FOR DELETE
  TO anon
  USING (true);

