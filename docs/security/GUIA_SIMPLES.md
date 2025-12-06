# ⚡ GUIA SIMPLES - Auditoria RLS (5 min)

## 🎯 EXECUTE ESTAS 6 QUERIES

Use o arquivo: **`rls-audit-SAFE.sql`**

---

### **1. Descobrir estrutura das tabelas**
Execute o **PASSO 1** do arquivo.

Anote os nomes das colunas que armazenam o centro de custo.

---

### **2. Verificar RLS ativo**
Execute a **SEÇÃO 1**.

**Esperado:** 6 tabelas com `✅ Protegido`

**Se alguma estiver vulnerável:**
```sql
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

---

### **3. Verificar políticas**
Execute a **SEÇÃO 2**.

**Esperado:** Todas as 6 tabelas aparecem com políticas

**Se alguma não aparecer:** Ela não tem políticas (problema!)

---

### **4. Ver detalhes das políticas**
Execute a **SEÇÃO 3**.

Apenas para conferir se as políticas fazem sentido.

---

### **5. Verificar storage**
Execute a **SEÇÃO 5**.

**Esperado:** Todos os buckets com `✅ Seguro`

**Se algum estiver público:**
```sql
UPDATE storage.buckets SET public = false WHERE name = 'nome_do_bucket';
```

---

### **6. Checklist final**
Execute a **SEÇÃO 6**.

**Esperado:**
```
✅ RLS Ativo - 6/6 tabelas - OK
✅ Políticas RLS - 6/6 tabelas - OK
✅ Storage Privado - Nenhum bucket público - OK
```

---

## 🧪 TESTE MANUAL NO APP

**Não precisa fazer queries SQL complicadas!**

1. Crie usuário teste: `teste.valenca@nowtrading.com`
2. Adicione em `user_permissions` com center = `valenca`
3. Faça login no APP com esse usuário
4. Verifique:
   - ✅ Vê apenas dados de Valença?
   - ✅ Cria apenas em Valença?
   - ✅ Não vê dados de CNA ou Cabrália?

**Se conseguir ver outros centros = PROBLEMA!**

---

## ✅ APROVAÇÃO

Para aprovar, você precisa:

- ✅ RLS ativo em 6 tabelas
- ✅ Políticas em 6 tabelas
- ✅ Storage privado
- ✅ Teste manual OK (vê apenas seu centro)

---

## 🎉 PRONTO!

**Tempo total:** ~5 minutos

**Próximo passo:** Testar APK Android

---

**Arquivo:** `docs/security/rls-audit-SAFE.sql`
