-- Tabela para armazenar histórico de notificações de revisão
-- Permite sincronização entre dispositivos e histórico persistente

CREATE TABLE IF NOT EXISTS review_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
  review_date TEXT NOT NULL, -- 'DD/MM/YYYY'
  days_until INTEGER NOT NULL, -- 7, 1, ou 0
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Data sem hora para constraint UNIQUE
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Evita duplicatas: uma notificação por equipamento/data/intervalo por dia
  UNIQUE(equipment_id, review_date, days_until, notified_date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_review_notifications_equipment 
  ON review_notifications(equipment_id);

CREATE INDEX IF NOT EXISTS idx_review_notifications_date 
  ON review_notifications(notified_date);

CREATE INDEX IF NOT EXISTS idx_review_notifications_equipment_date 
  ON review_notifications(equipment_id, review_date, days_until);

-- RLS Policies (permitir acesso anônimo para leitura/escrita)
ALTER TABLE review_notifications ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (qualquer um pode ler)
CREATE POLICY "Allow anon select on review_notifications"
  ON review_notifications
  FOR SELECT
  TO anon
  USING (true);

-- Política para INSERT (qualquer um pode inserir)
CREATE POLICY "Allow anon insert on review_notifications"
  ON review_notifications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política para DELETE (qualquer um pode deletar - para limpeza)
CREATE POLICY "Allow anon delete on review_notifications"
  ON review_notifications
  FOR DELETE
  TO anon
  USING (true);

-- Comentários
COMMENT ON TABLE review_notifications IS 'Histórico de notificações de revisão enviadas para sincronização entre dispositivos';
COMMENT ON COLUMN review_notifications.review_date IS 'Data da revisão no formato DD/MM/YYYY';
COMMENT ON COLUMN review_notifications.days_until IS 'Dias até a revisão quando a notificação foi enviada (7, 1, ou 0)';

