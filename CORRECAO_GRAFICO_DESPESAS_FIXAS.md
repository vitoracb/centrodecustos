# 🔧 CORREÇÃO - Despesas Fixas no Gráfico Mensal

## 📋 Problema:

Quando uma despesa fixa é adicionada com duração de X meses, o gráfico de barras (por mês do ano) **não mostra** a despesa em todos os meses da duração.

**Exemplo:**
- Despesa: "Aluguel"
- Criada em: Dezembro/2025
- Duração: 12 meses
- Gráfico atual: Só mostra em Dezembro/2025
- Gráfico esperado: Deve mostrar de Dezembro/2025 até Novembro/2026

---

## 🔍 Causa:

O componente `ExpenseBarChart` recebe `filteredExpenses`, que contém apenas as despesas que **existem fisicamente no banco de dados** para o período selecionado.

No modo **Anual (2025)**, ele só inclui despesas de 2025. Se uma despesa fixa vai até 2026, as parcelas de 2026 não aparecem no gráfico de 2025.

---

## ✅ Solução 1: Gerar Parcelas Futuras no Banco (Recomendado)

A solução mais simples é garantir que **todas as parcelas já estejam no banco** quando a despesa fixa é criada.

### Verificar se já está implementado:

No `FinancialContext.tsx`, quando uma despesa fixa é criada, ela deveria gerar todas as parcelas:

```typescript
// No addExpense, após criar o template:
if (expense.isFixed && expense.fixedDurationMonths > 1) {
  // Gera parcelas de 1 até fixedDurationMonths
  for (let offset = 1; offset < expense.fixedDurationMonths; offset++) {
    // Cria parcela no banco
  }
}
```

**Se isso já está implementado**, então o problema pode ser:

1. ❌ As parcelas estão sendo geradas apenas para o **ano atual**
2. ❌ A função `generateFixedExpenses` não está sendo executada corretamente

---

## ✅ Solução 2: Expandir Despesas Fixas no Frontend

Se você **NÃO** quer gerar todas as parcelas no banco (para economizar espaço), pode expandir as despesas fixas no frontend antes de passar para o gráfico.

### Passo 1: Criar função para expandir despesas fixas

No `FinanceiroScreen.tsx`, adicione esta função antes do `filteredExpenses`:

```typescript
// Função para expandir despesas fixas em todas as suas parcelas
const expandFixedExpenses = (expenses: Expense[]): Expense[] => {
  const expanded: Expense[] = [];
  
  expenses.forEach(expense => {
    // Se não for fixa, adiciona direto
    if (!expense.isFixed || !expense.fixedDurationMonths) {
      expanded.push(expense);
      return;
    }
    
    // Se for fixa, gera todas as parcelas virtuais
    const [day, month, year] = expense.date.split('/').map(Number);
    const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    
    for (let i = 0; i < expense.fixedDurationMonths; i++) {
      const parcelDate = startDate.add(i, 'month');
      
      // Cria uma cópia da despesa para este mês
      expanded.push({
        ...expense,
        id: `${expense.id}-parcel-${i}`, // ID único para cada parcela virtual
        date: parcelDate.format('DD/MM/YYYY'),
        isFixed: i === 0, // Só a primeira é template
      });
    }
  });
  
  return expanded;
};
```

### Passo 2: Usar a função antes de filtrar

Modifique o `filteredExpenses`:

```typescript
const filteredExpenses = useMemo(() => {
  // ✅ EXPANDIR DESPESAS FIXAS ANTES DE FILTRAR
  let filtered = expandFixedExpenses([...allExpensesForCenter]);
  
  // Resto dos filtros (período, categoria, etc.)
  const selectedMonth = selectedExpensePeriod.month();
  const selectedYear = selectedExpensePeriod.year();
  
  // ... resto do código igual
  
  return filtered.sort(...);
}, [allExpensesForCenter, expenseFilters, expenseMode, selectedExpensePeriod]);
```

---

## 🧪 Teste:

1. **Crie uma despesa fixa:**
   - Nome: "Aluguel"
   - Data: 01/12/2025
   - Duração: 12 meses

2. **Vá para o modo Anual (2025)**:
   - ✅ Gráfico deve mostrar "Aluguel" em Dezembro/2025

3. **Vá para o modo Anual (2026)**:
   - ✅ Gráfico deve mostrar "Aluguel" de Janeiro a Novembro/2026

---

## 📊 Alternativa: Modificar o Gráfico Diretamente

Se preferir, você pode modificar o **próprio componente `ExpenseBarChart`** para lidar com despesas fixas:

**Me envie o arquivo `ExpenseBarChart.tsx`** e eu adiciono a lógica de expansão lá dentro!

---

## 💡 Qual Solução Usar?

| Solução | Vantagens | Desvantagens |
|---------|-----------|--------------|
| **Solução 1: Gerar no Banco** | ✅ Simples<br>✅ Funciona em todos os lugares | ❌ Ocupa mais espaço no banco |
| **Solução 2: Expandir no Frontend** | ✅ Banco limpo<br>✅ Flexível | ❌ Precisa expandir em vários lugares |

**Recomendação:** Use **Solução 1** (gerar no banco) pois já está parcialmente implementada no `addExpense`.

---

## 🔍 Verificar Implementação Atual:

**Me responda:**

1. Quando você cria uma despesa fixa de 12 meses, quantas linhas aparecem no banco de dados? 
   - Execute este SQL:
   ```sql
   SELECT COUNT(*) as total
   FROM financial_transactions
   WHERE description = 'NOME_DA_DESPESA'
   AND type = 'DESPESA';
   ```

2. Se aparecer **apenas 1** → Precisa corrigir o `addExpense`
3. Se aparecer **12** → Problema é no filtro do gráfico

**Me diga o resultado e qual solução você prefere!** 🚀
