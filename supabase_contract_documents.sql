-- ============================================
-- TABELA PARA DOCUMENTOS DE CONTRATOS
-- ============================================
-- Esta tabela armazena documentos e fotos vinculados a contratos

CREATE TABLE IF NOT EXISTS public.contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id
  ON public.contract_documents(contract_id);

ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select contract documents"
  ON public.contract_documents
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert contract documents"
  ON public.contract_documents
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update contract documents"
  ON public.contract_documents
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete contract documents"
  ON public.contract_documents
  FOR DELETE
  TO anon
  USING (true);

