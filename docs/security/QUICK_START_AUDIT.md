# 🚀 Guia Rápido - Auditoria RLS

## ⚡ INÍCIO RÁPIDO (5 min)

### **Passo 1: Descobrir Estrutura (2 min)**

No SQL Editor do Supabase, execute:

```sql
-- Descobrir nome das colunas
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders'
    )
ORDER BY table_name, ordinal_position;
```

**Procure por:**
- Coluna que armazena o centro de custo (pode ser: `center`, `cost_center`, `centro`, etc.)
- Anote o nome exato

---

### **Passo 2: Verificar RLS Ativo (1 min)**

```sql
SELECT 
    tablename,
    rowsecurity as "RLS Ativo"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    );
```

**Resultado esperado:** Todas as tabelas com `rowsecurity = true`

**Se alguma estiver `false`:**
```sql
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

---

### **Passo 3: Verificar Políticas (1 min)**

```sql
SELECT 
    tablename as "Tabela",
    policyname as "Política",
    cmd as "Operação"
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders'
    )
ORDER BY tablename;
```

**Resultado esperado:** Cada tabela deve ter pelo menos 2 políticas (SELECT e INSERT)

---

### **Passo 4: Verificar Storage (1 min)**

```sql
-- Verificar se buckets são privados
SELECT 
    name as "Bucket",
    public as "É Público?"
FROM storage.buckets;
```

**Resultado esperado:** Todos os buckets com `public = false`

**Se algum estiver público:**
```sql
UPDATE storage.buckets 
SET public = false 
WHERE name = 'nome_do_bucket';
```

---

## ✅ CHECKLIST RÁPIDO

- [ ] RLS ativo em todas as tabelas
- [ ] Todas as tabelas têm políticas
- [ ] Buckets são privados
- [ ] Políticas de storage configuradas

---

## 🚨 SE ENCONTRAR PROBLEMAS

### **Problema: Tabela sem RLS**
```sql
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

### **Problema: Tabela sem políticas**
```sql
-- Exemplo para financial_transactions
-- (AJUSTE o nome da coluna 'center' se for diferente)

CREATE POLICY "Users view own center"
ON financial_transactions FOR SELECT
USING (
    center = (SELECT center FROM user_permissions WHERE user_id = auth.uid())
);

CREATE POLICY "Users insert own center"
ON financial_transactions FOR INSERT
WITH CHECK (
    center = (SELECT center FROM user_permissions WHERE user_id = auth.uid())
);
```

### **Problema: Bucket público**
```sql
UPDATE storage.buckets SET public = false WHERE name = 'documents';
```

---

## 📊 RESULTADO ESPERADO

Após executar todos os passos:

```
✅ 6 tabelas com RLS ativo
✅ 12+ políticas configuradas
✅ 0 buckets públicos
✅ Isolamento entre centros funcionando
```

---

## 🎯 PRÓXIMO PASSO

Após aprovar a auditoria:
1. ✅ Marcar como concluído
2. ✅ Testar APK Android
3. ✅ Configurar Sentry

**Tempo total:** ~5-10 minutos ⚡
