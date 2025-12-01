# 🔧 CORREÇÃO - Gráfico por Setor (ExpenseSectorChart)

## ✅ Diagnóstico Confirmado:

**SQL mostrou:**
- ✅ Todas as 12 parcelas têm `sector = "felipe_viatransportes"`
- ✅ Banco de dados está **CORRETO**

**Problema:**
- ❌ Gráfico só mostra no primeiro mês
- ❌ Problema está no componente `ExpenseSectorChart`

---

## 🔍 Causa Provável:

O componente `ExpenseSectorChart` está recebendo `filteredExpenses`, que **só contém despesas do mês selecionado**.

**No FinanceiroScreen.tsx (linha ~1126):**
```typescript
<ExpenseSectorChart expenses={filteredExpenses} />
```

O `filteredExpenses` é filtrado assim:
```typescript
const filteredExpenses = useMemo(() => {
  let filtered = [...allExpensesForCenter];
  
  // Filtrar por período (Mensal/Anual)
  const selectedMonth = selectedExpensePeriod.month();
  const selectedYear = selectedExpensePeriod.year();
  
  // ... filtra apenas o mês/ano selecionado
  
  return filtered;
}, [allExpensesForCenter, expenseMode, selectedExpensePeriod]);
```

**Exemplo:**
- Modo: **Mensal - Dezembro/2025**
- `filteredExpenses`: Só despesas de **Dezembro/2025**
- Gráfico por setor: Só mostra Dezembro ❌

---

## ✅ SOLUÇÃO 1: Passar todas as despesas do período (Recomendado)

### No FinanceiroScreen.tsx (linha ~1126):

**LOCALIZE:**
```typescript
<ExpenseSectorChart expenses={filteredExpenses} />
```

**SUBSTITUA POR:**
```typescript
<ExpenseSectorChart 
  expenses={allExpensesForCenter} 
  selectedPeriod={selectedExpensePeriod}
  mode={expenseMode}
/>
```

### No ExpenseSectorChart.tsx:

**O componente precisa:**
1. Receber `selectedPeriod` e `mode` como props
2. Filtrar internamente baseado no modo (mensal/anual)

**Props do componente:**
```typescript
interface ExpenseSectorChartProps {
  expenses: Expense[];
  selectedPeriod?: Dayjs; // ✅ ADICIONAR
  mode?: 'mensal' | 'anual'; // ✅ ADICIONAR
}

export const ExpenseSectorChart = ({ 
  expenses, 
  selectedPeriod, 
  mode = 'mensal' 
}: ExpenseSectorChartProps) => {
  // Filtra as despesas baseado no modo
  const filteredExpenses = useMemo(() => {
    if (!selectedPeriod) return expenses;
    
    const selectedMonth = selectedPeriod.month();
    const selectedYear = selectedPeriod.year();
    
    return expenses.filter(expense => {
      const [day, month, year] = expense.date.split('/').map(Number);
      if (!day || !month || !year) return false;
      
      if (mode === 'anual') {
        // Modo anual: inclui todo o ano
        return year === selectedYear;
      } else {
        // Modo mensal: inclui só o mês
        return month - 1 === selectedMonth && year === selectedYear;
      }
    });
  }, [expenses, selectedPeriod, mode]);
  
  // Agrupa por setor
  const expensesBySector = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    filteredExpenses.forEach(expense => {
      if (!expense.sector) return;
      
      if (!grouped[expense.sector]) {
        grouped[expense.sector] = 0;
      }
      grouped[expense.sector] += expense.value;
    });
    
    return grouped;
  }, [filteredExpenses]);
  
  // ... resto do componente
};
```

---

## ✅ SOLUÇÃO 2: Usar filteredExpenses mas sem filtro de período

Se você quiser manter a estrutura atual, crie um `filteredExpensesForCharts`:

### No FinanceiroScreen.tsx:

**ADICIONE este useMemo ANTES do `filteredExpenses`:**
```typescript
// Despesas para gráficos (sem filtro de mês específico)
const expensesForCharts = useMemo(() => {
  let filtered = [...allExpensesForCenter];
  
  // Filtra apenas por ano (não por mês)
  const selectedYear = selectedExpensePeriod.year();
  
  filtered = filtered.filter((expense) => {
    const [day, month, year] = expense.date.split('/').map(Number);
    if (!day || !month || !year) return false;
    
    if (expenseMode === 'anual') {
      return year === selectedYear;
    } else {
      // Modo mensal: ainda assim inclui todo o ano para os gráficos
      return year === selectedYear;
    }
  });
  
  // Aplica outros filtros (categoria, equipamento, etc.)
  if (expenseFilters.category) {
    filtered = filtered.filter((expense) => expense.category === expenseFilters.category);
  }
  
  if (expenseFilters.equipmentId) {
    filtered = filtered.filter((expense) => expense.equipmentId === expenseFilters.equipmentId);
  }
  
  return filtered;
}, [allExpensesForCenter, expenseMode, selectedExpensePeriod, expenseFilters]);
```

**DEPOIS, USE nos gráficos:**
```typescript
<ExpensePieChart 
  expenses={expensesForCharts} 
  mode={expenseMode} 
  selectedPeriod={selectedExpensePeriod} 
/>
<ExpenseBarChart expenses={expensesForCharts} />
<ExpenseSectorChart expenses={expensesForCharts} />
```

---

## 📊 Comparação das Soluções:

| Solução | Vantagens | Desvantagens |
|---------|-----------|--------------|
| **Solução 1** | ✅ Cada componente filtra como precisa<br>✅ Mais flexível | ❌ Precisa modificar cada componente |
| **Solução 2** | ✅ Não precisa modificar componentes<br>✅ Centralizado | ❌ Menos flexível |

---

## 🧪 Teste:

1. **Aplique a Solução 2** (mais simples, não precisa modificar o ExpenseSectorChart)

2. **Vá para Financeiro → Despesas → Modo Mensal**

3. **Selecione Dezembro/2025**

4. **Veja o gráfico por setor:**
   - ✅ Deve mostrar "felipe_viatransportes" com o valor da despesa de Dezembro

5. **Selecione Janeiro/2026**
   - ✅ Deve mostrar "felipe_viatransportes" com o valor da despesa de Janeiro

6. **Vá para Modo Anual → 2026**
   - ✅ Deve mostrar "felipe_viatransportes" com a soma de todas as parcelas de 2026

---

## 💡 Qual Solução Usar?

**Recomendo Solução 2** porque:
- ✅ Mais rápida de implementar
- ✅ Não precisa modificar os componentes de gráfico
- ✅ Resolve o problema de todos os gráficos de uma vez

Depois, se precisar de mais controle, pode migrar para Solução 1.

---

## 📝 Resumo da Correção:

**Problema:** `filteredExpenses` filtra por mês específico, então os gráficos só veem despesas daquele mês.

**Solução:** Criar `expensesForCharts` que filtra por **ano** (não por mês), para os gráficos verem todas as despesas do ano.

**Resultado:** Gráficos mostram despesas fixas em **todos os meses** da duração! 🎉

---

**Aplique a Solução 2 e me diga se funcionou!** 🚀
