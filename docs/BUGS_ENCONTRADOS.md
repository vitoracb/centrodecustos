# 🐛 BUGS ENCONTRADOS - SMOKE TEST

**Data:** 05/12/2025  
**Versão:** 1.0.0  
**Build:** 3657f81d-aef9-40ad-8561-9818650f6e5c  
**Testado por:** Vitor  
**Tipo de teste:** Smoke Test Híbrido (60 min)

---

## 📊 **RESUMO**

| Severidade | Quantidade | Status |
|------------|------------|--------|
| 🔴 Crítico | 0 | - |
| 🟡 Importante | 3 | Pendente |
| 🟢 Nice to have | 2 | Pendente |
| **Total** | **5** | - |

---

## 🟡 **BUGS IMPORTANTES**

### **BUG #001 - Persistência de sessão não funciona**

**Severidade:** 🟡 Importante  
**Status:** 🔴 Pendente  
**Prioridade:** Alta  
**Seção:** Autenticação  

**Descrição:**
Usuário não permanece logado ao fechar e reabrir o app. Precisa fazer login toda vez.

**Passos para reproduzir:**
1. Abrir o app
2. Fazer login com credenciais válidas
3. App redireciona para Dashboard (OK)
4. Fechar o app completamente (swipe up)
5. Reabrir o app
6. ❌ App volta para tela de login (deveria manter logado)

**Comportamento esperado:**
- Usuário permanece logado
- Token de autenticação é salvo localmente
- Ao reabrir, vai direto para Dashboard

**Comportamento atual:**
- Usuário é deslogado
- Precisa fazer login novamente
- Token não é persistido

**Impacto:**
- ⚠️ UX ruim - usuário precisa logar toda vez
- ⚠️ Inconveniente para uso diário
- ✅ Não bloqueia funcionalidades principais

**Bloqueia TestFlight?**
❌ **NÃO** - App é funcional, apenas inconveniente

**Possível causa:**
- Token não está sendo salvo no AsyncStorage
- Token não está sendo recuperado ao iniciar app
- Verificação de token ao iniciar não está funcionando

**Sugestão de correção:**
1. Verificar se `AsyncStorage.setItem('token')` está sendo chamado após login
2. Verificar se `AsyncStorage.getItem('token')` está sendo chamado ao iniciar
3. Adicionar logs para debug
4. Testar persistência do token

**Arquivos relacionados:**
- `src/context/AuthContext.tsx` (provável)
- `src/lib/supabase.ts` (provável)
- `app/_layout.tsx` (verificação inicial)

**Notas:**
- Login funciona perfeitamente ✅
- Logout funciona corretamente ✅
- Apenas a persistência que não funciona

---

### **BUG #002 - Receitas fixas não funcionam**

**Severidade:** 🟡 Importante  
**Status:** 🔴 Pendente  
**Prioridade:** Média  
**Seção:** Receitas CRUD  

**Descrição:**
Não é possível editar uma receita para torná-la fixa. Ao criar como fixa, não aparece como fixa e não gera parcelas. Ao editar, o checkbox não fica marcado.

**Passos para reproduzir:**
1. Ir para aba "Receitas"
2. Criar nova receita
3. Marcar checkbox "Receita fixa"
4. Preencher dados e salvar
5. ❌ Receita não aparece como fixa
6. ❌ Parcelas não são exibidas
7. Editar a receita
8. ❌ Checkbox não aparece marcado

**Comportamento esperado:**
- Checkbox "Receita fixa" deve funcionar
- Receita deve ser salva como fixa
- Parcelas devem ser geradas/exibidas
- Ao editar, checkbox deve aparecer marcado

**Comportamento atual:**
- Checkbox não persiste o estado
- Receita não é salva como fixa
- Parcelas não aparecem
- Ao editar, checkbox desmarcado

**Impacto:**
- ⚠️ Receitas recorrentes não funcionam
- ✅ CRUD básico funciona (criar/editar/deletar receitas simples)
- ✅ Não bloqueia funcionalidade principal

**Bloqueia TestFlight?**
❌ **NÃO** - Receitas simples funcionam perfeitamente

**Arquivos relacionados:**
- `src/screens/ReceitasScreen.tsx` (provável)
- `src/context/FinancialContext.tsx` (lógica de receitas fixas)

**Notas:**
- CRUD básico de receitas funciona ✅
- Apenas funcionalidade de receitas fixas não funciona

---

### **BUG #003 - Seleção de tipo de documento não aparece**

**Severidade:** 🟡 Importante  
**Status:** 🔴 Pendente  
**Prioridade:** Média  
**Seção:** Documentos  

**Descrição:**
Ao adicionar documento ou foto em uma despesa, o app não pergunta qual o tipo de documento (Nota Fiscal, Recibo, Comprovante, Boleto). Vai direto para seleção de arquivo ou câmera.

**Passos para reproduzir:**
1. Ir para uma despesa
2. Clicar em "Adicionar documento" ou "Adicionar foto"
3. ❌ App vai direto para arquivos ou pergunta "Álbum ou Câmera"
4. ❌ Não pergunta o tipo de documento antes

**Comportamento esperado:**
1. Clicar em "Adicionar documento"
2. ✅ Modal aparece perguntando tipo:
   - Nota Fiscal
   - Recibo
   - Comprovante
   - Boleto
3. Usuário seleciona o tipo
4. Depois abre seletor de arquivo/câmera

**Comportamento atual:**
- Pula etapa de seleção de tipo
- Vai direto para arquivo/câmera
- Tipo de documento não é especificado

**Impacto:**
- ⚠️ Documentos ficam sem tipo específico
- ⚠️ Dificulta organização e busca
- ✅ Upload funciona (apenas sem tipo)
- ✅ Não bloqueia funcionalidade principal

**Bloqueia TestFlight?**
❌ **NÃO** - Upload funciona, apenas falta especificar tipo

**Arquivos relacionados:**
- `src/screens/FinanceiroScreen.tsx` (função `handleAddExpenseDocument`)
- `src/components/ExpenseDocumentsModal.tsx`

**Notas:**
- Upload de documento funciona ✅
- Preview funciona ✅
- Deletar funciona ✅
- Apenas seleção de tipo que não aparece
- Este bug foi corrigido no iOS mas não no Android (conforme reportado anteriormente)

**Correção já implementada:**
- Código já foi corrigido em sessão anterior
- Precisa novo build para testar a correção

---

## 🔴 **BUGS CRÍTICOS**

*Nenhum bug crítico encontrado até o momento.*

---

## 🟢 **BUGS NICE TO HAVE**

### **BUG #004 - Botão "Rejeitar" faltando nos cards de pedidos**

**Severidade:** 🟢 Nice to have  
**Status:** 🔴 Pendente  
**Prioridade:** Baixa  
**Seção:** Pedidos  

**Descrição:**
No menu de pedidos, os cards não têm botão para rejeitar orçamento. Apenas botão de aprovar está presente.

**Passos para reproduzir:**
1. Ir para aba "Pedidos"
2. Ver lista de pedidos
3. ❌ Card não tem botão "Rejeitar"
4. ✅ Card tem botão "Aprovar" (OK)

**Comportamento esperado:**
- Card deve ter 2 botões:
  - ✅ Aprovar orçamento
  - ❌ Rejeitar orçamento

**Comportamento atual:**
- Card tem apenas botão "Aprovar"
- Falta botão "Rejeitar"

**Impacto:**
- ⚠️ Usuário não consegue rejeitar orçamento diretamente
- ✅ Funcionalidade principal (criar/listar) funciona
- ✅ Não bloqueia uso do app

**Bloqueia TestFlight?**
❌ **NÃO** - Funcionalidade básica funciona

**Arquivos relacionados:**
- `src/screens/PedidosScreen.tsx` (componente de card)
- `src/components/OrderCard.tsx` (se existir)

**Notas:**
- Listar pedidos funciona ✅
- Criar pedido funciona ✅
- Apenas botão rejeitar que falta

---

### **BUG #005 - Sem feedback ao criar despesa offline**

**Severidade:** 🟢 Nice to have  
**Status:** 🔴 Pendente  
**Prioridade:** Baixa  
**Seção:** Edge Cases / Offline  

**Descrição:**
Ao criar despesa sem conexão (offline), o app não mostra nenhuma mensagem de feedback. A despesa não aparece imediatamente, mas é salva e aparece quando a conexão volta.

**Passos para reproduzir:**
1. Desligar WiFi/dados
2. Criar uma despesa
3. Clicar em "Salvar"
4. ❌ Nenhuma mensagem aparece
5. ❌ Despesa não aparece na lista
6. Ligar WiFi/dados
7. ✅ Despesa aparece (foi salva)

**Comportamento esperado:**
- Ao salvar offline, mostrar mensagem:
  - "Sem conexão. Despesa será sincronizada quando voltar online"
  - OU "Despesa salva localmente"
- Mostrar indicador visual de "pendente sincronização"
- Despesa aparecer na lista com badge "offline"

**Comportamento atual:**
- Nenhuma mensagem aparece
- Despesa não aparece na lista
- Usuário não sabe se salvou ou não
- Quando conexão volta, despesa aparece

**Impacto:**
- ⚠️ UX confusa - usuário não sabe se salvou
- ✅ Funcionalidade funciona (salva em background)
- ✅ Não perde dados
- ✅ Sincroniza quando volta online

**Bloqueia TestFlight?**
❌ **NÃO** - Funcionalidade funciona, apenas falta feedback visual

**Arquivos relacionados:**
- `src/context/FinancialContext.tsx` (lógica de salvamento)
- `src/screens/FinanceiroScreen.tsx` (UI de feedback)

**Notas:**
- App funciona offline ✅
- Cache funciona ✅
- Sincronização funciona ✅
- Apenas feedback visual que falta

---

## 📋 **PROGRESSO DO TESTE**

### **Seções testadas:**
- ✅ Autenticação (3/4 itens) - 75%
- ✅ Dashboard (5/5 itens) - 100%
- ✅ Despesas CRUD (8/8 itens) - 100%
- ✅ Receitas CRUD (3/4 itens) - 75%
- ✅ Documentos (3/5 itens) - 60%
- ✅ Filtros e Busca (5/5 itens) - 100%
- ✅ Equipamentos (5/5 itens) - 100%
- ✅ Relatórios (6/6 itens) - 100%
- ✅ Navegação e Performance (6/6 itens) - 100%
- ✅ Despesas Avançadas (5/5 itens) - 100%
- ✅ Contratos e Pedidos (4/4 itens) - 100%
- ✅ Edge Cases (2/4 itens) - 50%

### **RESULTADO FINAL:**
**Total: 55/60 itens funcionando = 92% ✅**

### **Critério de aprovação:**
- ✅ **90%+** = **APROVADO para TestFlight** 🚀
- **Resultado:** 92% = **APROVADO!** 🎉

---

## 📝 **OBSERVAÇÕES GERAIS**

- App instalou corretamente ✅
- Credenciais do Supabase funcionando ✅
- Login funciona perfeitamente ✅
- Interface responsiva ✅
- Performance inicial boa ✅

---

## 🎯 **PRÓXIMOS PASSOS**

1. ✅ Continuar smoke test
2. ✅ Anotar novos bugs encontrados
3. ⏳ Após teste completo, priorizar correções
4. ⏳ Corrigir bugs importantes
5. ⏳ Novo build se necessário
6. ⏳ Re-testar bugs corrigidos

---

## 📞 **CONTATO**

Se precisar de mais informações sobre algum bug, entre em contato.

---

*Última atualização: 05/12/2025 20:25*
