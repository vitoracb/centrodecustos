-- ============================================
-- POLÍTICAS PARA O BUCKET "documentos"
-- ============================================
-- IMPORTANTE: Este app usa a chave anônima (anon key), não autenticação
-- Por isso as políticas são para "anon", não "authenticated"

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Authenticated users can upload to documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documentos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon users to read files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon users to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon users to delete files" ON storage.objects;

-- Verifica se o bucket existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'documentos'
  ) THEN
    RAISE EXCEPTION 'Bucket "documentos" não existe. Crie antes de aplicar as políticas.';
  END IF;
END$$;

-- 1. Política para permitir INSERT (upload) de arquivos
-- Usuários anônimos podem fazer upload nas pastas expenses/, employees/ e contracts/
CREATE POLICY "Allow anon users to upload files"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'documentos' AND
    ((storage.foldername(name))[1] = 'expenses' OR
     (storage.foldername(name))[1] = 'employees' OR
     (storage.foldername(name))[1] = 'contracts')
  );

-- 2. Política para permitir SELECT (leitura/download) de arquivos
-- Usuários anônimos podem ler arquivos
CREATE POLICY "Allow anon users to read files"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'documentos');

-- 3. Política para permitir UPDATE (atualização) de arquivos
-- Usuários anônimos podem atualizar arquivos
CREATE POLICY "Allow anon users to update files"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'documentos')
  WITH CHECK (bucket_id = 'documentos');

-- 4. Política para permitir DELETE (exclusão) de arquivos
-- Usuários anônimos podem deletar arquivos
CREATE POLICY "Allow anon users to delete files"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'documentos');