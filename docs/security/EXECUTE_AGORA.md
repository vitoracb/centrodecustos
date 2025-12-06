# ⚡ EXECUTE AGORA - Auditoria RLS (10 min)

## 🎯 INSTRUÇÕES SIMPLES

### **1. Abra o arquivo:**
`docs/security/rls-audit-WORKING.sql`

### **2. No Supabase SQL Editor, execute NA ORDEM:**

---

## ✅ **SEÇÃO 1-5: Verificar Configuração (5 min)**

Execute as seções 1, 2, 3, 4 e 5 **como ADMIN**.

**Resultados esperados:**

**Seção 1:** Todas as 6 tabelas com `RLS Ativo = true`
```
✅ financial_transactions - Protegido
✅ equipments - Protegido  
✅ employees - Protegido
✅ contracts - Protegido
✅ orders - Protegido
✅ user_permissions - Protegido
```

**Seção 2:** Lista de políticas (deve ter várias)

**Seção 3:** Nenhuma tabela sem política (resultado vazio = bom!)

**Seção 4:** Todos os buckets com `É Público? = false`

**Seção 5:** Checklist resumido
```
✅ 1. RLS Ativo - APROVADO - 6/6 tabelas
✅ 2. Políticas RLS - APROVADO - 6/6 tabelas  
✅ 3. Storage Privado - APROVADO - Nenhum bucket público
```

---

## 🔒 **SEÇÃO 6-9: Testar Isolamento (5 min)**

**IMPORTANTE:** Execute como **usuário NORMAL** (não admin)

1. Crie usuário teste (se não tiver):
   - Email: `teste.valenca@nowtrading.com`
   - Em `user_permissions`: center = `valenca`, role = `user`

2. Faça login no app com esse usuário

3. No SQL Editor (ainda logado como admin), execute seções 6, 7, 8, 9

**Resultados esperados:**
```
✅ Financial Transactions - 0 registros - ISOLAMENTO OK
✅ Equipments - 0 registros - ISOLAMENTO OK
✅ Employees - 0 registros - ISOLAMENTO OK
✅ Contracts - 0 registros - ISOLAMENTO OK
```

---

## 🎉 **SEÇÃO 10: Checklist Final**

Execute a seção 10.

**Resultado esperado:**
```
🎉 STATUS FINAL: APROVADO - PRONTO PARA PRODUÇÃO
```

---

## ⚠️ **SE DER ERRO:**

### **Erro: Tabela sem RLS**
```sql
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

### **Erro: Tabela sem políticas**
Use a seção 11 do arquivo `rls-audit-WORKING.sql`

### **Erro: Bucket público**
```sql
UPDATE storage.buckets SET public = false WHERE name = 'documents';
```

### **Erro: Vazamento de dados (vê outros centros)**
Verifique as políticas RLS da tabela que está vazando.

---

## ✅ **APÓS APROVAR:**

1. ✅ Marcar auditoria como concluída
2. ✅ Aguardar build Android terminar
3. ✅ Testar APK
4. ✅ Configurar Sentry
5. ✅ Publicar na Play Store

**Tempo total:** ~10 minutos ⚡

---

## 📊 **RELATÓRIO:**

Após executar, preencha:

- Data: ___________
- Status: [ ] APROVADO  [ ] REPROVADO
- Problemas encontrados: ___________
- Correções aplicadas: ___________

---

**Arquivo a executar:** `docs/security/rls-audit-WORKING.sql`

**Boa sorte! 🚀**
