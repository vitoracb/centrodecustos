-- ============================================
-- FIX: Tornar bucket order-documents PÚBLICO
-- ============================================
-- Este script corrige o problema de preview de orçamentos
-- que retornam erro HTTP 400 (Bad Request)
--
-- IMPORTANTE: Execute cada comando SEPARADAMENTE no SQL Editor
-- ============================================

-- COMANDO 1: Atualizar bucket para ser público
-- Execute este primeiro:
UPDATE storage.buckets 
SET public = true 
WHERE name = 'order-documents';

-- COMANDO 2: Remover política antiga (se existir)
-- Execute este segundo:
DROP POLICY IF EXISTS "Public read access for order documents" ON storage.objects;

-- COMANDO 3: Criar política de leitura pública
-- Execute este terceiro:
CREATE POLICY "Public read access for order documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-documents');

-- ============================================
-- COMANDOS DE VERIFICAÇÃO (OPCIONAL)
-- ============================================

-- Verificar se bucket está público:
-- SELECT name, public FROM storage.buckets WHERE name = 'order-documents';

-- Verificar políticas:
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%order%';
