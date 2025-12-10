# Políticas de Segurança RLS (Row Level Security) - Supabase

## 🛡️ Políticas Recomendadas para Centro de Custos

**MODELO DE PERMISSÕES:**
- ✅ Todos os usuários podem **ver todos os centros de custo** (Valença, CNA, Cabrália)
- ✅ Permissões específicas por usuário/centro definem **quais ações** podem realizar
- ✅ Controle granular: leitura, escrita e admin por centro
- ✅ Um usuário pode ter acesso de leitura em Valença, escrita em CNA e admin em Cabrália

**ESTRUTURA ESPERADA DA TABELA `user_permissions`:**
```sql
CREATE TABLE user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES cost_centers(id) ON DELETE CASCADE,
  can_read BOOLEAN DEFAULT false,
  can_write BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1. Tabela `financial_transactions`

```sql
-- POLICY: Usuários só veem transações dos centros aos quais têm acesso
CREATE POLICY "Users can only access authorized center transactions" ON financial_transactions
FOR SELECT USING (
  cost_center_id IN (
    SELECT cost_center_id
    FROM user_permissions
    WHERE user_id = auth.uid()
    AND can_read = true
  )
);

-- POLICY: Apenas usuários com permissão de escrita podem inserir
CREATE POLICY "Only writers can insert transactions" ON financial_transactions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = NEW.cost_center_id
    AND can_write = true
  )
);

-- POLICY: Apenas usuários com permissão podem atualizar
CREATE POLICY "Only authorized users can update transactions" ON financial_transactions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = OLD.cost_center_id
    AND can_write = true
  )
);

-- POLICY: Apenas admins podem deletar
CREATE POLICY "Only admins can delete transactions" ON financial_transactions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = OLD.cost_center_id
    AND is_admin = true
  )
);
```

### 2. Tabela `equipments`

```sql
-- POLICY: Usuários só veem equipamentos dos centros aos quais têm acesso de leitura
CREATE POLICY "Users can only access authorized center equipments" ON equipments
FOR SELECT USING (
  cost_center_id IN (
    SELECT cost_center_id
    FROM user_permissions
    WHERE user_id = auth.uid()
    AND can_read = true
  )
);

-- POLICY: Apenas usuários com permissão podem inserir equipamentos
CREATE POLICY "Only writers can insert equipments" ON equipments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = NEW.cost_center_id
    AND can_write = true
  )
);

-- POLICY: Soft delete apenas - marcar como deletado
CREATE POLICY "Only authorized users can soft delete equipments" ON equipments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = OLD.cost_center_id
    AND can_write = true
  )
) WITH CHECK (
  -- Permite apenas atualizar deletedAt, não deletar fisicamente
  (NEW.deletedAt IS NOT NULL AND OLD.deletedAt IS NULL) OR
  (NEW.deletedAt IS NULL AND OLD.deletedAt IS NULL)
);
```

### 3. Tabela `contracts`

```sql
-- POLICY: Usuários só veem contratos dos centros aos quais têm acesso de leitura
CREATE POLICY "Users can only access authorized center contracts" ON contracts
FOR SELECT USING (
  cost_center_id IN (
    SELECT cost_center_id
    FROM user_permissions
    WHERE user_id = auth.uid()
    AND can_read = true
  )
);

-- POLICY: Inserção apenas com permissão
CREATE POLICY "Authorized contract creation" ON contracts
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = NEW.cost_center_id
    AND can_write = true
  )
);
```

### 4. Tabela `orders` (Pedidos)

```sql
-- POLICY: Acesso baseado no centro de custo
CREATE POLICY "Center-based order access" ON orders
FOR ALL USING (
  cost_center_id IN (
    SELECT cost_center_id
    FROM user_permissions
    WHERE user_id = auth.uid()
  )
);

-- POLICY: Criação de pedidos apenas com permissão
CREATE POLICY "Authorized order creation" ON orders
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND cost_center_id = NEW.cost_center_id
    AND can_write = true
  )
);
```

### 5. Tabela `user_permissions` (Crítica)

```sql
-- POLICY: Usuários só veem suas próprias permissões
CREATE POLICY "Users can only see their own permissions" ON user_permissions
FOR SELECT USING (user_id = auth.uid());

-- POLICY: Apenas admins podem modificar permissões
CREATE POLICY "Only admins can modify permissions" ON user_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);
```

### 6. Tabela `cost_centers`

```sql
-- POLICY: Todos os usuários podem ver todos os centros de custo
CREATE POLICY "All authenticated users can view cost centers" ON cost_centers
FOR SELECT USING (auth.role() = 'authenticated');

-- POLICY: Apenas super admins podem modificar centros de custo
CREATE POLICY "Only super admins can modify cost centers" ON cost_centers
FOR INSERT, UPDATE, DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);
```

## 🔐 Políticas de Auditoria

### 7. Tabela `audit_logs`

```sql
-- POLICY: Usuários só veem logs de suas ações ou do seu centro
CREATE POLICY "Users can only see relevant audit logs" ON audit_logs
FOR SELECT USING (
  user_id = auth.uid() OR
  cost_center_id IN (
    SELECT cost_center_id
    FROM user_permissions
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- POLICY: Sistema insere logs automaticamente
CREATE POLICY "System can insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (true);

-- POLICY: Logs são imutáveis
CREATE POLICY "Audit logs are immutable" ON audit_logs
FOR UPDATE USING (false);

CREATE POLICY "Audit logs cannot be deleted" ON audit_logs
FOR DELETE USING (false);
```

## 📋 Script de Implementação

### Ativar RLS nas Tabelas

```sql
-- Ativar RLS em todas as tabelas críticas
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### Função para Log de Auditoria

```sql
-- Função para registrar ações sensíveis
CREATE OR REPLACE FUNCTION log_financial_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    cost_center_id,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    COALESCE(NEW.cost_center_id, OLD.cost_center_id),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para transações financeiras
CREATE TRIGGER audit_financial_transactions
  AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION log_financial_action();
```

## 🚨 Validações Adicionais

### Função de Validação de Valores

```sql
-- Função para validar valores monetários
CREATE OR REPLACE FUNCTION validate_financial_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Valor deve ser positivo
  IF NEW.value <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero: %', NEW.value;
  END IF;

  -- Valor não pode ser maior que limite por categoria
  IF NEW.value > 1000000 THEN
    RAISE EXCEPTION 'Valor muito alto, requer aprovação manual: %', NEW.value;
  END IF;

  -- Data não pode ser muito no futuro
  IF NEW.date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'Data muito distante no futuro: %', NEW.date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar validação a transações financeiras
CREATE TRIGGER validate_financial_data
  BEFORE INSERT OR UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION validate_financial_values();
```

## 🔧 Comandos para Aplicar

Execute estes comandos no SQL Editor do Supabase:

1. **Ativar RLS**: Execute o script "Ativar RLS nas Tabelas"
2. **Criar Políticas**: Execute cada seção de políticas sequencialmente
3. **Implementar Auditoria**: Execute as funções e triggers de auditoria
4. **Validações**: Execute as funções de validação

## ⚠️ Importantes Considerações

- **Backup**: Sempre faça backup antes de aplicar políticas RLS
- **Teste**: Teste em ambiente de desenvolvimento primeiro
- **Monitoramento**: Configure alertas para tentativas de acesso negado
- **Performance**: RLS pode impactar performance - monitore queries

## 📊 Verificação das Políticas

```sql
-- Verificar políticas ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';

-- Verificar se RLS está ativo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
```