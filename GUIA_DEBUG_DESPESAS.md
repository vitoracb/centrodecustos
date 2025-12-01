# 🔍 DEBUG - Por que a despesa indefinida não está gerando parcelas?

## Passo 1: Execute o SQL de Diagnóstico

Execute o arquivo: **diagnostico_despesas_indefinidas.sql**

Me envie uma captura de tela dos resultados das 3 queries, especialmente:
- Query 1: Mostra se `fixed_duration_months` está NULL
- Query 2: Mostra quantas parcelas foram geradas (deveria ser > 1)

---

## Passo 2: Verifique o Console do App

Após criar uma despesa fixa INDEFINIDA, procure no console por estes logs:

### ✅ Logs esperados DURANTE a criação:

```
📌 Despesa fixa "Nome" criada SEM duração definida - aparecerá apenas no mês selecionado
```
OU
```
✅ Despesa fixa "Nome" criada com duração definida: 3 meses - gerará parcelas
```

### ✅ Logs esperados 2 segundos APÓS a criação:

```
🔄 Executando geração de fixos (despesas e receitas)...
📅 Despesa fixa "Nome": duração INDEFINIDA (recorrente), gerando até X meses
🔍 Verificando despesa fixa para 12/2025, descrição: Nome, parcela: 2
📝 Criando despesa fixa gerada: Nome em 2025-12-01, parcela: 2/∞
```

---

## Passo 3: Possíveis Problemas

### Problema A: fixed_duration_months não está NULL

Se no SQL a despesa aparece com `fixed_duration_months = 3` (ou qualquer número), significa que o formulário está enviando um valor quando não deveria.

**Solução**: Me envie o código do formulário onde você cria a despesa fixa.

---

### Problema B: A função generateFixedExpenses não está sendo executada

Se NÃO aparecer no console:
```
🔄 Executando geração de fixos (despesas e receitas)...
```

**Possíveis causas:**
1. O código que faz o `useEffect` está comentado ou foi removido
2. O timer de 2 segundos não está funcionando
3. Há um erro antes de chegar nessa parte

**Solução**: Verifique no final do arquivo FinancialContext.tsx (linhas ~2096-2114) se tem este código:

```typescript
useEffect(() => {
  let hasRun = false;
  const timer = setTimeout(async () => {
    if (hasRun) {
      console.log("⚠️ generateFixedReceipts já foi executado, pulando...");
      return;
    }
    hasRun = true;
    console.log("🔄 Executando geração de fixos (despesas e receitas)...");
    await generateFixedExpenses();
    await generateFixedReceipts();
  }, 2000);

  return () => {
    clearTimeout(timer);
    hasRun = false;
  };
}, [generateFixedExpenses, generateFixedReceipts]);
```

---

### Problema C: A correção não foi aplicada corretamente

Verifique se na função `generateFixedExpenses` (linha ~1942-1990) você tem:

```typescript
} else {
  // Sem duração definida (indefinida/recorrente) - gera até o mês atual + 3 meses à frente
  const monthsSinceCreation =
    (currentYear - creationYear) * 12 + (currentMonth - creationMonth);
  totalMonthsToGenerate = monthsSinceCreation + 3; // Gera sempre 3 meses à frente
  console.log(`📅 Despesa fixa "${fixedExpense.description}": duração INDEFINIDA (recorrente), gerando até ${totalMonthsToGenerate} meses (atual + 3 meses à frente)`);
}
```

E mais abaixo (linha ~1962-1978):

```typescript
// Só aplica limite para despesas COM duração definida
if (fixedExpense.fixed_duration_months !== null && fixedExpense.fixed_duration_months !== undefined) {
  if (targetYear > currentYear || (targetYear === currentYear && actualMonth > currentMonth)) {
    break;
  }
}
```

---

## Passo 4: Teste Manual

Force a execução da geração de fixos:

1. Abra o console do React Native Debugger (ou Expo console)
2. No app, vá para qualquer tela e volte
3. Aguarde 2 segundos
4. Verifique se aparecem os logs

**OU**

Adicione um botão de teste temporário no app para chamar `generateFixedExpenses()` manualmente.

---

## Passo 5: Me envie essas informações

Para eu identificar o problema exato, me envie:

1. **Captura do SQL** (resultado das 3 queries)
2. **Captura do Console** (após criar uma despesa fixa indefinida)
3. **Confirmação**: Você aplicou a correção no arquivo FinancialContext.tsx?
4. **Confirmação**: Você reiniciou o servidor com `npx expo start -c`?

---

## ⚡ Solução Rápida - Force a Geração

Se quiser testar imediatamente, adicione este botão temporário em qualquer tela:

```typescript
import { useFinancial } from '@/src/contexts/FinancialContext';

// Dentro do componente:
const { generateFixedExpenses } = useFinancial();

// No JSX:
<TouchableOpacity 
  onPress={async () => {
    console.log("🔘 Botão pressionado - forçando geração");
    await generateFixedExpenses();
    console.log("✅ Geração concluída");
  }}
  style={{ padding: 20, backgroundColor: 'red' }}
>
  <Text style={{ color: 'white' }}>TESTE: Gerar Fixos</Text>
</TouchableOpacity>
```

Pressione o botão e veja o que aparece no console!
