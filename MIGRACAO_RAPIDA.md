# 🚀 MIGRAÇÃO RÁPIDA - GUIA EXECUTIVO

## ✅ CREDENCIAIS JÁ CONFIGURADAS

O arquivo `.env.migration` já está configurado com:
- **URL:** `https://foffmjqekmeogsldehbr.supabase.co`
- **Anon Key:** Configurada ✅

---

## 📋 PASSO A PASSO SIMPLIFICADO

### **1. CRIAR ESTRUTURA NO NOVO BANCO**

Acesse o novo projeto Supabase → **SQL Editor** → Execute:

```sql
-- 1. Criar tabela cost_centers
CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela equipments
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

-- 3. Criar tabela expenses
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

-- 4. Criar tabela receipts
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

-- 5. Criar tabela contracts
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

-- 6. Criar tabela orders
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

-- 7. Criar tabela employee_documents
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

-- 8. Habilitar RLS
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- 9. Criar políticas (acesso total - ajuste depois se necessário)
CREATE POLICY "Enable all for authenticated users" ON cost_centers FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON equipments FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON expenses FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON receipts FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON contracts FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON orders FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON employee_documents FOR ALL USING (true);
```

✅ **Estrutura criada!**

---

### **2. CONFIGURAR STORAGE (Se usar uploads)**

No novo banco Supabase → **Storage** → Criar buckets:

1. `expense-documents`
2. `receipt-documents`
3. `contract-documents`
4. `order-documents`
5. `employee-documents`

Para cada bucket:
- Clique em **Policies**
- Adicione política: **Allow all operations** (ou configure conforme necessário)

---

### **3. EXECUTAR MIGRAÇÃO**

No terminal:

```bash
npx ts-node scripts/migrate-to-new-supabase.ts
```

O script vai:
1. Ler credenciais do `.env` (banco atual)
2. Ler credenciais do `.env.migration` (novo banco)
3. Mostrar resumo
4. Pedir confirmação
5. Migrar todos os dados

**Tempo estimado:** 2-5 minutos (dependendo da quantidade de dados)

---

### **4. VERIFICAR DADOS**

No novo banco → **SQL Editor**:

```sql
-- Verifica contagem de registros
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

Compare com o banco atual para confirmar.

---

### **5. ATUALIZAR APP**

Edite o arquivo `.env`:

```bash
# Substitua pelas novas credenciais
EXPO_PUBLIC_SUPABASE_URL=https://foffmjqekmeogsldehbr.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZmZtanFla21lb2dzbGRlaGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjYyMjYsImV4cCI6MjA4MDQwMjIyNn0.NPI3IibWWLWX-EsQ4K9iBxp8Pux6AHrapr2Rto0s3L8
```

---

### **6. TESTAR APP**

```bash
# Limpa cache e reinicia
npx expo start -c
```

Teste:
- ✅ Visualizar dados
- ✅ Criar novo registro
- ✅ Editar registro
- ✅ Deletar registro
- ✅ Upload de arquivo

---

## ⚠️ IMPORTANTE

### **Antes de começar:**
- [ ] Certifique-se de ter acesso ao novo projeto Supabase
- [ ] Faça backup do banco atual (opcional mas recomendado)
- [ ] Teste em horário de baixo uso

### **Se algo der errado:**
1. **Não entre em pânico!** 🙂
2. Reverta o `.env` para as credenciais antigas
3. Reinicie o app: `npx expo start -c`
4. Tudo volta ao normal

### **Após migração bem-sucedida:**
- [ ] Monitore logs por alguns dias
- [ ] Verifique se todos os usuários conseguem acessar
- [ ] Considere desativar o banco antigo após 1 semana

---

## 📞 TROUBLESHOOTING RÁPIDO

| Problema | Solução |
|----------|---------|
| "relation does not exist" | Execute os comandos CREATE TABLE do passo 1 |
| "permission denied" | Execute os comandos de RLS do passo 1 |
| Dados não aparecem | Verifique se atualizou o .env e limpou o cache |
| Script não encontra credenciais | Verifique se o .env.migration existe |

---

**Boa sorte! 🚀**

*Tempo total estimado: 15-30 minutos*
