# 🔧 CORREÇÃO - Exibir Template de Despesa Fixa

## 📋 Problema:
O template (primeira parcela) de despesas fixas não está sendo exibido na tela. Apenas as parcelas geradas (2, 3, 4...) aparecem, mas a parcela 1 (que tem `isFixed = true`) está sendo filtrada e escondida.

## ✅ Solução:

No arquivo `FinanceiroScreen.tsx` (ou `FinancialScreen.tsx`), localize e **DELETE** as seguintes linhas (aproximadamente linha 702-704):

```typescript
// REMOVER ESTAS 3 LINHAS:
// Exclui despesas fixas template (is_fixed = true) da exibição
// Apenas as cópias geradas (is_fixed = false) devem ser exibidas
filtered = filtered.filter((expense) => !expense.isFixed);
```

## 📍 Localização Exata:

Dentro da função `filteredExpenses` (useMemo), logo após:

```typescript
const filteredExpenses = useMemo(() => {
  let filtered = [...allExpensesForCenter];

  // ❌ DELETAR ESTAS 3 LINHAS ABAIXO:
  // Exclui despesas fixas template (is_fixed = true) da exibição
  // Apenas as cópias geradas (is_fixed = false) devem ser exibidas
  filtered = filtered.filter((expense) => !expense.isFixed);

  // Filtrar por período (Mensal/Anual)
  const selectedMonth = selectedExpensePeriod.month();
  // ... resto do código continua normal
```

## 🎯 Resultado Esperado:

Após remover essas linhas, as despesas fixas vão aparecer assim:

**ANTES (com o filtro - ERRADO):**
- ❌ Dezembro/2025 - Parcela 1/12 (NÃO APARECE)
- ✅ Janeiro/2026 - Parcela 2/12
- ✅ Fevereiro/2026 - Parcela 3/12

**DEPOIS (sem o filtro - CORRETO):**
- ✅ Dezembro/2025 - Parcela 1/12 (APARECE!)
- ✅ Janeiro/2026 - Parcela 2/12
- ✅ Fevereiro/2026 - Parcela 3/12

## 📝 Nota:

O template (primeira parcela) precisa aparecer porque:
1. É a parcela criada pelo usuário (a "original")
2. Tem `installment_number = 1`
3. Representa o primeiro mês da despesa fixa
4. As funções `getExpenseFixedInfo` dependem dele para calcular corretamente as outras parcelas

## ✅ Após a correção:

Todas as parcelas (incluindo a primeira) vão aparecer na lista de despesas, cada uma no seu respectivo mês, com a indicação correta "Despesa fixa - 1/12", "Despesa fixa - 2/12", etc.
