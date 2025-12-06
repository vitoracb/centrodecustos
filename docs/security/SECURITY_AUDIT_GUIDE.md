# 🔒 Guia de Auditoria de Segurança RLS

## 📋 Checklist de Auditoria

### ✅ Pré-requisitos
- [ ] Acesso ao Supabase Dashboard
- [ ] Credenciais de admin
- [ ] Credenciais de usuário teste (não-admin)

---

## 🚀 PASSO A PASSO

### **1. Conectar ao Supabase (5 min)**

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto: `nowtrading-centrodecustos`
3. Vá em: **SQL Editor** (menu lateral)

---

### **2. Executar Queries de Auditoria (30 min)**

#### **2.1 Verificar RLS Ativo**
```sql
-- Cole e execute a seção 1 do arquivo rls-audit.sql
-- Resultado esperado: Todas as tabelas com "✅ Protegido"
```

**⚠️ Se encontrar "VULNERÁVEL":**
```sql
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

---

#### **2.2 Listar Políticas RLS**
```sql
-- Cole e execute a seção 2 do arquivo rls-audit.sql
-- Verifique se todas as tabelas críticas têm políticas
```

**Tabelas críticas que DEVEM ter políticas:**
- ✅ `financial_transactions`
- ✅ `equipments`
- ✅ `employees`
- ✅ `contracts`
- ✅ `orders`
- ✅ `user_permissions`
- ✅ `audit_logs`

---

#### **2.3 Verificar Tabelas Sem Políticas**
```sql
-- Cole e execute a seção 3 do arquivo rls-audit.sql
-- Resultado esperado: 0 tabelas sem políticas
```

**⚠️ Se encontrar tabelas sem políticas:**
- Avalie se a tabela precisa de RLS
- Crie políticas apropriadas (exemplos no final do rls-audit.sql)

---

#### **2.4 Verificar Políticas por Tabela**
```sql
-- Cole e execute a seção 4 do arquivo rls-audit.sql
-- Verifique se as políticas fazem sentido para cada operação
```

**Políticas esperadas por tabela:**

**Financial Transactions:**
- ✅ SELECT: Usuário vê apenas seu centro
- ✅ INSERT: Usuário insere apenas em seu centro
- ✅ UPDATE: Usuário atualiza apenas seu centro
- ✅ DELETE: Apenas admin ou usuário com permissão

**Equipments:**
- ✅ SELECT: Usuário vê apenas seu centro
- ✅ INSERT: Usuário insere apenas em seu centro
- ✅ UPDATE: Usuário atualiza apenas seu centro
- ✅ DELETE: Apenas admin

**Employees:**
- ✅ SELECT: Usuário vê apenas seu centro
- ✅ INSERT: Apenas admin
- ✅ UPDATE: Apenas admin
- ✅ DELETE: Apenas admin

---

### **3. Testar Isolamento Entre Centros (30 min)**

#### **3.1 Preparar Teste**
1. Crie um usuário teste (se não tiver):
   - Email: `teste.valenca@nowtrading.com`
   - Centro: `valenca`
   - Permissões: Usuário normal (não admin)

2. Faça login com esse usuário no app

#### **3.2 Executar Testes**

**Teste 1: Acesso Cross-Center**
```sql
-- No SQL Editor, autenticado como usuário teste
SELECT 
    'Teste: Acesso Cross-Center' as teste,
    COUNT(*) as registros_visiveis,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Isolamento OK'
        ELSE '⚠️ VAZAMENTO DE DADOS'
    END as status
FROM financial_transactions
WHERE center != 'valenca'; -- Centro do usuário teste
```

**Resultado esperado:** `0 registros_visiveis` e `✅ Isolamento OK`

**Teste 2: Tentativa de Inserção Cross-Center**
```sql
-- Tentar inserir transação em outro centro
INSERT INTO financial_transactions (
    name, type, value, date, center, user_id
) VALUES (
    'Teste Invasão', 'expense', 100, '2025-12-05', 'cna', auth.uid()
);
-- Resultado esperado: ERRO de permissão
```

**Teste 3: Tentativa de Leitura de Equipamentos**
```sql
SELECT COUNT(*) 
FROM equipments 
WHERE center != 'valenca';
-- Resultado esperado: 0
```

---

### **4. Verificar Storage/Upload (15 min)**

#### **4.1 Verificar Buckets**
```sql
-- Cole e execute a seção 6.1 do arquivo rls-audit.sql
```

**Resultado esperado:**
- ✅ Todos os buckets devem ser PRIVADOS
- ⚠️ Se houver bucket público, corrija:

```sql
UPDATE storage.buckets 
SET public = false 
WHERE name = 'nome_do_bucket';
```

#### **4.2 Verificar Políticas de Storage**
```sql
-- Cole e execute a seção 6.2 do arquivo rls-audit.sql
```

**Políticas esperadas:**
- ✅ Usuário pode fazer upload apenas em sua pasta
- ✅ Usuário pode ler apenas arquivos de seu centro
- ✅ Usuário pode deletar apenas seus próprios uploads

**Exemplo de política correta:**
```sql
CREATE POLICY "Users can upload to own center folder"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = (
        SELECT center FROM user_permissions WHERE user_id = auth.uid()
    )
);
```

---

### **5. Verificar Auditoria (10 min)**

#### **5.1 Verificar Triggers de Auditoria**
```sql
-- Cole e execute a seção 7 do arquivo rls-audit.sql
```

**Resultado esperado:**
- ✅ Trigger de auditoria em todas as tabelas críticas
- ✅ Função `audit_log_changes()` existe e está ativa

#### **5.2 Testar Auditoria**
```sql
-- Fazer uma alteração e verificar se foi registrada
UPDATE financial_transactions 
SET name = 'Teste Auditoria' 
WHERE id = 'algum-id-valido';

-- Verificar se foi registrado
SELECT * FROM audit_logs 
WHERE table_name = 'financial_transactions' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

### **6. Executar Checklist Final (5 min)**

```sql
-- Cole e execute a seção 8 do arquivo rls-audit.sql
```

**Resultado esperado:**
```
✅ RLS Ativo em todas as tabelas
✅ Todas as tabelas têm políticas RLS
✅ Storage buckets privados
```

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### **Problema 1: Tabela sem RLS**
```sql
-- Solução:
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

### **Problema 2: Tabela sem políticas**
```sql
-- Solução: Criar políticas básicas
CREATE POLICY "Users view own center"
ON nome_da_tabela FOR SELECT
USING (center = (SELECT center FROM user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users insert own center"
ON nome_da_tabela FOR INSERT
WITH CHECK (center = (SELECT center FROM user_permissions WHERE user_id = auth.uid()));
```

### **Problema 3: Bucket público**
```sql
-- Solução:
UPDATE storage.buckets SET public = false WHERE name = 'nome_do_bucket';
```

### **Problema 4: Vazamento cross-center**
```sql
-- Solução: Revisar políticas RLS
-- Verificar se a condição WHERE está correta
-- Exemplo de política correta:
CREATE POLICY "Isolate by center"
ON tabela FOR ALL
USING (center = (SELECT center FROM user_permissions WHERE user_id = auth.uid()));
```

---

## 📊 RELATÓRIO DE AUDITORIA

Após executar todos os testes, preencha:

### **Resumo Executivo**
- Data da auditoria: ___________
- Auditor: ___________
- Duração: ___________

### **Resultados**
- [ ] RLS ativo em todas as tabelas
- [ ] Todas as tabelas têm políticas
- [ ] Isolamento entre centros OK
- [ ] Storage privado e protegido
- [ ] Auditoria funcionando
- [ ] Sem vazamentos de dados

### **Problemas Encontrados**
1. ___________
2. ___________
3. ___________

### **Ações Corretivas**
1. ___________
2. ___________
3. ___________

### **Status Final**
- [ ] ✅ APROVADO - Pronto para produção
- [ ] ⚠️ APROVADO COM RESSALVAS - Corrigir itens menores
- [ ] ❌ REPROVADO - Corrigir problemas críticos antes de produção

---

## 🎯 PRÓXIMOS PASSOS

Após aprovar a auditoria:
1. ✅ Documentar políticas RLS
2. ✅ Criar testes automatizados de segurança
3. ✅ Configurar monitoramento de acessos
4. ✅ Revisar auditoria mensalmente

---

## 📞 SUPORTE

Se encontrar problemas:
1. Consulte a documentação do Supabase: https://supabase.com/docs/guides/auth/row-level-security
2. Revise os exemplos em `rls-audit.sql`
3. Teste em ambiente de desenvolvimento primeiro
