# 🔧 DIAGNÓSTICO - Despesas Fixas no Gráfico por Setor

## 📋 Problema:

Despesa fixa com setor definido:
- ✅ Aparece no **primeiro mês** do gráfico por setor
- ❌ **NÃO aparece** nos meses subsequentes da duração

**Exemplo:**
- Despesa: "Aluguel"
- Setor: "gestao"
- Duração: 12 meses (Dez/2025 a Nov/2026)
- Gráfico por setor: Só mostra em Dezembro/2025

---

## 🔍 Possível Causa:

O componente `ExpenseSectorChart` provavelmente está recebendo `filteredExpenses`, que **filtra por período mensal**.

Quando você está visualizando **Dezembro/2025**, o `filteredExpenses` só contém despesas de Dezembro. As parcelas de Janeiro, Fevereiro, etc. não estão incluídas.

---

## ✅ SOLUÇÃO:

Precisamos verificar o arquivo `ExpenseSectorChart.tsx` (ou `.jsx`) para entender como ele está processando as despesas.

---

## 📤 Me envie o arquivo:

**Por favor, me envie o código do arquivo:**
- `src/components/ExpenseSectorChart.tsx`
- ou `components/ExpenseSectorChart.tsx`

Ou qualquer arquivo que contenha o componente `ExpenseSectorChart`.

---

## 💡 Soluções Prováveis:

### Solução 1: Passar todas as despesas do ano

Em vez de passar `filteredExpenses` (que filtra por mês), passar todas as despesas do ano:

**No FinanceiroScreen.tsx, localize:**
```typescript
<ExpenseSectorChart expenses={filteredExpenses} />
```

**Pode precisar mudar para:**
```typescript
<ExpenseSectorChart 
  expenses={allExpensesForCenter} 
  selectedPeriod={selectedExpensePeriod}
  mode={expenseMode}
/>
```

E então o `ExpenseSectorChart` faz o filtro internamente.

---

### Solução 2: Modificar o ExpenseSectorChart

O componente pode estar agrupando por setor sem considerar que despesas fixas se estendem por vários meses.

---

## 🧪 Teste Rápido:

Para confirmar o problema, execute este SQL:

```sql
-- Ver todas as parcelas de uma despesa fixa
SELECT 
    TO_CHAR(date::date, 'Mon/YYYY') as mes,
    sector,
    is_fixed,
    installment_number
FROM financial_transactions
WHERE type = 'DESPESA'
  AND description = 'NOME_DA_DESPESA_COM_SETOR'  -- Substitua aqui
ORDER BY date;
```

**Resultado esperado:**
- Todas as parcelas devem ter o mesmo `sector`
- Ex: sector = "gestao" em todos os 12 registros

Se o sector está NULL nas parcelas geradas, esse é o problema!

---

## ❓ Perguntas:

1. **As parcelas geradas têm o campo `sector` preenchido?** (Execute o SQL acima)
2. **Me envie o código do `ExpenseSectorChart.tsx`** para eu corrigir

Enquanto isso, vou criar uma correção genérica! 📝
