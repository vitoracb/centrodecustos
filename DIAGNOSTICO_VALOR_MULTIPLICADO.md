# 🔧 DIAGNÓSTICO - Valor da Despesa Fixa Multiplicado

## 📋 Problema:

**Despesa fixa:**
- Valor definido: R$ 21.000,00
- Duração: 12 meses

**Exibição:**
- ✅ Primeiro mês (Dez/2025): R$ 21.000,00
- ❌ Segundo mês (Jan/2026): R$ 231.000,00 (21.000 x 11?)
- ❌ Terceiro mês (Fev/2026): R$ 231.000,00

---

## 🔍 Possíveis Causas:

### Causa 1: Banco de dados tem valores errados

Execute este SQL para verificar:

```sql
SELECT 
    TO_CHAR(date::date, 'Mon/YYYY') as mes,
    value,
    is_fixed,
    installment_number
FROM financial_transactions
WHERE type = 'DESPESA'
  AND description = 'Locação Retroescavadeira Felipe'
ORDER BY date;
```

**Resultado esperado:**
```
Dec/2025 | 21000.00 | true  | 1
Jan/2026 | 21000.00 | false | 2
Feb/2026 | 21000.00 | false | 3
...
```

**Se aparecer valores diferentes (ex: 231000), o problema está no código que gera as parcelas.**

---

### Causa 2: Gráfico está somando valores duplicados

Se o banco está correto (todos os valores = 21000), então o problema está no **componente do gráfico** que está:
- Somando a parcela do mês atual
- MAIS todas as parcelas anteriores
- Resultando em valores acumulados

---

## ✅ SOLUÇÃO (se o problema está no banco):

### No FinancialContext.tsx, função addExpense (linha ~900):

**LOCALIZE o payload das parcelas:**
```typescript
const installmentPayload: any = {
  type: "DESPESA",
  status: "CONFIRMADO",
  cost_center_id: ccData.id,
  equipment_id: expense.equipmentId ?? null,
  value: expense.value, // ✅ Deve copiar o valor original
  date: dbDate,
  category: expense.category ?? "diversos",
  description: expense.name,
  payment_method: expense.method ?? null,
  reference: expense.observations ?? null,
  is_fixed: false,
  sector: expense.sector ?? null,
  fixed_duration_months: null,
  installment_number: offset + 1,
};
```

**VERIFIQUE:**
- ✅ `value: expense.value` está correto
- ❌ NÃO deve ter `value: expense.value * offset`
- ❌ NÃO deve ter `value: expense.value + alguma_coisa`

---

## ✅ SOLUÇÃO (se o problema está no gráfico):

### Verificar se há duplicação de registros

Execute este SQL:

```sql
-- Verificar se há duplicatas no banco
SELECT 
    TO_CHAR(date::date, 'Mon/YYYY') as mes,
    COUNT(*) as quantidade,
    SUM(value) as total
FROM financial_transactions
WHERE type = 'DESPESA'
  AND description = 'Locação Retroescavadeira Felipe'
GROUP BY TO_CHAR(date::date, 'Mon/YYYY')
ORDER BY MIN(date);
```

**Resultado esperado:**
```
Dec/2025 | 1 | 21000.00
Jan/2026 | 1 | 21000.00
Feb/2026 | 1 | 21000.00
```

**Se aparecer `quantidade > 1` em algum mês**, há duplicatas no banco!

---

## ✅ SOLUÇÃO (se há duplicatas):

### Deletar duplicatas:

```sql
-- Ver as duplicatas
SELECT 
    id,
    TO_CHAR(date::date, 'DD/MM/YYYY') as data,
    value,
    is_fixed,
    installment_number,
    created_at
FROM financial_transactions
WHERE type = 'DESPESA'
  AND description = 'Locação Retroescavadeira Felipe'
ORDER BY date, created_at;

-- Deletar duplicatas (manter apenas a mais antiga de cada mês)
DELETE FROM financial_transactions
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY DATE_TRUNC('month', date::date) 
        ORDER BY created_at ASC
      ) as rn
    FROM financial_transactions
    WHERE type = 'DESPESA'
      AND description = 'Locação Retroescavadeira Felipe'
  ) t
  WHERE rn > 1
);
```

---

## 📤 Me envie:

1. **Resultado do SQL 1** (valores no banco)
2. **Resultado do SQL 2** (verificar duplicatas)
3. **Screenshot do gráfico** mostrando R$ 231.000

Com essas informações eu consigo identificar exatamente onde está o problema! 🔍
