# 🔧 CORREÇÃO - Despesas Fixas Indefinidas (Recorrentes)

## 📋 Comportamento Desejado:

### ✅ Despesa fixa COM duração (ex: 3 meses)
```
Criada em: Dezembro/2025
Duração: 3 meses
Resultado:
- ✅ Dezembro: Parcela 1/3
- ✅ Janeiro: Parcela 2/3
- ✅ Fevereiro: Parcela 3/3
- ❌ Março em diante: NÃO aparece (terminou)
```

### ✅ Despesa fixa SEM duração (indefinida/recorrente)
```
Criada em: Dezembro/2025
Duração: Indefinida
Resultado:
- ✅ Dezembro: Despesa fixa
- ✅ Janeiro: Despesa fixa
- ✅ Fevereiro: Despesa fixa
- ✅ Março: Despesa fixa
- ✅ Abril: Despesa fixa
- ... (continua indefinidamente)
```

---

## 🔧 Correções Necessárias:

### CORREÇÃO 1: Função `addExpense` (linha ~1156-1157)

**ATUAL:**
```typescript
const totalMonths =
  expense.fixedDurationMonths ?? (expense.isFixed ? 12 : 1);
```

**PROBLEMA:** Quando é indefinida, usa 12 meses como limite.

**NOVO:**
```typescript
// Se tem duração definida, usa ela
// Se é fixa sem duração (indefinida), gera parcelas até 12 meses à frente (será regenerado automaticamente)
// Se não é fixa, usa 1
const totalMonths = expense.fixedDurationMonths ?? (expense.isFixed ? 12 : 1);
```

**NOTA:** Deixar em 12 está OK para a criação inicial. O importante é a função `generateFixedExpenses` que vai regenerar automaticamente.

---

### CORREÇÃO 2: Função `generateFixedExpenses` (linha ~1942-1964)

Esta é a correção PRINCIPAL!

**LOCALIZE:**
```typescript
let totalMonthsToGenerate: number;
if (fixedExpense.fixed_duration_months !== null) {
  totalMonthsToGenerate = fixedExpense.fixed_duration_months;
  console.log(`📅 Despesa fixa "${fixedExpense.description}": duração definida = ${totalMonthsToGenerate} meses`);
} else {
  const monthsSinceCreation =
    (currentYear - creationYear) * 12 + (currentMonth - creationMonth);
  totalMonthsToGenerate = monthsSinceCreation + 1;
  console.log(`📅 Despesa fixa "${fixedExpense.description}": duração indefinida, gerando ${totalMonthsToGenerate} meses`);
}

// Começa do offset 1 porque a parcela 1 já foi criada como template (offset 0)
for (let monthOffset = 1; monthOffset < totalMonthsToGenerate; monthOffset++) {
```

**SUBSTITUA POR:**
```typescript
let totalMonthsToGenerate: number;
if (fixedExpense.fixed_duration_months !== null && fixedExpense.fixed_duration_months !== undefined) {
  // Tem duração definida - gera apenas os meses especificados
  totalMonthsToGenerate = fixedExpense.fixed_duration_months;
  console.log(`📅 Despesa fixa "${fixedExpense.description}": duração definida = ${totalMonthsToGenerate} meses`);
} else {
  // Sem duração definida (indefinida/recorrente) - gera até o mês atual + 3 meses à frente
  const monthsSinceCreation =
    (currentYear - creationYear) * 12 + (currentMonth - creationMonth);
  totalMonthsToGenerate = monthsSinceCreation + 3; // Gera sempre 3 meses à frente
  console.log(`📅 Despesa fixa "${fixedExpense.description}": duração INDEFINIDA (recorrente), gerando até ${totalMonthsToGenerate} meses (atual + 3 meses à frente)`);
}

// Começa do offset 1 porque a parcela 1 já foi criada como template (offset 0)
for (let monthOffset = 1; monthOffset < totalMonthsToGenerate; monthOffset++) {
  const targetMonth = creationMonth + monthOffset;
  let targetYear = creationYear;
  let actualMonth = targetMonth;

  if (targetMonth > 12) {
    const yearOffset = Math.floor((targetMonth - 1) / 12);
    targetYear = creationYear + yearOffset;
    actualMonth = ((targetMonth - 1) % 12) + 1;
  }

  // ⚠️ IMPORTANTE: Remover este bloco que impede a geração para despesas indefinidas!
  // REMOVA OU COMENTE ESTAS LINHAS:
  /*
  if (
    fixedExpense.fixed_duration_months !== null &&
    (targetYear > currentYear ||
      (targetYear === currentYear && actualMonth > currentMonth))
  ) {
    break;
  }
  */
  
  // SUBSTITUA pelo código abaixo que só aplica o limite para despesas COM duração definida:
  if (fixedExpense.fixed_duration_months !== null && fixedExpense.fixed_duration_months !== undefined) {
    // Só aplica limite de mês atual para despesas COM duração definida
    if (targetYear > currentYear || (targetYear === currentYear && actualMonth > currentMonth)) {
      break;
    }
  }

  const installmentNumber = monthOffset + 1;

  await generateFixedExpenseForMonth(
    fixedExpense,
    actualMonth,
    targetYear,
    creationDay,
    installmentNumber
  );
}
```

---

## 🎯 Como vai funcionar após a correção:

### Exemplo 1: Despesa fixa COM duração (3 meses)
```
Data criação: 29/11/2025 (Novembro)
Duração: 3 meses
fixed_duration_months: 3

Parcelas geradas:
- Novembro/2025: Parcela 1/3 (template, is_fixed=true)
- Dezembro/2025: Parcela 2/3 (gerada, is_fixed=false)
- Janeiro/2026: Parcela 3/3 (gerada, is_fixed=false)
- Fevereiro/2026 em diante: ❌ NÃO gera (terminou)
```

### Exemplo 2: Despesa fixa SEM duração (indefinida)
```
Data criação: 29/11/2025 (Novembro)
Duração: Indefinida
fixed_duration_months: null

Parcelas geradas inicialmente:
- Novembro/2025: Despesa fixa (template, is_fixed=true)
- Dezembro/2025: Despesa fixa (gerada, is_fixed=false)
- Janeiro/2026: Despesa fixa (gerada, is_fixed=false)
- Fevereiro/2026: Despesa fixa (gerada, is_fixed=false)

Quando chegar Dezembro/2025:
- O sistema automaticamente gera Março/2026

Quando chegar Janeiro/2026:
- O sistema automaticamente gera Abril/2026

... e assim por diante (INFINITO)
```

---

## ⚙️ Como o sistema mantém despesas indefinidas:

A função `generateFixedExpenses` é executada:
1. **Ao iniciar o app** (2 segundos após o carregamento)
2. **Quando você criar/atualizar despesas**

Para despesas indefinidas, ela sempre:
- Verifica quantos meses se passaram desde a criação
- Gera parcelas até **3 meses à frente** do mês atual
- Exemplo: Se estamos em Janeiro, gera até Abril

Isso garante que SEMPRE haverá parcelas futuras para despesas recorrentes!

---

## 📌 Ajuste Opcional - Número de Meses à Frente:

Se quiser que gere mais meses à frente, altere esta linha:

```typescript
totalMonthsToGenerate = monthsSinceCreation + 3; // Mude 3 para 6, 12, etc
```

Recomendação: **3 meses** é suficiente pois regenera automaticamente.

---

## ✅ Checklist de Implementação:

- [ ] Correção 1: Função `addExpense` (opcional, já está OK)
- [ ] Correção 2: Função `generateFixedExpenses` (OBRIGATÓRIO)
- [ ] Remover/comentar o bloco que impede geração futura
- [ ] Adicionar verificação apenas para despesas COM duração
- [ ] Testar: Criar despesa fixa COM duração (3 meses)
- [ ] Testar: Criar despesa fixa SEM duração (indefinida)
- [ ] Reiniciar app: `npx expo start -c`

---

## 🔍 Para Verificar se Funcionou:

Execute este SQL após criar as despesas:

```sql
-- Ver despesas fixas e suas parcelas
SELECT 
    description,
    TO_CHAR(date::date, 'Mon/YYYY') as mes,
    is_fixed,
    installment_number,
    fixed_duration_months,
    CASE 
        WHEN fixed_duration_months IS NULL THEN '♾️ INDEFINIDA'
        ELSE fixed_duration_months::text || ' meses'
    END as tipo
FROM financial_transactions
WHERE type = 'DESPESA'
  AND description IN (
    SELECT description 
    FROM financial_transactions 
    WHERE is_fixed = true AND type = 'DESPESA'
  )
ORDER BY description, date;
```

Deve mostrar:
- Despesas COM duração: Apenas X parcelas
- Despesas SEM duração: Parcelas até 3 meses à frente (e continuará gerando)
