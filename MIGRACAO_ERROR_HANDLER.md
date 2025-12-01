# 🔄 Migração para Error Handler

## 📊 Status Atual

Após análise do código, identifiquei:

### ✅ **O que já está OK:**
- Alguns contextos já usam `logger.error` (bom!)
- Alguns lugares já usam `showError` (toast)

### ⚠️ **O que precisa melhorar:**
- Inconsistência: alguns erros só logam (`console.error`), outros mostram toast
- Erros críticos (salvar, deletar) não têm botão "Tentar Novamente"
- Erros de rede não têm retry automático
- Alguns erros são silenciosos quando deveriam mostrar algo

---

## 🎯 **Recomendação: Migração Gradual**

**NÃO é obrigatório migrar tudo de uma vez!**

Você pode:
1. ✅ **Usar o novo `errorHandler` em código novo**
2. ✅ **Migrar gradualmente** conforme for mexendo nos arquivos
3. ✅ **Priorizar operações críticas** (salvar, deletar)

---

## 📋 **Prioridades de Migração**

### 🔴 **Alta Prioridade** (Fazer primeiro)

#### 1. Operações Críticas (Salvar, Deletar)
**Por quê:** Usuário precisa saber se falhou e poder tentar novamente

**Arquivos:**
- `src/context/EquipmentContext.tsx` - `addEquipment`, `deleteEquipment`
- `src/context/FinancialContext.tsx` - `addExpense`, `updateExpense`, `deleteExpense`
- `src/context/ContractContext.tsx` - `addContract`, `deleteContract`
- `src/context/OrderContext.tsx` - `addOrder`, `updateOrder`

**Exemplo de migração:**
```typescript
// ❌ ANTES
try {
  await addEquipment(equipment);
} catch (error) {
  logger.error('Erro ao inserir equipamento:', error);
  showError('Erro ao salvar equipamento', 'Tente novamente');
  throw error;
}

// ✅ DEPOIS
try {
  await addEquipment(equipment);
} catch (error) {
  handleError(error, ErrorType.CRITICAL, {
    title: 'Erro ao salvar',
    message: 'Não foi possível salvar o equipamento. Tente novamente.',
    onRetry: () => addEquipment(equipment)
  });
  throw error; // Ainda joga o erro para quem chama
}
```

#### 2. Operações de Rede (Carregar dados)
**Por quê:** Podem se beneficiar de retry automático

**Arquivos:**
- `src/context/EquipmentContext.tsx` - `loadEquipments`
- `src/context/FinancialContext.tsx` - `loadExpenses`, `loadReceipts`
- `src/context/ContractContext.tsx` - `loadContracts`
- `src/context/OrderContext.tsx` - `loadOrders`

**Exemplo de migração:**
```typescript
// ❌ ANTES
const loadEquipments = async () => {
  try {
    // ... código ...
  } catch (err: any) {
    logger.error('Erro inesperado ao carregar equipments:', err);
    setError(err.message ?? 'Erro inesperado ao carregar equipamentos');
  }
};

// ✅ DEPOIS (com retry automático)
const loadEquipments = async () => {
  try {
    const data = await withRetry(() => {
      // ... código de carregamento ...
      return mapped;
    });
    setEquipments(data);
  } catch (err: any) {
    handleError(err, 'carregar equipamentos');
    setError(err.message ?? 'Erro inesperado ao carregar equipamentos');
  }
};
```

### 🟡 **Média Prioridade** (Fazer depois)

#### 3. Screens (Dashboard, etc)
**Arquivos:**
- `src/screens/DashboardScreen.tsx` - Exportar relatórios, ações rápidas
- `src/screens/FinanceiroScreen.tsx` - Operações financeiras
- `src/screens/PedidosScreen.tsx` - Operações de pedidos

**Exemplo:**
```typescript
// ❌ ANTES
} catch (error: any) {
  showError('Erro ao exportar', error.message || 'Tente novamente');
}

// ✅ DEPOIS
} catch (error: any) {
  handleError(error, 'exportar relatório', {
    onRetry: () => handleExportReport()
  });
}
```

### 🟢 **Baixa Prioridade** (Opcional)

#### 4. Erros Silenciosos
**Arquivos:**
- Qualquer lugar que só faz `console.error` sem mostrar ao usuário

**Exemplo:**
```typescript
// ❌ ANTES
} catch (error) {
  console.error('Erro ao atualizar badge:', error);
}

// ✅ DEPOIS
} catch (error) {
  handleError(error, ErrorType.SILENT);
}
```

---

## 🚀 **Plano de Ação Sugerido**

### **Fase 1: Operações Críticas** (1-2 horas)
1. Migrar `addEquipment` e `deleteEquipment`
2. Migrar `addExpense` e `updateExpense`
3. Migrar `addContract` e `deleteContract`
4. Migrar `addOrder` e `updateOrder`

### **Fase 2: Operações de Rede** (1 hora)
1. Migrar `loadEquipments` com `withRetry`
2. Migrar `loadExpenses` com `withRetry`
3. Migrar `loadContracts` com `withRetry`
4. Migrar `loadOrders` com `withRetry`

### **Fase 3: Screens** (1 hora)
1. Migrar erros no `DashboardScreen`
2. Migrar erros no `FinanceiroScreen`
3. Migrar erros no `PedidosScreen`

### **Fase 4: Limpeza** (30 min)
1. Substituir `console.error` por `handleError(..., ErrorType.SILENT)`
2. Remover `showError` genéricos

---

## 💡 **Dicas Importantes**

### 1. **Não precisa migrar tudo de uma vez**
- Migre conforme for mexendo nos arquivos
- Priorize o que mais impacta o usuário

### 2. **Mantenha o `throw error`**
- O `handleError` mostra ao usuário, mas ainda pode jogar o erro
- Isso permite que quem chama saiba que falhou

### 3. **Use modo automático quando possível**
```typescript
// ✅ Simples e funciona
handleError(error, 'salvar despesa');

// ✅ Use explícito quando precisa de controle
handleError(error, ErrorType.CRITICAL, {
  title: 'Título customizado',
  onRetry: customFunction
});
```

### 4. **Retry automático SÓ para leitura**
```typescript
// ✅ CORRETO
const data = await withRetry(() => loadEquipments());

// ❌ ERRADO
await withRetry(() => saveExpense()); // Pode duplicar!
```

---

## 📝 **Checklist de Migração**

Para cada arquivo migrado:

- [ ] Substituir `console.error` por `handleError`
- [ ] Substituir `showError` genérico por `handleError` com tipo correto
- [ ] Adicionar `onRetry` em operações críticas
- [ ] Usar `withRetry` em operações de leitura
- [ ] Testar se os erros aparecem corretamente
- [ ] Testar se o botão "Tentar Novamente" funciona

---

## 🎯 **Conclusão**

**Resposta curta:** 
- ✅ **Não é obrigatório** migrar tudo agora
- ✅ **Recomendado** migrar gradualmente
- ✅ **Priorizar** operações críticas e de rede

**Quando migrar:**
- Quando for mexer no arquivo mesmo
- Quando encontrar um bug relacionado a erros
- Quando tiver tempo para melhorar a UX

**O app funciona sem migração**, mas ficará mais consistente e profissional com ela! 🚀

