# 🔧 CORREÇÃO - Edição de Recebimentos Fixos

## 📋 Problema Atual:

Quando você edita um recebimento fixo:
1. ❌ O checkbox "Recebimento Fixo" não aparece marcado
2. ❌ A duração não aparece preenchida
3. ❌ Se alterar a duração, os cards não atualizam

## ✅ Solução:

O problema está no `FinanceiroScreen.tsx` nas linhas **1243-1275** (seção do `ReceiptFormModal`).

Você já está **QUASE** fazendo certo, mas precisa ajustar a busca do template.

---

## 🔍 Código Atual (linhas 1243-1275):

```typescript
initialData={
  editingReceipt
    ? (() => {
        // Verifica se é um recebimento fixo (template ou parcela)
        const allReceipts = getAllReceipts();
        const fixedInfo = getReceiptFixedInfo(editingReceipt, allReceipts);
        
        // Se for fixo, busca o template para obter os dados corretos
        let templateReceipt = editingReceipt;
        if (fixedInfo.isFixed) {
          const template = allReceipts.find(
            (r) => r.isFixed && r.name === editingReceipt.name && r.center === editingReceipt.center
          );
          if (template) {
            templateReceipt = template;
          }
        }
        
        return {
          name: templateReceipt.name,
          date: editingReceipt.date, // Mantém a data da parcela sendo editada
          value: templateReceipt.value,
          isFixed: fixedInfo.isFixed, // Usa a informação correta se é fixo
          fixedDurationMonths: templateReceipt.fixedDurationMonths,
          id: templateReceipt.id, // ID do template para atualizar todas as parcelas
        };
      })()
    : undefined
}
```

---

## ✅ Código CORRIGIDO:

**SUBSTITUA** o bloco acima por este:

```typescript
initialData={
  editingReceipt
    ? {
        name: editingReceipt.name,
        date: editingReceipt.date,
        value: editingReceipt.value,
        isFixed: editingReceipt.isFixed ?? false, // ✅ Usa o valor direto do recebimento
        fixedDurationMonths: editingReceipt.fixedDurationMonths, // ✅ Usa o valor direto do recebimento
        id: editingReceipt.id,
      }
    : undefined
}
```

---

## 📝 Explicação:

### **ANTES (código complicado e com bug):**
- Tentava detectar se era fixo usando `getReceiptFixedInfo`
- Buscava o template na lista de recebimentos
- Isso só funcionava se o recebimento JÁ tivesse parcelas geradas
- Se fosse um template sem parcelas, não funcionava

### **DEPOIS (código simples e correto):**
- Usa diretamente os valores de `editingReceipt`
- Os campos `isFixed` e `fixedDurationMonths` já estão salvos no banco
- Funciona para qualquer recebimento (template ou parcela)

---

## 🔄 Para Despesas (Bônus):

O mesmo problema existe nas **despesas**. Se quiser corrigir também, procure por:

**Localização:** Linhas ~1290-1322 (seção do `ExpenseFormModal`)

**SUBSTITUA:**
```typescript
initialData={
  editingExpense
    ? (() => {
        // ... código complicado ...
      })()
    : undefined
}
```

**POR:**
```typescript
initialData={
  editingExpense
    ? {
        name: editingExpense.name,
        category: editingExpense.category,
        date: editingExpense.date,
        value: editingExpense.value,
        documents: editingExpense.documents || [],
        equipmentId: editingExpense.equipmentId,
        gestaoSubcategory: editingExpense.gestaoSubcategory,
        observations: editingExpense.observations,
        isFixed: editingExpense.isFixed ?? false, // ✅ Usa o valor direto
        sector: editingExpense.sector,
        fixedDurationMonths: editingExpense.fixedDurationMonths, // ✅ Usa o valor direto
        id: editingExpense.id,
      }
    : undefined
}
```

---

## 🧪 Como Testar:

1. **Crie um recebimento fixo**:
   - Marque "Recebimento Fixo"
   - Defina duração: 3 meses
   - Salve

2. **Edite o recebimento**:
   - Clique no botão de editar (ícone de lápis)
   - ✅ Checkbox "Recebimento Fixo" deve estar marcado
   - ✅ Campo "Duração" deve mostrar "3 meses"

3. **Altere a duração**:
   - Mude para 6 meses
   - Salve
   - ✅ Os cards devem atualizar mostrando "1/6", "2/6", etc.

---

## 🎯 Resultado Esperado:

Após a correção:
- ✅ Ao editar um recebimento fixo, o checkbox aparece marcado
- ✅ A duração aparece preenchida corretamente
- ✅ Ao alterar a duração, todas as parcelas atualizam automaticamente
- ✅ Funciona tanto para o template quanto para as parcelas geradas

---

## 📌 Nota Importante:

Esta correção **SIMPLIFICA** o código removendo toda a lógica complexa de busca de template. O banco de dados já tem todas as informações necessárias em cada recebimento/despesa, então não precisamos procurar o template.

A parte do `onSubmit` (que atualiza o recebimento) **JÁ ESTÁ CORRETA** e vai continuar funcionando perfeitamente!
