# ✅ CHECKLIST - TESTE NO EXPO GO

**Data:** 06/12/2025  
**Ambiente:** Expo Go (Desenvolvimento)  
**Testador:** _______________

---

## ⚠️ **IMPORTANTE**

**O que PODE testar no Expo Go:**
- ✅ Bug #002 - Receitas fixas
- ✅ Bug #003 - Seleção tipo documento
- ✅ Bug #004 - Botão rejeitar
- ✅ Bug #005 - Feedback offline

**O que NÃO PODE testar no Expo Go:**
- ❌ Bug #001 - Persistência de sessão (só no BUILD)

---

## 🟡 **BUG #002 - RECEITAS FIXAS** ⭐ PRIORIDADE

**Tempo:** 5 minutos

### **Teste:**

1. **[ ] Criar receita fixa**
   - Ir para aba "Receitas"
   - Clicar em "Nova Receita"
   - Nome: "Teste Receita Fixa"
   - Valor: R$ 1.000,00
   - **Marcar "Receita fixa"** ✅
   - Duração: 3 meses
   - Salvar

2. **[ ] Verificar parcelas**
   - Voltar para lista
   - **Deve aparecer 3 receitas** (1 por mês)
   - Verificar datas (meses consecutivos)

3. **[ ] Editar receita fixa**
   - Clicar em uma receita
   - Editar
   - **Checkbox deve estar marcado** ✅
   - **Duração deve mostrar "3"** ✅

### **Resultado:**
- [ ] ✅ APROVADO
- [ ] ❌ REPROVADO

---

## 🟢 **BUG #003 - SELEÇÃO TIPO DOCUMENTO**

**Tempo:** 3 minutos

### **Teste:**

1. **[ ] Abrir despesa**
   - Criar ou abrir despesa
   - Clicar "Adicionar documento"

2. **[ ] Verificar modal**
   - **Deve aparecer 4 opções:**
     - [ ] Nota Fiscal
     - [ ] Recibo
     - [ ] Comprovante
     - [ ] Boleto

### **Resultado:**
- [ ] ✅ APROVADO
- [ ] ❌ REPROVADO

---

## 🟢 **BUG #004 - BOTÃO REJEITAR**

**Tempo:** 2 minutos

### **Teste:**

1. **[ ] Ir para Pedidos**
   - Aba "Pedidos"
   - Encontrar pedido com "Orçamento enviado"

2. **[ ] Verificar botão**
   - **Deve ter botão "Rejeitar"** (vermelho, X)
   - Entre "Detalhes" e "Excluir"

3. **[ ] Testar botão**
   - Clicar "Rejeitar"
   - Confirmar
   - Status muda para "Orçamento reprovado"

### **Resultado:**
- [ ] ✅ APROVADO
- [ ] ❌ REPROVADO

---

## 🟢 **BUG #005 - FEEDBACK OFFLINE**

**Tempo:** 3 minutos

### **Teste:**

1. **[ ] Desativar WiFi**
   - Desligar WiFi no emulador

2. **[ ] Criar despesa offline**
   - Tentar criar despesa
   - **Deve aparecer mensagem:**
     - "Sem conexão"
     - "Não foi possível salvar..."

3. **[ ] Criar receita offline**
   - Tentar criar receita
   - **Deve aparecer mesma mensagem**

4. **[ ] Ligar WiFi e testar**
   - Ligar WiFi
   - Criar despesa/receita
   - Deve funcionar normalmente

### **Resultado:**
- [ ] ✅ APROVADO
- [ ] ❌ REPROVADO

---

## 📊 **RESULTADO**

```
Total testado: 4 bugs
Aprovados: ___
Reprovados: ___
Taxa: ____%
```

### **Critério:**
- ✅ 100% (4/4) = Pronto para build
- ⚠️ 75%+ (3/4) = Build com ressalvas
- ❌ < 75% = Revisar código

---

## 🚀 **PRÓXIMOS PASSOS**

### **Se APROVADO (4/4):**
```bash
# Fazer commit
git add .
git commit -m "fix: corrige bugs #002, #003, #004, #005"

# Fazer novo build
eas build --platform android --profile preview

# Quando build terminar:
# - Instalar APK
# - Testar Bug #001 (Persistência)
# - Re-testar todos os bugs no APK
```

### **Se REPROVADO:**
```
1. Anotar bugs que falharam
2. Informar desenvolvedor
3. Aguardar correção
4. Testar novamente no Expo Go
```

---

**Testado por:** _______________  
**Data:** ___/___/___  
**Hora:** ___:___

---

## 📝 **OBSERVAÇÕES**

```
_______________________________________________
_______________________________________________
_______________________________________________
```
