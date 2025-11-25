-- ============================================
-- TABELA: expense_documents
-- Descrição: Armazena documentos (notas fiscais e recibos) vinculados a despesas
-- ============================================

CREATE TABLE IF NOT EXISTS public.expense_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('nota_fiscal', 'recibo')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_expense_documents_transaction_id 
  ON public.expense_documents(transaction_id);

-- Comentários para documentação
COMMENT ON TABLE public.expense_documents IS 'Documentos (notas fiscais e recibos) vinculados a despesas';
COMMENT ON COLUMN public.expense_documents.transaction_id IS 'ID da transação financeira (despesa)';
COMMENT ON COLUMN public.expense_documents.type IS 'Tipo do documento: nota_fiscal ou recibo';
COMMENT ON COLUMN public.expense_documents.file_name IS 'Nome do arquivo';
COMMENT ON COLUMN public.expense_documents.file_url IS 'URL do arquivo (pode ser local ou do Supabase Storage)';
COMMENT ON COLUMN public.expense_documents.mime_type IS 'Tipo MIME do arquivo (ex: application/pdf, image/jpeg)';

-- Habilitar RLS (Row Level Security) se necessário
ALTER TABLE public.expense_documents ENABLE ROW LEVEL SECURITY;

-- Política básica: permitir leitura e escrita para usuários autenticados
-- Ajuste conforme suas necessidades de segurança
CREATE POLICY "Allow all operations for authenticated users" 
  ON public.expense_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

