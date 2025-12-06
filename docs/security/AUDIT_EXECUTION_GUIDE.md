# 🚀 Guia de Execução - Auditoria RLS
**Tempo estimado: 15 minutos**

---

## 📋 PREPARAÇÃO

### **Você vai precisar:**
1. ✅ Acesso ao Supabase Dashboard
2. ✅ Usuário admin (para ver todas as configurações)
3. ✅ Usuário teste normal (para testar isolamento)

---

## ⚡ EXECUÇÃO PASSO A PASSO

### **PASSO 1: Verificar Configuração Básica (5 min)**

Abra o SQL Editor no Supabase e execute:

#### **1.1 - Verificar RLS Ativo**
```sql
SELECT 
    tablename as "Tabela",
    rowsecurity as "RLS Ativo",
    CASE 
        WHEN rowsecurity = true THEN '✅ Protegido'
        ELSE '⚠️ VULNERÁVEL'
    END as "Status"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    )
ORDER BY tablename;
```

**✅ Resultado esperado:** Todas as 6 tabelas com `RLS Ativo = true`

**⚠️ Se alguma estiver `false`:**
```sql
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

---

#### **1.2 - Verificar Políticas**
```sql
SELECT 
    tablename as "Tabela",
    COUNT(*) as "Número de Políticas"
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions',
        'equipments',
        'employees',
        'contracts',
        'orders',
        'user_permissions'
    )
GROUP BY tablename
ORDER BY tablename;
```

**✅ Resultado esperado:** Cada tabela com pelo menos 2-4 políticas

**⚠️ Se alguma tabela não aparecer:** Ela não tem políticas! (CRÍTICO)

---

#### **1.3 - Verificar Storage**
```sql
SELECT 
    name as "Bucket",
    public as "É Público?",
    CASE 
        WHEN public = true THEN '⚠️ VULNERÁVEL'
        ELSE '✅ Seguro'
    END as "Status"
FROM storage.buckets;
```

**✅ Resultado esperado:** Todos os buckets com `public = false`

**⚠️ Se algum estiver público:**
```sql
UPDATE storage.buckets SET public = false WHERE name = 'nome_do_bucket';
```

---

### **PASSO 2: Testar Isolamento (10 min)**

**IMPORTANTE:** Faça logout do admin e login com um usuário NORMAL de teste.

#### **2.1 - Criar Usuário de Teste (se não tiver)**

No Supabase Dashboard:
1. Vá em **Authentication** → **Users**
2. Clique em **Add user**
3. Crie:
   - Email: `teste.valenca@nowtrading.com`
   - Password: `Teste123!`
4. Vá em **Table Editor** → `user_permissions`
5. Adicione permissão:
   - `user_id`: ID do usuário criado
   - `center`: `valenca`
   - `role`: `user`

---

#### **2.2 - Fazer Login como Usuário Teste**

1. Abra o app no celular/emulador
2. Faça login com: `teste.valenca@nowtrading.com`
3. Verifique que está vendo apenas dados de Valença

---

#### **2.3 - Testar Isolamento no SQL Editor**

**IMPORTANTE:** Execute isso logado como o usuário teste (não admin)

```sql
-- Teste 1: Tentar ver transações de OUTROS centros
SELECT 
    '🔒 Teste: Financial Transactions' as "Teste",
    COUNT(*) as "Registros de outros centros",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ISOLAMENTO OK'
        ELSE '⚠️ VAZAMENTO DE DADOS!'
    END as "Resultado"
FROM financial_transactions
WHERE cost_center_id != (
    SELECT center FROM user_permissions WHERE user_id = auth.uid()
);
```

**✅ Resultado esperado:** `0 registros de outros centros` e `✅ ISOLAMENTO OK`

**⚠️ Se mostrar registros:** PROBLEMA DE SEGURANÇA CRÍTICO!

---

```sql
-- Teste 2: Tentar ver equipamentos de OUTROS centros
SELECT 
    '🔒 Teste: Equipments' as "Teste",
    COUNT(*) as "Registros de outros centros",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ISOLAMENTO OK'
        ELSE '⚠️ VAZAMENTO!'
    END as "Resultado"
FROM equipments
WHERE cost_center_id != (
    SELECT center FROM user_permissions WHERE user_id = auth.uid()
);
```

**✅ Resultado esperado:** `0 registros`

---

```sql
-- Teste 3: Tentar INSERIR em outro centro (DEVE FALHAR)
INSERT INTO financial_transactions (
    type,
    description,
    value,
    date,
    cost_center_id
) VALUES (
    'expense',
    'TESTE DE INVASÃO',
    999.99,
    CURRENT_DATE,
    'cna'  -- Centro diferente do usuário teste
);
```

**✅ Resultado esperado:** **ERRO de permissão** (não consegue inserir)

**⚠️ Se inserir com sucesso:** PROBLEMA DE SEGURANÇA CRÍTICO!

---

### **PASSO 3: Checklist Final (2 min)**

Execute o checklist completo:

```sql
SELECT 
    'CHECKLIST DE SEGURANÇA' as "Item",
    'Status' as "Resultado"

UNION ALL

SELECT 
    '1. RLS Ativo em 6 tabelas',
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ APROVADO'
        ELSE '⚠️ REPROVADO - ' || (6 - COUNT(*))::text || ' tabelas sem RLS'
    END
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions', 'equipments', 'employees',
        'contracts', 'orders', 'user_permissions'
    )
    AND rowsecurity = true

UNION ALL

SELECT 
    '2. Todas as tabelas têm políticas',
    CASE 
        WHEN COUNT(DISTINCT tablename) = 6 THEN '✅ APROVADO'
        ELSE '⚠️ REPROVADO - ' || (6 - COUNT(DISTINCT tablename))::text || ' sem políticas'
    END
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'financial_transactions', 'equipments', 'employees',
        'contracts', 'orders', 'user_permissions'
    )

UNION ALL

SELECT 
    '3. Storage buckets privados',
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ APROVADO'
        ELSE '⚠️ REPROVADO - ' || COUNT(*)::text || ' buckets públicos'
    END
FROM storage.buckets
WHERE public = true;
```

---

## ✅ CRITÉRIOS DE APROVAÇÃO

Para aprovar a auditoria, você DEVE ter:

- ✅ RLS ativo em todas as 6 tabelas
- ✅ Todas as tabelas com políticas configuradas
- ✅ Todos os buckets privados
- ✅ Teste de isolamento OK (0 registros de outros centros)
- ✅ Teste de inserção cross-center FALHOU (erro de permissão)

---

## 🚨 SE REPROVAR

### **Problema: Tabela sem RLS**
```sql
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

### **Problema: Tabela sem políticas**

Exemplo para `financial_transactions`:

```sql
-- Política de SELECT (visualização)
CREATE POLICY "Users view own center"
ON financial_transactions FOR SELECT
USING (
    cost_center_id = (
        SELECT center FROM user_permissions WHERE user_id = auth.uid()
    )
);

-- Política de INSERT (criação)
CREATE POLICY "Users insert own center"
ON financial_transactions FOR INSERT
WITH CHECK (
    cost_center_id = (
        SELECT center FROM user_permissions WHERE user_id = auth.uid()
    )
);

-- Política de UPDATE (atualização)
CREATE POLICY "Users update own center"
ON financial_transactions FOR UPDATE
USING (
    cost_center_id = (
        SELECT center FROM user_permissions WHERE user_id = auth.uid()
    )
);

-- Política de DELETE (exclusão)
CREATE POLICY "Users delete own center"
ON financial_transactions FOR DELETE
USING (
    cost_center_id = (
        SELECT center FROM user_permissions WHERE user_id = auth.uid()
    )
);
```

**Repita para outras tabelas**, ajustando o nome da tabela.

### **Problema: Bucket público**
```sql
UPDATE storage.buckets SET public = false WHERE name = 'documents';
```

### **Problema: Vazamento de dados**

Se o teste de isolamento mostrar registros de outros centros:

1. Verifique se as políticas RLS estão corretas
2. Verifique se a coluna `cost_center_id` está sendo usada
3. Verifique se o usuário tem permissão correta em `user_permissions`
4. Re-execute os testes após corrigir

---

## 📊 RELATÓRIO FINAL

Após completar todos os testes, preencha:

### **Auditoria de Segurança RLS**
- Data: ___________
- Auditor: ___________
- Duração: ___________

### **Resultados:**
- [ ] RLS ativo em todas as tabelas
- [ ] Todas as tabelas têm políticas
- [ ] Storage privado
- [ ] Isolamento entre centros OK
- [ ] Teste de inserção cross-center bloqueado

### **Status Final:**
- [ ] ✅ **APROVADO** - Pronto para produção
- [ ] ⚠️ **APROVADO COM RESSALVAS** - Pequenas correções necessárias
- [ ] ❌ **REPROVADO** - Problemas críticos encontrados

### **Problemas Encontrados:**
1. ___________
2. ___________

### **Correções Aplicadas:**
1. ___________
2. ___________

---

## 🎯 PRÓXIMO PASSO

Após **APROVAR** a auditoria:

1. ✅ Marcar auditoria como concluída
2. ✅ Testar APK Android (quando build terminar)
3. ✅ Configurar Sentry (30 min)
4. ✅ Publicar na Play Store

**Tempo total da auditoria:** ~15 minutos ⚡

---

## 📞 SUPORTE

Se encontrar problemas:
- Documentação Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Script completo: `docs/security/rls-audit-FINAL.sql`
