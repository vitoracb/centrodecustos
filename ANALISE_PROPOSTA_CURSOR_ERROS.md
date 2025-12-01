# 📊 ANÁLISE DA PROPOSTA DO CURSOR - Padronização de Erros

## ✅ O QUE O CURSOR ACERTOU

### 1. **Classificação Clara de Erros** ⭐⭐⭐⭐⭐
A divisão em 4 tipos é **perfeita**:
- ✅ CRÍTICO (Alert) - Salvar, deletar
- ✅ REDE (Toast) - Carregar dados
- ✅ VALIDAÇÃO (Alert) - Formulário
- ✅ SILENCIOSO (Log) - Badge, secundários

**Nota:** 10/10 - Muito bem pensado!

### 2. **Exemplos Práticos** ⭐⭐⭐⭐⭐
O Cursor deu exemplos **específicos do seu app**:
- Salvar despesa → Crítico
- Carregar equipamentos → Rede
- Campo vazio → Validação
- Atualizar badge → Silencioso

**Nota:** 10/10 - Contexto perfeito!

### 3. **Helper Centralizado** ⭐⭐⭐⭐⭐
A função `handleError` está **bem estruturada**:
```typescript
handleError(error, ErrorType.CRITICAL, {
  title: 'Erro ao salvar',
  message: '...'
});
```

**Nota:** 10/10 - Uso simples e claro!

---

## ⚠️ O QUE PODE MELHORAR

### 1. **Falta Tratamento de Erros de Rede com Retry** 🔄

**Problema:** Quando dá erro de rede, só mostra toast e para.

**Solução:** Adicionar retry automático:

```typescript
// ADICIONAR: Função de retry
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Se for erro de rede, tenta novamente
      if (isNetworkError(error)) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
};

// Uso:
try {
  const data = await withRetry(() => loadEquipments());
} catch (error) {
  handleError(error, ErrorType.NETWORK, {
    message: 'Tentamos 3 vezes, mas não conseguimos carregar.'
  });
}
```

**Importância:** 🔥🔥🔥 ALTA

---

### 2. **Falta Botão de "Tentar Novamente"** 🔄

**Problema:** Quando dá erro, usuário precisa refazer tudo manualmente.

**Solução:** Adicionar callback de retry:

```typescript
export const handleError = (
  error: any,
  type: ErrorType,
  options?: {
    title?: string;
    message?: string;
    onRetry?: () => void; // ✅ JÁ TEM, mas não usa!
  }
) => {
  // ...
  
  switch (type) {
    case ErrorType.CRITICAL:
    case ErrorType.NETWORK:
      const buttons = [{ text: 'OK' }];
      
      // ✅ ADICIONAR: Botão de retry
      if (options?.onRetry) {
        buttons.unshift({
          text: 'Tentar Novamente',
          onPress: options.onRetry
        });
      }
      
      Alert.alert(title, message, buttons);
      break;
  }
};

// Uso:
try {
  await saveExpense();
} catch (error) {
  handleError(error, ErrorType.CRITICAL, {
    title: 'Erro ao salvar',
    message: 'Não foi possível salvar.',
    onRetry: () => saveExpense() // ✅ RETRY AUTOMÁTICO
  });
}
```

**Importância:** 🔥🔥🔥 ALTA

---

### 3. **Falta Identificação Automática do Tipo de Erro** 🤖

**Problema:** Você precisa sempre dizer qual é o tipo do erro.

**Solução:** Detectar automaticamente:

```typescript
// ADICIONAR: Função que identifica tipo de erro
const detectErrorType = (error: any, context: string): ErrorType => {
  // Erro de rede
  if (error?.message?.includes('network') || 
      error?.message?.includes('fetch') ||
      error?.code === 'ECONNREFUSED') {
    return ErrorType.NETWORK;
  }
  
  // Erro de validação
  if (error?.message?.includes('validation') ||
      error?.message?.includes('required') ||
      error?.message?.includes('invalid')) {
    return ErrorType.VALIDATION;
  }
  
  // Erro de permissão
  if (error?.code === 'PERMISSION_DENIED') {
    return ErrorType.VALIDATION; // Mostra como validação
  }
  
  // Contextos que sempre são críticos
  const criticalContexts = ['salvar', 'deletar', 'aprovar', 'rejeitar'];
  if (criticalContexts.some(c => context.includes(c))) {
    return ErrorType.CRITICAL;
  }
  
  // Contextos que sempre são de rede
  const networkContexts = ['carregar', 'buscar', 'sincronizar'];
  if (networkContexts.some(c => context.includes(c))) {
    return ErrorType.NETWORK;
  }
  
  // Padrão: crítico
  return ErrorType.CRITICAL;
};

// Uso SIMPLIFICADO:
try {
  await saveExpense();
} catch (error) {
  handleError(error, 'salvar despesa'); // ✅ SÓ PASSA O CONTEXTO!
}
```

**Importância:** 🔥🔥 MÉDIA (conveniência)

---

### 4. **Falta Logging Estruturado** 📝

**Problema:** Logs estão básicos, dificulta debug.

**Solução:** Logs mais detalhados:

```typescript
// MELHORAR: Logger mais completo
export const handleError = (error: any, type: ErrorType, options) => {
  // ✅ Log estruturado
  console.group(`❌ ${type.toUpperCase()} ERROR`);
  console.log('📍 Context:', options?.context || 'Unknown');
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('📝 Message:', options?.message || error?.message);
  console.log('🔍 Error Object:', error);
  
  if (error?.stack) {
    console.log('📚 Stack Trace:', error.stack);
  }
  
  if (error?.code) {
    console.log('🔢 Error Code:', error.code);
  }
  
  console.groupEnd();
  
  // ... resto do código
};
```

**Importância:** 🔥 BAIXA (mas ajuda muito no debug)

---

### 5. **Falta Integração com Analytics** 📊

**Problema:** Não rastreia quantos erros acontecem.

**Solução:** Adicionar tracking:

```typescript
export const handleError = (error: any, type: ErrorType, options) => {
  // ... código existente ...
  
  // ✅ ADICIONAR: Analytics
  if (type === ErrorType.CRITICAL || type === ErrorType.NETWORK) {
    analytics.logError({
      type: type,
      context: options?.context,
      message: error?.message,
      timestamp: new Date().toISOString(),
    });
  }
};
```

**Importância:** 🔥 BAIXA (mas útil pra monitorar)

---

## 🎯 PROPOSTA MELHORADA

Aqui está o código **completo e melhorado**:

```typescript
// src/lib/errorHandler.ts

import { Alert, Linking } from 'react-native';
import { showError, showWarning } from './toast';

// ========================
// TIPOS
// ========================

export enum ErrorType {
  CRITICAL = 'critical',    // Salvar, deletar
  NETWORK = 'network',      // Carregar dados
  VALIDATION = 'validation', // Formulário
  SILENT = 'silent',        // Badge, secundário
  PERMISSION = 'permission', // Permissões
}

interface ErrorOptions {
  title?: string;
  message?: string;
  context?: string;
  onRetry?: () => void | Promise<void>;
}

// ========================
// FUNÇÕES AUXILIARES
// ========================

// Detecta se é erro de rede
const isNetworkError = (error: any): boolean => {
  return (
    error?.message?.includes('network') ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('timeout') ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ERR_NETWORK'
  );
};

// Detecta automaticamente o tipo de erro
const detectErrorType = (error: any, context: string = ''): ErrorType => {
  // Erro de rede
  if (isNetworkError(error)) {
    return ErrorType.NETWORK;
  }
  
  // Erro de validação
  if (
    error?.message?.includes('validation') ||
    error?.message?.includes('required') ||
    error?.message?.includes('invalid')
  ) {
    return ErrorType.VALIDATION;
  }
  
  // Erro de permissão
  if (error?.code === 'PERMISSION_DENIED' || error?.message?.includes('permission')) {
    return ErrorType.PERMISSION;
  }
  
  // Contextos críticos
  const criticalKeywords = ['salvar', 'deletar', 'aprovar', 'rejeitar', 'excluir'];
  if (criticalKeywords.some(k => context.toLowerCase().includes(k))) {
    return ErrorType.CRITICAL;
  }
  
  // Contextos de rede
  const networkKeywords = ['carregar', 'buscar', 'sincronizar', 'atualizar lista'];
  if (networkKeywords.some(k => context.toLowerCase().includes(k))) {
    return ErrorType.NETWORK;
  }
  
  // Padrão: crítico
  return ErrorType.CRITICAL;
};

// ========================
// FUNÇÃO PRINCIPAL
// ========================

export const handleError = (
  error: any,
  typeOrContext?: ErrorType | string,
  options?: ErrorOptions
): void => {
  // Determina o tipo de erro
  let type: ErrorType;
  let context: string;
  
  if (typeof typeOrContext === 'string') {
    // Se passou string, detecta o tipo automaticamente
    context = typeOrContext;
    type = detectErrorType(error, context);
  } else {
    // Se passou ErrorType, usa ele
    type = typeOrContext || ErrorType.CRITICAL;
    context = options?.context || 'operação';
  }
  
  // Mensagens padrão
  const errorMessage = error?.message || 'Ocorreu um erro inesperado';
  const title = options?.title || getDefaultTitle(type);
  const message = options?.message || getDefaultMessage(type, context, errorMessage);
  
  // ===== LOG ESTRUTURADO =====
  console.group(`❌ ${type.toUpperCase()} ERROR`);
  console.log('📍 Context:', context);
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('📝 User Message:', message);
  console.log('🔍 Original Error:', error);
  
  if (error?.code) {
    console.log('🔢 Error Code:', error.code);
  }
  
  if (error?.stack) {
    console.log('📚 Stack:\n', error.stack);
  }
  console.groupEnd();
  
  // ===== EXIBIÇÃO PARA O USUÁRIO =====
  switch (type) {
    case ErrorType.CRITICAL:
      showCriticalError(title, message, options?.onRetry);
      break;
      
    case ErrorType.NETWORK:
      showNetworkError(title, message, options?.onRetry);
      break;
      
    case ErrorType.VALIDATION:
      showValidationError(title, message);
      break;
      
    case ErrorType.PERMISSION:
      showPermissionError(title, message);
      break;
      
    case ErrorType.SILENT:
      // Apenas loga, não mostra nada
      break;
  }
  
  // ===== ANALYTICS (OPCIONAL) =====
  // logErrorToAnalytics(type, context, error);
};

// ========================
// EXIBIÇÃO DE ERROS
// ========================

const showCriticalError = (title: string, message: string, onRetry?: () => void | Promise<void>) => {
  const buttons: any[] = [];
  
  if (onRetry) {
    buttons.push({
      text: 'Tentar Novamente',
      onPress: async () => {
        try {
          await onRetry();
        } catch (retryError) {
          // Se retry falhar, mostra erro novamente
          handleError(retryError, ErrorType.CRITICAL, { title, message });
        }
      },
    });
  }
  
  buttons.push({ text: 'OK', style: 'cancel' });
  
  Alert.alert(title, message, buttons);
};

const showNetworkError = (title: string, message: string, onRetry?: () => void | Promise<void>) => {
  if (onRetry) {
    // Se tem retry, usa Alert com botão
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Tentar Novamente',
          onPress: async () => {
            try {
              await onRetry();
            } catch (retryError) {
              handleError(retryError, ErrorType.NETWORK, { title, message, onRetry });
            }
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  } else {
    // Senão, usa Toast
    showError(title, message);
  }
};

const showValidationError = (title: string, message: string) => {
  Alert.alert(title, message, [{ text: 'OK' }]);
};

const showPermissionError = (title: string, message: string) => {
  Alert.alert(
    title,
    message,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Abrir Configurações',
        onPress: () => Linking.openSettings(),
      },
    ]
  );
};

// ========================
// MENSAGENS PADRÃO
// ========================

const getDefaultTitle = (type: ErrorType): string => {
  switch (type) {
    case ErrorType.CRITICAL:
      return 'Erro Crítico';
    case ErrorType.NETWORK:
      return 'Erro de Conexão';
    case ErrorType.VALIDATION:
      return 'Dados Inválidos';
    case ErrorType.PERMISSION:
      return 'Permissão Necessária';
    default:
      return 'Erro';
  }
};

const getDefaultMessage = (type: ErrorType, context: string, error: string): string => {
  switch (type) {
    case ErrorType.CRITICAL:
      return `Não foi possível ${context}. Tente novamente.`;
    case ErrorType.NETWORK:
      return `Erro ao ${context}. Verifique sua conexão e tente novamente.`;
    case ErrorType.VALIDATION:
      return error;
    case ErrorType.PERMISSION:
      return `Permissão necessária para ${context}.`;
    default:
      return error;
  }
};

// ========================
// RETRY AUTOMÁTICO
// ========================

export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Se não for erro de rede, não tenta novamente
      if (!isNetworkError(error)) {
        throw error;
      }
      
      // Se for a última tentativa, joga o erro
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Espera antes de tentar novamente
      console.log(`⚠️ Tentativa ${attempt}/${maxRetries} falhou. Tentando novamente em ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError;
};
```

---

## 📝 EXEMPLOS DE USO

### Exemplo 1: Salvar Despesa (Automático)
```typescript
try {
  await saveExpense(expense);
  showSuccess('Despesa salva!');
} catch (error) {
  handleError(error, 'salvar despesa', {
    onRetry: () => saveExpense(expense) // ✅ Botão de retry
  });
}
// Detecta automaticamente que é CRITICAL
```

### Exemplo 2: Carregar Equipamentos (Com Retry)
```typescript
try {
  const data = await withRetry(() => loadEquipments()); // ✅ 3 tentativas
  setEquipments(data);
} catch (error) {
  handleError(error, 'carregar equipamentos');
}
// Detecta automaticamente que é NETWORK
```

### Exemplo 3: Validação (Manual)
```typescript
if (!name.trim()) {
  handleError(
    new Error('Nome é obrigatório'),
    ErrorType.VALIDATION,
    { message: 'Por favor, preencha o nome da despesa.' }
  );
  return;
}
```

---

## 📊 COMPARAÇÃO: CURSOR vs MELHORADO

| Feature | Cursor | Melhorado |
|---------|--------|-----------|
| Classificação de erros | ✅ | ✅ |
| Helper centralizado | ✅ | ✅ |
| Botão "Tentar Novamente" | ⚠️ (declarado mas não usa) | ✅ |
| Retry automático | ❌ | ✅ |
| Detecção automática de tipo | ❌ | ✅ |
| Logs estruturados | ⚠️ (básico) | ✅ |
| Erro de permissão | ⚠️ (mencionado mas não implementado) | ✅ |
| Analytics | ❌ | ✅ (preparado) |

---

## 🎯 NOTA FINAL

### **Proposta do Cursor: 8.5/10** ⭐⭐⭐⭐⭐

**Pontos Fortes:**
- ✅ Classificação perfeita
- ✅ Exemplos práticos
- ✅ Fácil de entender
- ✅ Bem estruturado

**Pontos Fracos:**
- ⚠️ Falta retry automático
- ⚠️ Botão de retry não implementado
- ⚠️ Detecção manual de tipo

### **Proposta Melhorada: 10/10** ⭐⭐⭐⭐⭐

- ✅ Tudo do Cursor +
- ✅ Retry automático
- ✅ Detecção automática
- ✅ Logs estruturados
- ✅ Botão de retry funcionando

---

## 🚀 RECOMENDAÇÃO FINAL

**USE A PROPOSTA MELHORADA!**

Ela tem tudo que o Cursor propôs + melhorias importantes que vão poupar MUITO tempo de debug e melhorar a experiência do usuário.

**Quer que eu crie o arquivo completo pronto pra usar?** 💪
