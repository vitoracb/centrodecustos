# ✅ CHECKLIST DE CONFERÊNCIA - BUGS CORRIGIDOS

**Data:** 06/12/2025  
**Versão:** 1.0.0  
**Build:** Desenvolvimento (Expo Go)  
**Testador:** _______________

---

## 📋 **INSTRUÇÕES**

1. Abra o app no emulador/dispositivo
2. Teste cada item da lista
3. Marque ✅ se funcionar ou ❌ se não funcionar
4. Anote observações se necessário

---

## 🔴 **BUG #001 - PERSISTÊNCIA DE SESSÃO**

**Status da correção:** ✅ Corrigido  
**Arquivo modificado:** `src/lib/supabaseClient.ts`  
**Tempo estimado:** 2 minutos

### **Teste:**

1. **[ ] Fazer login**
   - Abrir o app
   - Inserir credenciais válidas
   - Clicar em "Entrar"
   - **Resultado esperado:** Login bem-sucedido, redireciona para Dashboard

2. **[ ] Fechar o app completamente**
   - Swipe up no emulador (ou fechar app)
   - Aguardar 5 segundos
   - **Resultado esperado:** App fechado

3. **[ ] Reabrir o app**
   - Abrir o app novamente
   - **Resultado esperado:** ✅ **DEVE PERMANECER LOGADO** (vai direto para Dashboard)
   - **Antes da correção:** ❌ Voltava para tela de login

### **Resultado:**
- [ ] ✅ **APROVADO** - Permanece logado
- [ ] ❌ **REPROVADO** - Volta para tela de login

### **Observações:**
```
_______________________________________________
_______________________________________________
```

---

## 🟡 **BUG #002 - RECEITAS FIXAS NÃO FUNCIONAM**

**Status da correção:** ✅ Corrigido  
**Arquivo modificado:** `src/context/FinancialContext.tsx`  
**Tempo estimado:** 5 minutos

### **Teste 1: Criar receita fixa**

1. **[ ] Ir para aba "Receitas"**
   - Navegar para aba "Receitas"
   - **Resultado esperado:** Lista de receitas aparece

2. **[ ] Criar nova receita fixa**
   - Clicar em "+" ou "Nova Receita"
   - Preencher nome: "Teste Receita Fixa"
   - Preencher valor: R$ 1.000,00
   - **Marcar checkbox "Receita fixa"** ✅
   - Preencher duração: 3 meses
   - Clicar em "Salvar"
   - **Resultado esperado:** Receita criada com sucesso

3. **[ ] Verificar parcelas geradas**
   - Voltar para lista de receitas
   - **Resultado esperado:** ✅ **DEVE APARECER 3 RECEITAS** (1 por mês)
   - **Antes da correção:** ❌ Aparecia apenas 1 receita

4. **[ ] Verificar datas das parcelas**
   - Verificar as datas das 3 receitas
   - **Resultado esperado:** Datas em meses consecutivos
   - Exemplo: 06/12/2025, 06/01/2026, 06/02/2026

### **Teste 2: Editar receita fixa**

5. **[ ] Editar receita fixa**
   - Clicar em uma das receitas fixas criadas
   - Clicar em "Editar"
   - **Resultado esperado:** ✅ **Checkbox "Receita fixa" DEVE ESTAR MARCADO**
   - **Antes da correção:** ❌ Checkbox aparecia desmarcado

6. **[ ] Verificar duração**
   - Verificar campo "Duração (meses)"
   - **Resultado esperado:** ✅ **DEVE MOSTRAR "3"**
   - **Antes da correção:** ❌ Campo vazio

### **Resultado:**
- [ ] ✅ **APROVADO** - Receitas fixas funcionam perfeitamente
- [ ] ⚠️ **PARCIAL** - Funciona mas tem problemas (descrever abaixo)
- [ ] ❌ **REPROVADO** - Não funciona

### **Observações:**
```
_______________________________________________
_______________________________________________
```

---

## 🟢 **BUG #003 - SELEÇÃO TIPO DOCUMENTO**

**Status da correção:** ✅ Já corrigido em sessão anterior  
**Arquivo modificado:** `src/screens/FinanceiroScreen.tsx`  
**Tempo estimado:** 3 minutos

### **Teste:**

1. **[ ] Ir para uma despesa**
   - Criar ou abrir uma despesa existente
   - Clicar em "Adicionar documento"

2. **[ ] Verificar modal de seleção**
   - **Resultado esperado:** ✅ **DEVE APARECER MODAL COM 4 OPÇÕES:**
     - [ ] Nota Fiscal
     - [ ] Recibo
     - [ ] Comprovante
     - [ ] Boleto
   - **Antes da correção:** ❌ Ia direto para seletor de arquivo

3. **[ ] Selecionar tipo e adicionar documento**
   - Selecionar um tipo (ex: Nota Fiscal)
   - Escolher arquivo
   - **Resultado esperado:** Documento adicionado com tipo correto

### **Resultado:**
- [ ] ✅ **APROVADO** - Modal aparece com 4 opções
- [ ] ❌ **REPROVADO** - Não aparece modal

### **Observações:**
```
_______________________________________________
_______________________________________________
```

---

## 🟢 **BUG #004 - BOTÃO REJEITAR PEDIDOS**

**Status da correção:** ✅ Já existia no código  
**Arquivo:** `src/screens/PedidosScreen.tsx`  
**Tempo estimado:** 2 minutos

### **Teste:**

1. **[ ] Ir para aba "Pedidos"**
   - Navegar para aba "Pedidos"
   - **Resultado esperado:** Lista de pedidos aparece

2. **[ ] Encontrar pedido com orçamento enviado**
   - Procurar pedido com status "Orçamento enviado"
   - OU criar novo pedido e enviar orçamento
   - **Resultado esperado:** Pedido com status "Orçamento enviado"

3. **[ ] Verificar botão "Rejeitar"**
   - Olhar nos botões do card do pedido
   - **Resultado esperado:** ✅ **DEVE TER BOTÃO "REJEITAR"** (vermelho, com X)
   - **Localização:** Entre "Detalhes" e "Excluir"

4. **[ ] Testar botão rejeitar**
   - Clicar em "Rejeitar"
   - Confirmar ação
   - **Resultado esperado:** Status muda para "Orçamento reprovado"

### **Resultado:**
- [ ] ✅ **APROVADO** - Botão rejeitar aparece e funciona
- [ ] ⚠️ **PARCIAL** - Botão aparece mas não funciona
- [ ] ❌ **REPROVADO** - Botão não aparece

### **Observações:**
```
_______________________________________________
_______________________________________________
```

---

## 🟢 **BUG #005 - FEEDBACK OFFLINE**

**Status da correção:** ✅ Corrigido  
**Arquivo modificado:** `src/context/FinancialContext.tsx`  
**Tempo estimado:** 3 minutos

### **Teste 1: Despesa offline**

1. **[ ] Desativar conexão**
   - Desligar WiFi no emulador
   - Ou ativar modo avião
   - **Resultado esperado:** Sem conexão com internet

2. **[ ] Tentar criar despesa**
   - Ir para aba "Despesas"
   - Clicar em "Nova Despesa"
   - Preencher dados
   - Clicar em "Salvar"
   - **Resultado esperado:** ✅ **DEVE APARECER MENSAGEM:**
     - Título: "Sem conexão"
     - Mensagem: "Não foi possível salvar a despesa. Verifique sua conexão..."
   - **Antes da correção:** ❌ Nenhuma mensagem aparecia

### **Teste 2: Receita offline**

3. **[ ] Tentar criar receita**
   - Ir para aba "Receitas"
   - Clicar em "Nova Receita"
   - Preencher dados
   - Clicar em "Salvar"
   - **Resultado esperado:** ✅ **DEVE APARECER MENSAGEM:**
     - Título: "Sem conexão"
     - Mensagem: "Não foi possível salvar a receita. Verifique sua conexão..."

4. **[ ] Reativar conexão e testar**
   - Ligar WiFi novamente
   - Criar despesa/receita
   - **Resultado esperado:** Salva normalmente, sem erro

### **Resultado:**
- [ ] ✅ **APROVADO** - Mensagens de erro aparecem
- [ ] ⚠️ **PARCIAL** - Mensagem aparece mas texto errado
- [ ] ❌ **REPROVADO** - Nenhuma mensagem aparece

### **Observações:**
```
_______________________________________________
_______________________________________________
```

---

## 📊 **RESULTADO FINAL**

### **Contagem:**
```
Total de bugs testados: 5
Bugs aprovados: ___
Bugs reprovados: ___
Taxa de sucesso: ____%
```

### **Resumo por bug:**
```
Bug #001 (Persistência): [ ] ✅ [ ] ❌
Bug #002 (Receitas fixas): [ ] ✅ [ ] ❌
Bug #003 (Tipo documento): [ ] ✅ [ ] ❌
Bug #004 (Botão rejeitar): [ ] ✅ [ ] ❌
Bug #005 (Feedback offline): [ ] ✅ [ ] ❌
```

### **Critério de aprovação:**
- ✅ **100%** (5/5) = Pronto para build ⭐⭐⭐
- ⚠️ **80%+** (4/5) = Corrigir bug reprovado e testar novamente
- ❌ **< 80%** (< 4/5) = Revisar correções

---

## 🐛 **NOVOS BUGS ENCONTRADOS**

Se encontrar novos bugs durante o teste, anote aqui:

### **Novo Bug #1:**
```
Descrição: _______________________________________________
Severidade: [ ] Crítico [ ] Importante [ ] Nice to have
Passos para reproduzir:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
```

### **Novo Bug #2:**
```
Descrição: _______________________________________________
Severidade: [ ] Crítico [ ] Importante [ ] Nice to have
Passos para reproduzir:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
```

---

## ✅ **DECISÃO FINAL**

- [ ] **APROVADO** - Todos os bugs corrigidos, pronto para build
- [ ] **APROVADO COM RESSALVAS** - Maioria corrigida, build pode prosseguir
- [ ] **REPROVADO** - Bugs não corrigidos, precisa revisar código

**Testado por:** _______________  
**Data:** ___/___/___  
**Hora:** ___:___  
**Ambiente:** [ ] Expo Go [ ] Emulador [ ] Dispositivo físico

---

## 🚀 **PRÓXIMOS PASSOS**

### **Se APROVADO:**
```bash
# 1. Fazer commit
git add .
git commit -m "fix: corrige bugs do smoke test (#001, #002, #005)"

# 2. Fazer novo build
eas build --platform android --profile preview

# 3. Testar APK no emulador
# 4. Distribuir para testadores
```

### **Se REPROVADO:**
```
1. Anotar bugs que não funcionaram
2. Informar desenvolvedor
3. Aguardar correção
4. Testar novamente
```

---

## 📝 **OBSERVAÇÕES GERAIS**

```
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
```

---

**Boa sorte nos testes!** 🍀
