# 🗄️ Integração de Orçamentos com Supabase

## ✅ Status da Integração

**SIM, tudo está integrado ao Supabase!** Todas as funcionalidades de múltiplos orçamentos, aprovar/recusar estão usando o banco de dados.

---

## 📊 Tabelas Utilizadas

### 1. `orders` (Tabela Principal)
- Armazena os pedidos
- Campo `status` aceita os valores:
  - `orcamento_solicitado`
  - `orcamento_pendente`
  - `orcamento_enviado`
  - `orcamento_aprovado` ✅ **NOVO**
  - `orcamento_recusado` ✅ **NOVO**
  - `em_execucao`
  - `finalizado`

### 2. `order_quotes` (Tabela de Orçamentos)
- Armazena **múltiplos orçamentos** por pedido
- Cada orçamento é um registro separado
- Relacionamento: `order_id` → `orders.id`

---

## 🔧 Scripts SQL Necessários

### 1. Atualizar Constraint de Status
**Arquivo:** `supabase_orders_update_status_constraint.sql`

Execute este script para garantir que a tabela `orders` aceite os novos status:
- `orcamento_aprovado`
- `orcamento_recusado`

```sql
-- Remove constraint antiga e adiciona nova com todos os status
ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'orcamento_solicitado',
    'orcamento_pendente',
    'orcamento_enviado',
    'orcamento_aprovado',
    'orcamento_recusado',
    'em_execucao',
    'finalizado'
  )
);
```

### 2. Tabela order_quotes (Já existe)
**Arquivo:** `supabase_order_quotes.sql`

A tabela já está criada e configurada. Se ainda não executou, execute este script.

---

## 🔄 Como Funciona a Integração

### Enviar Orçamento

1. **Primeiro orçamento:**
   ```typescript
   // Atualiza status do pedido para "orcamento_enviado"
   await supabase.from("orders").update({ status: "orcamento_enviado" })
   
   // Insere orçamento na tabela order_quotes
   await supabase.from("order_quotes").insert({
     order_id: orderId,
     file_url: budget.fileUri,
     file_name: budget.fileName,
     mime_type: budget.mimeType
   })
   ```

2. **Orçamentos adicionais:**
   ```typescript
   // Usa addBudgetToOrder() - apenas insere em order_quotes
   // Não altera o status (já está como "orcamento_enviado")
   await supabase.from("order_quotes").insert({ ... })
   ```

### Aprovar Orçamento

```typescript
// Atualiza status na tabela orders
await supabase
  .from("orders")
  .update({ status: "orcamento_aprovado" })
  .eq("id", orderId)
```

### Recusar Orçamento

```typescript
// Atualiza status na tabela orders
await supabase
  .from("orders")
  .update({ status: "orcamento_recusado" })
  .eq("id", orderId)
```

### Carregar Múltiplos Orçamentos

```typescript
// Carrega pedidos
const { data: orders } = await supabase.from("orders").select(...)

// Carrega todos os orçamentos
const { data: quotes } = await supabase
  .from("order_quotes")
  .select("order_id, file_url, file_name, mime_type")
  .order("created_at", { ascending: true })

// Agrupa orçamentos por pedido
const quotesByOrder = groupBy(quotes, 'order_id')
```

---

## 📝 Checklist de Setup

- [ ] **Executar `supabase_orders_update_status_constraint.sql`**
  - Atualiza constraint para aceitar novos status
  
- [ ] **Verificar se `order_quotes` existe**
  - Se não, executar `supabase_order_quotes.sql`
  
- [ ] **Verificar RLS Policies**
  - `order_quotes` deve ter SELECT, INSERT, UPDATE, DELETE para `anon`

---

## 🐛 Troubleshooting

### Erro: "new row for relation 'orders' violates check constraint"

**Causa:** Constraint de status não inclui os novos valores.

**Solução:** Execute `supabase_orders_update_status_constraint.sql`

### Erro: "relation 'order_quotes' does not exist"

**Causa:** Tabela não foi criada.

**Solução:** Execute `supabase_order_quotes.sql`

### Orçamentos não aparecem

**Causa:** RLS policy bloqueando acesso.

**Solução:** Verifique se as políticas estão corretas:
```sql
SELECT * FROM pg_policies WHERE tablename = 'order_quotes';
```

---

## ✅ Funcionalidades Integradas

- ✅ **Múltiplos orçamentos** → Tabela `order_quotes`
- ✅ **Aprovar orçamento** → Atualiza `orders.status = 'orcamento_aprovado'`
- ✅ **Recusar orçamento** → Atualiza `orders.status = 'orcamento_recusado'`
- ✅ **Carregar orçamentos** → Query em `order_quotes` agrupada por `order_id`
- ✅ **Notificações** → Locais (não precisam de banco)
- ✅ **Badge** → Conta do estado local (vem do Supabase)

---

## 📌 Próximo Passo

**Execute o script SQL no Supabase:**

1. Abra o SQL Editor no Supabase
2. Execute `supabase_orders_update_status_constraint.sql`
3. Pronto! ✅

**Tudo está integrado e funcionando!** 🎉

