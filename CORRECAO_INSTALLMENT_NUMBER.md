# 🔧 CORREÇÕES - Adicionar installment_number

## ✅ CORREÇÃO 1: Linha 798 - Payload inicial (template)

### LOCALIZE (aproximadamente linha 775-812):
```typescript
const payload: any = {
  type: "DESPESA",
  status: finalStatus,
  cost_center_id: ccData.id,
  equipment_id: expense.equipmentId ?? null,
  value: expense.value,
  date: dbDate,
  category: expense.category ?? "diversos",
  description: expense.name,
  payment_method: expense.method ?? null,
  reference: expense.observations ?? null,
  is_fixed: expense.isFixed ?? false,
  sector: expense.sector ?? null,
  fixed_duration_months: expense.fixedDurationMonths ?? null,
};
```

### ADICIONE a linha do installment_number:
```typescript
const payload: any = {
  type: "DESPESA",
  status: finalStatus,
  cost_center_id: ccData.id,
  equipment_id: expense.equipmentId ?? null,
  value: expense.value,
  date: dbDate,
  category: expense.category ?? "diversos",
  description: expense.name,
  payment_method: expense.method ?? null,
  reference: expense.observations ?? null,
  is_fixed: expense.isFixed ?? false,
  sector: expense.sector ?? null,
  fixed_duration_months: expense.fixedDurationMonths ?? null,
  installment_number: expense.isFixed ? 1 : null, // ✅ ADICIONAR ESTA LINHA
};
```

---

## ✅ CORREÇÃO 2: Linha 900 - Payload das parcelas geradas

### LOCALIZE (aproximadamente linha 890-913):
```typescript
const installmentPayload: any = {
  type: "DESPESA",
  status: "CONFIRMADO",
  cost_center_id: ccData.id,
  equipment_id: expense.equipmentId ?? null,
  value: expense.value,
  date: dbDate,
  category: expense.category ?? "diversos",
  description: expense.name,
  payment_method: expense.method ?? null,
  reference: expense.observations ?? null,
  is_fixed: false,
  sector: expense.sector ?? null,
  fixed_duration_months: null,
};
```

### ADICIONE a linha do installment_number (baseado no offset):
```typescript
const installmentPayload: any = {
  type: "DESPESA",
  status: "CONFIRMADO",
  cost_center_id: ccData.id,
  equipment_id: expense.equipmentId ?? null,
  value: expense.value,
  date: dbDate,
  category: expense.category ?? "diversos",
  description: expense.name,
  payment_method: expense.method ?? null,
  reference: expense.observations ?? null,
  is_fixed: false,
  sector: expense.sector ?? null,
  fixed_duration_months: null,
  installment_number: offset + 1, // ✅ ADICIONAR ESTA LINHA (offset + 1 = 2, 3, 4...)
};
```

---

## ✅ CORREÇÃO 3: Linha 1416 - generateFixedExpenses (parcelas automáticas)

### LOCALIZE (aproximadamente linha 1405-1425):
```typescript
const installmentPayload: any = {
  type: "DESPESA",
  status: "CONFIRMADO",
  cost_center_id: fixedExpense.cost_center_id,
  equipment_id: fixedExpense.equipment_id ?? null,
  value: fixedExpense.value,
  date: dbDate,
  category: fixedExpense.category ?? "diversos",
  description: fixedExpense.description,
  payment_method: fixedExpense.payment_method ?? null,
  reference: fixedExpense.reference ?? null,
  is_fixed: false,
  sector: fixedExpense.sector ?? null,
  fixed_duration_months: null,
};
```

### ADICIONE a linha do installment_number:
```typescript
const installmentPayload: any = {
  type: "DESPESA",
  status: "CONFIRMADO",
  cost_center_id: fixedExpense.cost_center_id,
  equipment_id: fixedExpense.equipment_id ?? null,
  value: fixedExpense.value,
  date: dbDate,
  category: fixedExpense.category ?? "diversos",
  description: fixedExpense.description,
  payment_method: fixedExpense.payment_method ?? null,
  reference: fixedExpense.reference ?? null,
  is_fixed: false,
  sector: fixedExpense.sector ?? null,
  fixed_duration_months: null,
  installment_number: offset + 1, // ✅ ADICIONAR ESTA LINHA
};
```

---

## 🧪 TESTE:

1. **Deletar despesa antiga**:
```sql
DELETE FROM financial_transactions
WHERE description = 'Locação Retroescavadeira Felipe';
```

2. **Aplicar as 3 correções acima**

3. **Reiniciar**: `npx expo start -c`

4. **Criar nova despesa fixa** (3 meses, data 01/12/2025)

5. **Verificar**:
```sql
SELECT 
    TO_CHAR(date::date, 'DD/MM/YYYY') as data,
    is_fixed,
    installment_number,
    fixed_duration_months
FROM financial_transactions
WHERE type = 'DESPESA'
  AND description = 'NOME_DA_DESPESA'
ORDER BY date;
```

**Resultado esperado**:
```
01/12/2025 | true  | 1 | 3
01/01/2026 | false | 2 | NULL
01/02/2026 | false | 3 | NULL
```

---

## 📌 Resumo:

São apenas **3 linhas** para adicionar:
1. Linha ~812: `installment_number: expense.isFixed ? 1 : null,`
2. Linha ~913: `installment_number: offset + 1,`  
3. Linha ~1425: `installment_number: offset + 1,`

Depois disso, os números das parcelas vão aparecer corretamente! 🚀
