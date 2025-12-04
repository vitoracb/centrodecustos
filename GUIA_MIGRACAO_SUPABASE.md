# 🔄 GUIA DE MIGRAÇÃO SUPABASE

## 📋 PASSO A PASSO COMPLETO

### **FASE 1: PREPARAÇÃO**

#### 1.1. Obter Credenciais do Novo Banco

1. Acesse o novo projeto Supabase
2. Vá em **Settings** → **API**
3. Copie:
   - **Project URL** (ex: `https://xxx.supabase.co`)
   - **anon/public key**

#### 1.2. Verificar Estrutura do Banco Atual

No banco ATUAL, vá em **SQL Editor** e execute:

```sql
-- Lista todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

### **FASE 2: CRIAR ESTRUTURA NO NOVO BANCO**

#### 2.1. Criar Tabelas

No **SQL Editor** do NOVO banco, execute:

```sql
-- Tabela: cost_centers
CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: equipments
CREATE TABLE IF NOT EXISTS equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  year INTEGER NOT NULL,
  purchase_date TEXT,
  next_review TEXT,
  status TEXT DEFAULT 'ativo',
  cost_center_id TEXT REFERENCES cost_centers(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT,
  observations TEXT,
  cost_center_id TEXT REFERENCES cost_centers(id),
  equipment_id UUID REFERENCES equipments(id),
  is_fixed BOOLEAN DEFAULT FALSE,
  installment_number INTEGER,
  total_installments INTEGER,
  parent_id UUID,
  documents JSONB,
  status TEXT DEFAULT 'pendente',
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT,
  observations TEXT,
  cost_center_id TEXT REFERENCES cost_centers(id),
  equipment_id UUID REFERENCES equipments(id),
  documents JSONB,
  status TEXT DEFAULT 'pendente',
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  value NUMERIC,
  cost_center_id TEXT REFERENCES cost_centers(id),
  equipment_id UUID REFERENCES equipments(id),
  documents JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  date TEXT,
  order_date TEXT,
  cost_center_id TEXT REFERENCES cost_centers(id),
  equipment_id UUID REFERENCES equipments(id),
  documents JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: employee_documents
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee TEXT NOT NULL,
  equipment_id UUID REFERENCES equipments(id),
  cost_center_id TEXT REFERENCES cost_centers(id),
  document_type TEXT NOT NULL,
  document_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.2. Configurar RLS (Row Level Security)

```sql
-- Habilita RLS em todas as tabelas
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- Cria políticas permissivas (ajuste conforme necessário)
CREATE POLICY "Enable all for authenticated users" ON cost_centers FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON equipments FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON expenses FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON receipts FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON contracts FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON orders FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON employee_documents FOR ALL USING (true);
```

#### 2.3. Configurar Storage (se usar)

1. Vá em **Storage** no novo banco
2. Crie os buckets:
   - `expense-documents`
   - `receipt-documents`
   - `contract-documents`
   - `order-documents`
   - `employee-documents`
3. Configure as políticas de acesso

---

### **FASE 3: MIGRAR DADOS**

#### Opção A: Script Automatizado (Recomendado)

```bash
# Execute o script de migração
npx ts-node scripts/migrate-to-new-supabase.ts
```

O script irá:
1. Conectar ao banco atual
2. Exportar todos os dados
3. Importar para o novo banco
4. Mostrar progresso em tempo real

#### Opção B: Manual via SQL

1. No banco ATUAL, exporte cada tabela:

```sql
-- Exemplo para equipments
COPY (SELECT * FROM equipments) TO STDOUT WITH CSV HEADER;
```

2. No banco NOVO, importe:

```sql
-- Exemplo para equipments
COPY equipments FROM STDIN WITH CSV HEADER;
-- Cole os dados aqui
```

---

### **FASE 4: ATUALIZAR APLICAÇÃO**

#### 4.1. Atualizar .env

Edite o arquivo `.env`:

```bash
# Substitua pelas novas credenciais
EXPO_PUBLIC_SUPABASE_URL=https://SEU-NOVO-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-nova-chave-aqui
```

#### 4.2. Limpar Cache

```bash
# Limpa cache do Expo
npx expo start -c
```

---

### **FASE 5: VERIFICAÇÃO**

#### 5.1. Verificar Dados

No novo banco, execute:

```sql
-- Conta registros em cada tabela
SELECT 
  'cost_centers' as tabela, COUNT(*) as total FROM cost_centers
UNION ALL
SELECT 'equipments', COUNT(*) FROM equipments
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'receipts', COUNT(*) FROM receipts
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'employee_documents', COUNT(*) FROM employee_documents;
```

#### 5.2. Testar App

1. Abra o app
2. Verifique se os dados aparecem
3. Teste criar/editar/deletar registros
4. Verifique upload de arquivos

---

## ⚠️ IMPORTANTE

### Antes de Migrar:
- ✅ Faça backup do banco atual
- ✅ Teste em ambiente de desenvolvimento primeiro
- ✅ Verifique se todas as tabelas estão criadas
- ✅ Configure as RLS policies

### Após Migrar:
- ✅ Verifique contagem de registros
- ✅ Teste todas as funcionalidades
- ✅ Verifique storage/uploads
- ✅ Monitore logs de erro

### Rollback:
Se algo der errado, basta reverter o `.env` para as credenciais antigas.

---

## 🆘 TROUBLESHOOTING

### Erro: "relation does not exist"
**Causa:** Tabela não foi criada no novo banco  
**Solução:** Execute os comandos CREATE TABLE da Fase 2.1

### Erro: "duplicate key value"
**Causa:** Registro já existe no novo banco  
**Solução:** Use `UPSERT` ao invés de `INSERT`

### Erro: "permission denied"
**Causa:** RLS policies não configuradas  
**Solução:** Execute os comandos da Fase 2.2

### Dados não aparecem no app
**Causa:** .env não foi atualizado ou cache não foi limpo  
**Solução:** Verifique .env e execute `npx expo start -c`

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs do Supabase
2. Verifique o console do app
3. Revise cada fase deste guia
4. Consulte a documentação do Supabase

---

**Boa sorte com a migração! 🚀**
