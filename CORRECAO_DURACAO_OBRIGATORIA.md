# 🔧 CORREÇÃO - Duração Obrigatória em Despesas Fixas

## 📋 Mudança de Comportamento:

**ANTES:**
- Despesa fixa com duração → Gera X parcelas
- Despesa fixa sem duração → Tenta gerar indefinidamente (com bugs)

**DEPOIS:**
- Despesa fixa → SEMPRE com duração obrigatória
- Gera parcelas de acordo com a duração especificada
- Funciona para datas no passado, presente ou futuro

---

## ✅ PARTE 1: Ajustar FinancialContext.tsx

### Mudança 1: Função `addExpense` (linha ~1156-1170)

**LOCALIZE:**
```typescript
const totalMonths =
  expense.fixedDurationMonths ?? (expense.isFixed ? 12 : 1);

// LOG DE DEBUG
if (expense.isFixed && !expense.fixedDurationMonths) {
  console.warn(
    `⚠️ ATENÇÃO: Despesa fixa "${expense.name}" foi criada SEM fixedDurationMonths!`,
    `Usando padrão de ${totalMonths} meses.`,
    `Objeto expense completo:`,
    expense
  );
} else if (expense.isFixed) {
  console.log(
    `✅ Despesa fixa "${expense.name}" criada com duração definida: ${expense.fixedDurationMonths} meses`
  );
}
```

**SUBSTITUA POR:**
```typescript
// Validação: Se for despesa fixa, a duração é obrigatória
if (expense.isFixed && !expense.fixedDurationMonths) {
  console.error(
    `❌ ERRO: Despesa fixa "${expense.name}" precisa ter duração definida!`
  );
  // Não cria a despesa se não tiver duração
  return;
}

const totalMonths = expense.fixedDurationMonths ?? 1;

// LOG DE DEBUG
if (expense.isFixed && expense.fixedDurationMonths) {
  console.log(
    `✅ Despesa fixa "${expense.name}" criada com duração: ${expense.fixedDurationMonths} meses`
  );
}
```

---

### Mudança 2: Função `generateFixedExpenses` (linha ~1942-1964)

**LOCALIZE:**
```typescript
let totalMonthsToGenerate: number;
if (fixedExpense.fixed_duration_months !== null && fixedExpense.fixed_duration_months !== undefined) {
  totalMonthsToGenerate = fixedExpense.fixed_duration_months;
  console.log(`📅 Despesa fixa "${fixedExpense.description}": duração definida = ${totalMonthsToGenerate} meses`);
} else {
  const monthsSinceCreation =
    (currentYear - creationYear) * 12 + (currentMonth - creationMonth);
  const monthsToGenerate = Math.max(0, monthsSinceCreation) + 3;
  totalMonthsToGenerate = monthsToGenerate;
  console.log(`📅 Despesa fixa "${fixedExpense.description}": duração INDEFINIDA (recorrente)`);
}
```

**SUBSTITUA POR:**
```typescript
// Validação: Despesa fixa SEMPRE tem duração
if (!fixedExpense.fixed_duration_months) {
  console.error(
    `❌ ERRO: Despesa fixa "${fixedExpense.description}" sem duração definida! Pulando...`
  );
  continue; // Pula para a próxima despesa
}

const totalMonthsToGenerate = fixedExpense.fixed_duration_months;
console.log(
  `📅 Despesa fixa "${fixedExpense.description}": gerando ${totalMonthsToGenerate} parcelas`
);
```

---

### Mudança 3: Remover verificação de mês futuro (linha ~1962-1968)

**LOCALIZE E REMOVA COMPLETAMENTE:**
```typescript
if (fixedExpense.fixed_duration_months !== null && fixedExpense.fixed_duration_months !== undefined) {
  if (targetYear > currentYear || (targetYear === currentYear && actualMonth > currentMonth)) {
    break;
  }
}
```

**MOTIVO:** Queremos que gere parcelas mesmo para meses futuros!

---

## ✅ PARTE 2: Ajustar o Formulário

Você precisa garantir que o formulário:

1. **Quando marcar "Despesa Fixa"** → Campo de duração aparece e é OBRIGATÓRIO
2. **Opções de duração**: 1, 2, 3, 6, 12, 24 meses (ou o que preferir)
3. **Validação**: Não permite criar sem escolher a duração

**Me envie o código do formulário** onde você cria despesas fixas para eu ajustar!

---

## 🎯 Como Vai Funcionar:

### Exemplo 1: Despesa criada no PASSADO
```
Data selecionada: 01/10/2025 (Outubro - no passado)
Duração: 3 meses
Mês atual: Novembro/2025

Parcelas criadas:
- ✅ Outubro/2025: Parcela 1/3
- ✅ Novembro/2025: Parcela 2/3
- ✅ Dezembro/2025: Parcela 3/3
```

### Exemplo 2: Despesa criada no FUTURO
```
Data selecionada: 01/01/2026 (Janeiro - no futuro)
Duração: 3 meses
Mês atual: Novembro/2025

Parcelas criadas:
- ✅ Janeiro/2026: Parcela 1/3
- ✅ Fevereiro/2026: Parcela 2/3
- ✅ Março/2026: Parcela 3/3
```

### Exemplo 3: Despesa criada HOJE
```
Data selecionada: 30/11/2025 (Hoje)
Duração: 6 meses

Parcelas criadas:
- ✅ Novembro/2025: Parcela 1/6
- ✅ Dezembro/2025: Parcela 2/6
- ✅ Janeiro/2026: Parcela 3/6
- ✅ Fevereiro/2026: Parcela 4/6
- ✅ Março/2026: Parcela 5/6
- ✅ Abril/2026: Parcela 6/6
```

---

## 🧪 Teste Após Implementar:

1. **Limpe a despesa "Locação Retroescavadeira Felipe"**:
```sql
DELETE FROM financial_transactions
WHERE description = 'Locação Retroescavadeira Felipe';
```

2. **Crie novamente** com duração definida (ex: 3 meses)

3. **Execute este SQL** para verificar:
```sql
SELECT 
    TO_CHAR(date::date, 'Mon/YYYY') as mes,
    is_fixed,
    installment_number,
    fixed_duration_months
FROM financial_transactions
WHERE type = 'DESPESA'
  AND description = 'Locação Retroescavadeira Felipe'
ORDER BY date;
```

Deve mostrar 3 registros (parcelas 1/3, 2/3, 3/3)!

---

## 📤 Próximo Passo:

Me envie o código do **formulário de criação de despesas** para eu ajustar e tornar a duração obrigatória quando marcar como "Despesa Fixa"!
