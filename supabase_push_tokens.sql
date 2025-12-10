-- =====================================================
-- Tabela: user_push_tokens
-- Armazena tokens de push notification por usuário
-- =====================================================

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, push_token)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);

-- RLS (Row Level Security)
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem gerenciar seus próprios tokens
CREATE POLICY "Users can manage own push tokens"
  ON user_push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: service role pode ler todos (para enviar notificações)
CREATE POLICY "Service role can read all tokens"
  ON user_push_tokens
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_push_token_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_push_token_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_token_updated_at();

-- =====================================================
-- Comentários
-- =====================================================
COMMENT ON TABLE user_push_tokens IS 'Armazena tokens de push notification por usuário para notificações remotas';
COMMENT ON COLUMN user_push_tokens.push_token IS 'Expo Push Token (ExponentPushToken[xxx])';
COMMENT ON COLUMN user_push_tokens.platform IS 'Sistema operacional: ios ou android';
COMMENT ON COLUMN user_push_tokens.device_name IS 'Nome do dispositivo (opcional)';
