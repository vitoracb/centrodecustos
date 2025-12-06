-- ============================================
-- TORNAR TODOS OS BUCKETS PÚBLICOS
-- ============================================
-- Configura todos os buckets para permitir preview
-- Execute cada comando SEPARADAMENTE no SQL Editor
-- ============================================

-- COMANDO 1: Tornar todos os buckets públicos
UPDATE storage.buckets 
SET public = true 
WHERE name IN (
  'employee-documents',
  'order-documents',
  'contract-documents',
  'receipt-documents',
  'expense-documents'
);

-- COMANDO 2: Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Public read access for all documents" ON storage.objects;

-- COMANDO 3: Criar política de leitura pública para TODOS os buckets
CREATE POLICY "Public read access for all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id IN (
    'employee-documents',
    'order-documents',
    'contract-documents',
    'receipt-documents',
    'expense-documents'
  )
);

-- ============================================
-- VERIFICAÇÃO (OPCIONAL)
-- ============================================
-- Verificar se todos estão públicos:
-- SELECT name, public FROM storage.buckets ORDER BY name;
