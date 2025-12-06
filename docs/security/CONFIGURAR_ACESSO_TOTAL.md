# 🔓 Configurar Acesso Total para Todos os Usuários

## 🎯 Objetivo
Permitir que **todos os usuários autenticados** vejam e gerenciem **todos os centros de custo**.

---

## ⚡ EXECUÇÃO (2 minutos)

### **1. Abra o arquivo:**
`docs/security/configure-rls-permissive.sql`

### **2. Execute TODO o arquivo no Supabase SQL Editor**

Clique em **Run** para executar tudo de uma vez.

---

## ✅ O que o script faz:

### **PASSO 1: Ativa RLS em todas as tabelas**
- Garante que apenas usuários autenticados tenham acesso
- Protege contra acesso não autorizado

### **PASSO 2: Remove políticas antigas**
- Remove qualquer política restritiva anterior
- Limpa configurações antigas

### **PASSO 3: Cria políticas permissivas**
- **SELECT:** Usuários autenticados veem TUDO
- **INSERT:** Usuários autenticados criam em QUALQUER centro
- **UPDATE:** Usuários autenticados editam TUDO
- **DELETE:** Usuários autenticados excluem TUDO

### **PASSO 4: Torna storage privado**
- Apenas usuários autenticados acessam arquivos
- Protege documentos

### **PASSO 5: Verifica configuração**
- Mostra status final
- Confirma que tudo está correto

---

## 📊 Resultado Esperado

Após executar o script:

```
✅ RLS ativo em 6 tabelas
✅ 24 políticas criadas (4 por tabela)
✅ Todos os buckets privados
✅ Usuários autenticados veem TODOS os centros
✅ Usuários não autenticados não veem nada
```

---

## 🧪 Como Testar

1. **Faça login no app** com qualquer usuário
2. **Verifique que vê todos os centros:**
   - Valença
   - CNA
   - Cabrália
3. **Troque de centro** no dropdown
4. **Crie/edite dados** em qualquer centro
5. **Tudo deve funcionar!** ✅

---

## 🔒 Segurança

### **O que está protegido:**
- ✅ Apenas usuários **autenticados** têm acesso
- ✅ Usuários **não autenticados** não veem nada
- ✅ Storage **privado** (precisa estar logado)

### **O que NÃO está protegido:**
- ⚠️ Qualquer usuário autenticado vê **todos** os centros
- ⚠️ Qualquer usuário autenticado pode **criar/editar/excluir** em qualquer centro
- ⚠️ Não há isolamento entre centros

### **Isso é OK?**
✅ **SIM**, se todos os usuários são **internos** e **confiáveis**  
❌ **NÃO**, se você tem usuários externos ou quer restringir acesso por centro

---

## 🎯 Próximos Passos

Após executar o script:

1. ✅ Testar no app (2 min)
2. ✅ Confirmar que funciona
3. ✅ Testar APK Android
4. ✅ Configurar Sentry
5. ✅ Publicar na Play Store

**Tempo total:** ~2 minutos ⚡

---

## 📞 Dúvidas?

**Arquivo:** `docs/security/configure-rls-permissive.sql`

**Execute tudo de uma vez e pronto!** 🚀
