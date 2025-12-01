# 📖 Guia de Uso - Error Handler

## 🎯 Visão Geral

O `errorHandler.ts` padroniza o tratamento de erros no app, garantindo consistência na experiência do usuário.

---

## 🚀 Como Usar

### 1. Modo Explícito (Controle Total)

Use quando você quer especificar exatamente o tipo de erro:

```typescript
import { handleError, ErrorType } from '@/src/lib/errorHandler';

try {
  await saveExpense(expenseData);
  showSuccess('Despesa salva!');
} catch (error) {
  handleError(error, ErrorType.CRITICAL, {
    title: 'Erro ao salvar',
    message: 'Não foi possível salvar a despesa. Tente novamente.',
    onRetry: () => saveExpense(expenseData)
  });
}
```

### 2. Modo Automático (Simples)

Use quando quer que o sistema detecte automaticamente o tipo:

```typescript
import { handleError } from '@/src/lib/errorHandler';

try {
  await loadEquipments();
} catch (error) {
  handleError(error, 'carregar equipamentos');
  // Detecta automaticamente: NETWORK
  // Gera mensagem: "Erro ao carregar equipamentos. Verifique sua conexão..."
}
```

---

## 📋 Exemplos Práticos

### Exemplo 1: Salvar Despesa (Crítico)

```typescript
const handleSave = async () => {
  try {
    await addExpense(expenseData);
    showSuccess('Despesa salva com sucesso!');
    onClose();
  } catch (error) {
    handleError(error, ErrorType.CRITICAL, {
      title: 'Erro ao salvar',
      message: 'Não foi possível salvar a despesa. Verifique sua conexão e tente novamente.',
      onRetry: () => handleSave()
    });
  }
};
```

### Exemplo 2: Carregar Equipamentos (Rede)

```typescript
// Modo automático
const loadData = async () => {
  try {
    const data = await loadEquipments();
    setEquipments(data);
  } catch (error) {
    handleError(error, 'carregar equipamentos');
  }
};

// OU com retry automático (só para leitura!)
const loadDataWithRetry = async () => {
  try {
    const data = await withRetry(() => loadEquipments());
    setEquipments(data);
  } catch (error) {
    handleError(error, 'carregar equipamentos');
  }
};
```

### Exemplo 3: Validação de Formulário

```typescript
const handleSubmit = () => {
  if (!name.trim()) {
    handleError(
      new Error('Nome é obrigatório'),
      ErrorType.VALIDATION,
      {
        title: 'Campo obrigatório',
        message: 'Por favor, preencha o nome da despesa.'
      }
    );
    return;
  }
  
  if (value <= 0) {
    handleError(
      new Error('Valor inválido'),
      ErrorType.VALIDATION,
      {
        message: 'O valor deve ser maior que zero.'
      }
    );
    return;
  }
  
  // Continua...
};
```

### Exemplo 4: Erro de Permissão

```typescript
const handleTakePhoto = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  
  if (!permission.granted) {
    handleError(
      new Error('Permissão de câmera negada'),
      ErrorType.VALIDATION,
      {
        title: 'Permissão necessária',
        message: 'Para tirar fotos, é necessário permitir o acesso à câmera.',
        openSettings: true // ✅ Mostra botão "Abrir Configurações"
      }
    );
    return;
  }
  
  // Continua...
};
```

### Exemplo 5: Erro Silencioso (Badge, Contador)

```typescript
const updateNotificationBadge = async () => {
  try {
    await updateBadge();
  } catch (error) {
    // Não mostra nada ao usuário, apenas loga
    handleError(error, ErrorType.SILENT);
  }
};
```

---

## ⚠️ Regras Importantes

### 1. Retry Automático - SÓ PARA LEITURA

```typescript
// ✅ CORRETO: Operação de leitura
const data = await withRetry(() => loadEquipments());
const expenses = await withRetry(() => loadExpenses());

// ❌ ERRADO: Operação de escrita
await withRetry(() => saveExpense()); // Pode salvar múltiplas vezes!
await withRetry(() => deleteEquipment(id)); // Pode deletar múltiplas vezes!
```

### 2. Botão "Tentar Novamente" - Para Operações Críticas

```typescript
// ✅ CORRETO: Usa onRetry para operações críticas
handleError(error, ErrorType.CRITICAL, {
  onRetry: () => saveExpense()
});

// ✅ CORRETO: Usa onRetry para operações de rede
handleError(error, ErrorType.NETWORK, {
  onRetry: () => loadData()
});
```

### 3. Modo Automático vs Explícito

```typescript
// ✅ Use automático para operações simples
handleError(error, 'carregar equipamentos');
handleError(error, 'salvar despesa');

// ✅ Use explícito quando precisa de controle
handleError(error, ErrorType.CRITICAL, {
  title: 'Título customizado',
  message: 'Mensagem específica',
  onRetry: customRetryFunction
});
```

---

## 📊 Tipos de Erro

| Tipo | Quando Usar | Como Exibe | Exemplo |
|------|-------------|------------|---------|
| **CRITICAL** | Salvar, deletar, aprovar | `Alert.alert` com retry | Salvar despesa |
| **NETWORK** | Carregar, buscar, sincronizar | `Toast` ou `Alert` com retry | Carregar lista |
| **VALIDATION** | Erros de formulário | `Alert.alert` | Campo vazio |
| **SILENT** | Funcionalidades secundárias | Apenas log | Badge, contador |

---

## 🔄 Migração de Código Existente

### Antes:
```typescript
try {
  await saveExpense();
} catch (error) {
  Alert.alert('Erro', 'Não foi possível salvar');
}
```

### Depois:
```typescript
try {
  await saveExpense();
} catch (error) {
  handleError(error, 'salvar despesa', {
    onRetry: () => saveExpense()
  });
}
```

---

## 💡 Dicas

1. **Use modo automático** para a maioria dos casos
2. **Use modo explícito** quando precisa de mensagens customizadas
3. **Use `withRetry`** apenas para operações de leitura
4. **Use `onRetry`** para operações críticas que o usuário pode tentar novamente
5. **Use `openSettings`** para erros de permissão

---

## 🎯 Próximos Passos

1. Substituir `Alert.alert` por `handleError` nos contextos
2. Substituir `showError` genérico por `handleError` com tipo correto
3. Adicionar `onRetry` em operações críticas
4. Usar `withRetry` em operações de leitura

---

**Pronto para usar!** 🚀

