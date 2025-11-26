-- ============================================
-- POLÍTICAS RLS PARA TABELAS DE EQUIPAMENTOS
-- ============================================
-- Este script configura as políticas RLS para permitir
-- operações CRUD para usuários anônimos nas tabelas:
-- - equipment_documents
-- - equipment_photos
-- - equipment_reviews
-- ============================================

-- ============================================
-- EQUIPMENT_DOCUMENTS
-- ============================================

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Allow anon select equipment documents" ON public.equipment_documents;
DROP POLICY IF EXISTS "Allow anon insert equipment documents" ON public.equipment_documents;
DROP POLICY IF EXISTS "Allow anon update equipment documents" ON public.equipment_documents;
DROP POLICY IF EXISTS "Allow anon delete equipment documents" ON public.equipment_documents;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.equipment_documents;

-- Garante que RLS está habilitado
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

-- Cria políticas para usuários anônimos
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

-- ============================================
-- EQUIPMENT_PHOTOS
-- ============================================

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Allow anon select equipment photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Allow anon insert equipment photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Allow anon update equipment photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Allow anon delete equipment photos" ON public.equipment_photos;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.equipment_photos;

-- Garante que RLS está habilitado
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;

-- Cria políticas para usuários anônimos
CREATE POLICY "Allow anon select equipment photos"
  ON public.equipment_photos
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert equipment photos"
  ON public.equipment_photos
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update equipment photos"
  ON public.equipment_photos
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete equipment photos"
  ON public.equipment_photos
  FOR DELETE
  TO anon
  USING (true);

-- ============================================
-- EQUIPMENT_REVIEWS
-- ============================================

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Allow anon select equipment reviews" ON public.equipment_reviews;
DROP POLICY IF EXISTS "Allow anon insert equipment reviews" ON public.equipment_reviews;
DROP POLICY IF EXISTS "Allow anon update equipment reviews" ON public.equipment_reviews;
DROP POLICY IF EXISTS "Allow anon delete equipment reviews" ON public.equipment_reviews;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.equipment_reviews;

-- Garante que RLS está habilitado
ALTER TABLE public.equipment_reviews ENABLE ROW LEVEL SECURITY;

-- Cria políticas para usuários anônimos
CREATE POLICY "Allow anon select equipment reviews"
  ON public.equipment_reviews
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert equipment reviews"
  ON public.equipment_reviews
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update equipment reviews"
  ON public.equipment_reviews
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete equipment reviews"
  ON public.equipment_reviews
  FOR DELETE
  TO anon
  USING (true);

