-- Migração: Adicionar sistema de revisão por horas trabalhadas (campo personalizável)
-- Data: 2025-01-XX

-- Adicionar colunas de horas
ALTER TABLE equipments 
ADD COLUMN IF NOT EXISTS current_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_until_revision NUMERIC DEFAULT 250;

-- Atualizar equipamentos existentes com valores padrão
UPDATE equipments 
SET 
  current_hours = COALESCE(current_hours, 0),
  hours_until_revision = COALESCE(hours_until_revision, 250)
WHERE current_hours IS NULL OR hours_until_revision IS NULL;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN equipments.current_hours IS 'Horas trabalhadas atuais do equipamento';
COMMENT ON COLUMN equipments.hours_until_revision IS 'Quantas horas faltam para a próxima revisão (campo personalizável)';

