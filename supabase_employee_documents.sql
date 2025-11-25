CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_date DATE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_center
  ON public.employee_documents(cost_center_id);

CREATE INDEX IF NOT EXISTS idx_employee_documents_equipment
  ON public.employee_documents(equipment_id);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select employee documents"
  ON public.employee_documents
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert employee documents"
  ON public.employee_documents
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update employee documents"
  ON public.employee_documents
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete employee documents"
  ON public.employee_documents
  FOR DELETE
  TO anon
  USING (true);

