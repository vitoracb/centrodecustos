# 🔄 MIGRAÇÃO MANUAL - MÉTODO ALTERNATIVO

A migração automática está encontrando problemas com constraints. Vamos fazer de forma mais simples.

## 📋 MÉTODO RECOMENDADO: Backup e Restore do Supabase

### **PASSO 1: Fazer backup do banco ATUAL**

No banco ATUAL (https://wksbxreajxkzwhvngege.supabase.co):

1. Vá em **Database** → **Backups**
2. Clique em **Create backup** (se disponível)
3. OU use o método SQL abaixo

### **PASSO 2: Exportar via SQL (Alternativa)**

Execute no SQL Editor do banco ATUAL:

```sql
-- Exportar cost_centers
COPY (SELECT * FROM cost_centers) TO STDOUT WITH CSV HEADER;

-- Exportar equipments  
COPY (SELECT * FROM equipments) TO STDOUT WITH CSV HEADER;

-- Exportar contracts
COPY (SELECT * FROM contracts) TO STDOUT WITH CSV HEADER;

-- Exportar orders
COPY (SELECT * FROM orders) TO STDOUT WITH CSV HEADER;

-- Exportar employee_documents
COPY (SELECT * FROM employee_documents) TO STDOUT WITH CSV HEADER;

-- Exportar contract_documents
COPY (SELECT * FROM contract_documents) TO STDOUT WITH CSV HEADER;

-- Exportar review_notifications
COPY (SELECT * FROM review_notifications) TO STDOUT WITH CSV HEADER;

-- Exportar financial_transactions
COPY (SELECT * FROM financial_transactions) TO STDOUT WITH CSV HEADER;
```

Salve cada resultado em um arquivo CSV.

### **PASSO 3: Importar no banco NOVO**

No banco NOVO (https://foffmjqekmeogsldehbr.supabase.co):

1. Vá em **Table Editor**
2. Selecione cada tabela
3. Clique em **Insert** → **Import data** → **From CSV**
4. Faça upload do CSV correspondente

---

## 🎯 MÉTODO ALTERNATIVO: Copiar dados manualmente

Se você tem poucos dados (parece que tem ~544 registros), pode:

1. **Exportar cada tabela como JSON** do banco atual
2. **Importar via API** no banco novo

---

## ⚠️ SITUAÇÃO ATUAL

**Dados já migrados com sucesso:**
- ✅ `cost_centers`: 3 registros

**Dados com erro (mas tabelas existem):**
- ⚠️ `equipments`: 25 registros (erro de FK)
- ⚠️ `contracts`: 6 registros (erro de NOT NULL)
- ⚠️ `orders`: 2 registros (erro de FK)
- ⚠️ `employee_documents`: 12 registros (erro de NOT NULL)
- ⚠️ `contract_documents`: 8 registros (erro de FK)
- ⚠️ `review_notifications`: 18 registros (erro de FK)
- ⚠️ `financial_transactions`: 470 registros (erro de FK)

**Total a migrar:** ~541 registros restantes

---

## 💡 RECOMENDAÇÃO FINAL

Dado que:
1. São poucos registros (~544 total)
2. A migração automática está com problemas de constraints
3. Você já tem o banco novo estruturado

**Sugiro:**

### **Opção A: Usar o app para popular o novo banco**
1. Atualize o `.env` para o novo banco
2. Use o app para criar os dados novamente
3. Mais trabalhoso, mas garante consistência

### **Opção B: Exportar/Importar via CSV**
1. Exporte cada tabela do banco atual como CSV
2. Importe no banco novo via Table Editor
3. Mais rápido, mas precisa ajustar dados manualmente

### **Opção C: Continuar com script (última tentativa)**
Posso criar um script que:
1. Desabilita TODAS as validações
2. Insere os dados
3. Reabilita validações
4. Corrige dados inconsistentes

---

## ❓ O QUE VOCÊ PREFERE?

1. **Tentar Opção C** (script mais robusto)?
2. **Ir para Opção B** (CSV manual)?
3. **Aceitar Opção A** (recriar dados no app)?

Me diga qual caminho você quer seguir! 🤔
