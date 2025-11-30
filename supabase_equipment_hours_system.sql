-- Adicionar colunas de horas trabalhadas
ALTER TABLE equipments 
ADD COLUMN IF NOT EXISTS current_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_until_revision NUMERIC DEFAULT 250;

-- Comentários explicativos
COMMENT ON COLUMN equipments.current_hours IS 'Horas trabalhadas atuais do equipamento';
COMMENT ON COLUMN equipments.hours_until_revision IS 'Quantas horas faltam para a próxima revisão';

-- Atualizar equipamentos existentes com valores padrão
UPDATE equipments 
SET 
  current_hours = 0,
  hours_until_revision = 250
WHERE current_hours IS NULL;

-- Verificar os dados
SELECT 
  name,
  current_hours,
  hours_until_revision,
  (current_hours + hours_until_revision) as next_revision_at
FROM equipments;

