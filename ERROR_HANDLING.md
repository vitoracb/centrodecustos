# 🔧 Sistema de Tratamento de Erros

## 📋 Visão Geral

Este documento descreve o sistema padronizado de tratamento de erros implementado no aplicativo. O objetivo é garantir consistência na forma como erros são tratados e apresentados ao usuário.

## 🎯 Tipos de Erros

### 1. **CRITICAL** (Crítico)
Erros que impedem a operação e requerem atenção imediata do usuário.

**Exemplos:**
- Falha ao salvar dados críticos
- Erro de configuração do banco de dados
- Violação de constraint de foreign key

**Tratamento:** `Alert.alert()` - Bloqueia a ação até o usuário confirmar

### 2. **NETWORK** (Rede)
Erros relacionados a conexão, API ou Supabase.

**Exemplos:**
- Falha de conexão com internet
- Timeout de requisição
- Erros do Supabase (PGRST*)

**Tratamento:** `Toast` (showError) - Não bloqueia, apenas informa

### 3. **VALIDATION** (Validação)
Erros de validação de dados ou regras de negócio.

**Exemplos:**
- Campos obrigatórios vazios
- Formato de data inválido
- Valores fora do permitido

**Tratamento:** `Toast` (showError) - Não bloqueia, apenas informa

### 4. **SILENT** (Silencioso)
Erros que não precisam ser mostrados ao usuário.

**Exemplos:**
- Falha ao carregar dados opcionais
- Erros de cache
- Logs internos

**Tratamento:** Apenas log - Nenhum feedback visual

## 📚 Uso

### Importação

```typescript
import { handleError, ErrorType, handleSupabaseError, safeAsync } from '@/src/lib/errorHandler';
```

### Exemplo 1: Tratamento Básico

```typescript
try {
  await someOperation();
} catch (error) {
  handleError(error, {
    type: ErrorType.NETWORK,
    title: 'Erro ao salvar',
    message: 'Não foi possível salvar os dados. Verifique sua conexão.',
  });
}
```

### Exemplo 2: Erro de Supabase

```typescript
const { data, error } = await supabase.from('table').select('*');

if (error) {
  handleSupabaseError(error, 'Erro ao carregar dados');
  return;
}
```

### Exemplo 3: Operação Segura

```typescript
const result = await safeAsync(
  async () => {
    return await someOperation();
  },
  {
    type: ErrorType.NETWORK,
    title: 'Erro ao carregar',
  }
);

if (result) {
  // Usar resultado
}
```

### Exemplo 4: Callback Customizado

```typescript
try {
  await operation();
} catch (error) {
  handleError(error, {
    onError: (err) => {
      // Tratamento customizado
      if (err.code === 'SPECIFIC_ERROR') {
        // Fazer algo específico
      }
    },
  });
}
```

## 🔄 Migração

### Antes (Inconsistente)

```typescript
// Contexto A
catch (error) {
  console.error('Erro:', error);
  Alert.alert('Erro', 'Algo deu errado');
}

// Contexto B
catch (error) {
  console.log('Erro:', error);
  // Sem feedback ao usuário
}

// Contexto C
catch (error) {
  showError('Erro', error.message);
}
```

### Depois (Padronizado)

```typescript
// Todos os contextos
catch (error) {
  handleError(error, {
    type: ErrorType.NETWORK,
    title: 'Erro ao salvar',
    message: 'Não foi possível salvar os dados.',
  });
}
```

## 📝 Regras de Uso

1. **Sempre use `handleError` ou `handleSupabaseError`** em vez de `console.error` + `Alert`/`Toast` diretamente
2. **Erros críticos** devem usar `ErrorType.CRITICAL` (Alert)
3. **Erros de rede** devem usar `ErrorType.NETWORK` (Toast)
4. **Erros de validação** devem usar `ErrorType.VALIDATION` (Toast)
5. **Erros silenciosos** devem usar `ErrorType.SILENT` (apenas log)
6. **Para erros do Supabase**, prefira `handleSupabaseError` que detecta automaticamente o tipo

## 🎨 Benefícios

- ✅ **Consistência**: Todos os erros são tratados da mesma forma
- ✅ **Manutenibilidade**: Fácil de atualizar comportamento global
- ✅ **UX**: Feedback apropriado para cada tipo de erro
- ✅ **Debugging**: Logs padronizados facilitam identificação de problemas
- ✅ **Flexibilidade**: Permite tratamento customizado quando necessário

## 🔍 Detecção Automática

O sistema detecta automaticamente o tipo de erro baseado em:
- Código de erro (ex: `PGRST116`, `23514`)
- Mensagem de erro (palavras-chave como "network", "invalid")
- Origem do erro (Supabase, fetch, etc.)

Você pode sobrescrever a detecção fornecendo o `type` explicitamente.

