# ✅ CORREÇÃO APLICADA - Erro "Property 'receipt' doesn't exist"

## 📋 Erro (RESOLVIDO):

```
ReferenceError: Property 'receipt' doesn't exist
FinancialContext.tsx (1045:22)
```

## 🔍 Causa Identificada:

Na linha **923** do arquivo `FinancialContext.tsx`, dentro da função `addExpense`, o código estava tentando acessar `receipt.center` quando deveria ser `expense.center`.

O erro ocorria ao gerar parcelas de despesas fixas, onde estava sendo usado incorretamente a variável `receipt` em vez de `expense`.

---

## ✅ SOLUÇÃO APLICADA:

### Correção Realizada:

**Arquivo:** `src/context/FinancialContext.tsx`  
**Linha:** 923  
**Função:** `addExpense` (dentro do loop de geração de parcelas)

**Código ANTES (❌ ERRADO):**
```typescript
const installmentPayload: any = {
  type: "DESPESA",
  status: "CONFIRMADO",
  cost_center_id: receipt.center,  // ❌ ERRADO - 'receipt' não existe neste escopo
  equipment_id: expense.equipmentId ?? null,
  // ...
};
```

**Código DEPOIS (✅ CORRETO):**
```typescript
const installmentPayload: any = {
  type: "DESPESA",
  status: "CONFIRMADO",
  cost_center_id: expense.center,  // ✅ CORRETO - usa 'expense' que é a variável correta
  equipment_id: expense.equipmentId ?? null,
  // ...
};
```

---

## 📝 Detalhes da Correção:

- **Localização:** Linha 923 de `src/context/FinancialContext.tsx`
- **Contexto:** Geração de parcelas para despesas fixas
- **Problema:** Uso incorreto de `receipt.center` em vez de `expense.center`
- **Solução:** Substituído `receipt.center` por `expense.center`
- **Status:** ✅ **CORRIGIDO E TESTADO**

---

## 🧪 Verificação:

O erro ocorria quando:
1. Uma despesa fixa era criada
2. O sistema tentava gerar as parcelas automaticamente
3. Na linha 923, tentava acessar `receipt.center` (variável inexistente)
4. Isso causava o erro: `ReferenceError: Property 'receipt' doesn't exist`

Agora, ao criar uma despesa fixa, as parcelas são geradas corretamente usando `expense.center`.

---

**✅ Problema resolvido!** O erro não deve mais ocorrer ao criar despesas fixas.
