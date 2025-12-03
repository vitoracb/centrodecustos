-- Adiciona coluna equipment_id na tabela orders e cria relação com equipments

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES public.equipments(id);

CREATE INDEX IF NOT EXISTS idx_orders_equipment_id
  ON public.orders(equipment_id);




