-- ============================================
-- FIX: Tornar bucket order-documents PÚBLICO
-- ============================================
-- Este script corrige o problema de preview de orçamentos
-- que retornam erro HTTP 400 (Bad Request)

-- 1. Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE name = 'order-documents';

-- 2. Atualizar bucket para ser público
UPDATE storage.buckets 
SET public = true 
WHERE name = 'order-documents';

-- 3. Criar política de leitura pública para o bucket
-- Remove política antiga se existir
DROP POLICY IF EXISTS "Public read access for order documents" ON storage.objects;

-- Cria nova política permitindo leitura pública
CREATE POLICY "Public read access for order documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-documents');

-- 4. Verificar configuração
SELECT 
  name,
  public,
  created_at
FROM storage.buckets 
WHERE name = 'order-documents';

-- 5. Verificar políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%order%';

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- - Bucket 'order-documents' com public = true
-- - Política de leitura pública ativa
-- - URLs públicas funcionando sem erro 400
-- ============================================
