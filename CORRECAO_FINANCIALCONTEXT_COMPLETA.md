# ✅ CORREÇÕES COMPLETAS APLICADAS - FinancialContext.tsx

## 🔴 Problema (RESOLVIDO):

O código estava usando `receipt.center` dentro das funções de DESPESAS (expense), causando o erro:
```
ReferenceError: Property 'receipt' doesn't exist
```

**Status:** ✅ **TODAS AS CORREÇÕES FORAM APLICADAS**

---

## ✅ CORREÇÕES NECESSÁRIAS:

### CORREÇÃO 1: Linha ~822 (função addExpense)

**PROCURE por:**
```typescript
const payload: any = {
  type: "DESPESA",
  status: finalStatus,
  cost_center_id: receipt.center, // ❌ ERRADO
```

**CORRIJA para:**
```typescript
const payload: any = {
  type: "DESPESA",
  status: finalStatus,
  cost_center_id: expense.center, // ✅ CORRETO
```

---

### CORREÇÃO 2: Linha ~1151 (função updateExpense - template)

**PROCURE por:**
```typescript
.eq("description", expense.name)
.eq("cost_center_id", receipt.center) // ❌ ERRADO
.order("date", { ascending: true });
```

**CORRIJA para:**
```typescript
.eq("description", expense.name)
.eq("cost_center_id", expense.center) // ✅ CORRETO
.order("date", { ascending: true });
```

---

### CORREÇÃO 3: Linha ~1170 (função updateExpense - template payload)

**PROCURE por:**
```typescript
const templatePayload: any = {
  cost_center_id: receipt.center, // ❌ ERRADO
  equipment_id: expense.equipmentId ?? null,
```

**CORRIJA para:**
```typescript
const templatePayload: any = {
  cost_center_id: expense.center, // ✅ CORRETO
  equipment_id: expense.equipmentId ?? null,
```

---

### CORREÇÃO 4: Linha ~1243 (função updateExpense - verificar existente)

**PROCURE por:**
```typescript
.eq("description", expense.name)
.eq("cost_center_id", receipt.center) // ❌ ERRADO
.eq("is_fixed", false)
```

**CORRIJA para:**
```typescript
.eq("description", expense.name)
.eq("cost_center_id", expense.center) // ✅ CORRETO
.eq("is_fixed", false)
```

---

### CORREÇÃO 5: Linha ~1257 (função updateExpense - installment payload)

**PROCURE por:**
```typescript
const installmentPayload: any = {
  type: "DESPESA",
  status: "CONFIRMADO",
  cost_center_id: receipt.center, // ❌ ERRADO
```

**CORRIJA para:**
```typescript
const installmentPayload: any = {
  type: "DESPESA",
  status: "CONFIRMADO",
  cost_center_id: expense.center, // ✅ CORRETO
```

---

### CORREÇÃO 6: Linha ~1319 (função updateExpense - payload não fixo)

**PROCURE por:**
```typescript
const payload: any = {
  cost_center_id: receipt.center, // ❌ ERRADO
  equipment_id: expense.equipmentId ?? null,
```

**CORRIJA para:**
```typescript
const payload: any = {
  cost_center_id: expense.center, // ✅ CORRETO
  equipment_id: expense.equipmentId ?? null,
```

---

## 🔍 BUSCAR E SUBSTITUIR:

### Método Rápido no VS Code:

1. **Abra** `src/context/FinancialContext.tsx`

2. **Pressione** `Ctrl+H` (ou `Cmd+H` no Mac)

3. **Busque por:**
```
cost_center_id: receipt.center
```

4. **Substitua por:**
```
cost_center_id: expense.center
```

5. **Clique em** "Replace All" (Substituir Tudo)

**IMPORTANTE:** Só substitua dentro das funções de DESPESAS (`addExpense` e `updateExpense`)!

Não substitua em `updateReceipt` onde `receipt.center` está CORRETO!

---

## 📋 Resumo:

**Total de correções:** 6 ocorrências

**Funções afetadas:**
- `addExpense` (1 ocorrência)
- `updateExpense` (5 ocorrências)

**Tipo de erro:** Uso da variável `receipt` em vez de `expense`

---

## ✅ Correções Aplicadas:

### Total de correções realizadas: **6 ocorrências**

1. ✅ **Linha 807** - `addExpense` - payload principal
2. ✅ **Linha 1103** - `updateExpense` - query de busca de parcelas
3. ✅ **Linha 1113** - `updateExpense` - template payload
4. ✅ **Linha 1197** - `updateExpense` - query de verificação de parcela existente
5. ✅ **Linha 1206** - `updateExpense` - installment payload
6. ✅ **Linha 1403** - `updateExpense` - payload para despesa não fixa

**Todas as ocorrências de `receipt.center` nas funções de despesas foram substituídas por `expense.center`.**

---

## 🧪 Próximos Passos:

1. **Salve o arquivo** (já salvo)
2. **Recarregue o app** (Ctrl+R ou Cmd+R)
3. **Teste criar uma nova despesa**
4. **Teste editar uma despesa fixa**

O erro não deve mais ocorrer! 🎉
