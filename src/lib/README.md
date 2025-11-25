# 📚 Guia de Uso - Logger e Toast

## 🔍 Logger

O sistema de logging desabilita logs em produção automaticamente.

### Uso Básico

```typescript
import { logger } from '@/src/lib/logger';

// Logs normais (apenas em desenvolvimento)
logger.log('Mensagem de log');
logger.info('Informação');
logger.debug('Debug');
logger.warn('Aviso');

// Erros (sempre logados, mesmo em produção)
logger.error('Erro crítico', error);
```

### Logs com Prefixo

```typescript
import { logWithPrefix } from '@/src/lib/logger';

const log = logWithPrefix('EquipmentContext', 'error');
log('Erro ao carregar equipamentos');
// Output: [EquipmentContext] Erro ao carregar equipamentos
```

---

## 🍞 Toast Notifications

Sistema de notificações toast para feedback visual ao usuário.

### Uso Básico

```typescript
import { showSuccess, showError, showInfo } from '@/src/lib/toast';

// Sucesso
showSuccess('Equipamento adicionado', 'Trator John Deere');

// Erro
showError('Erro ao salvar', 'Verifique sua conexão');

// Informação
showInfo('Equipamento inativado', 'Trator John Deere');
```

### Uso Avançado

```typescript
import { showToast } from '@/src/lib/toast';

showToast({
  type: 'success',
  text1: 'Título',
  text2: 'Descrição opcional',
  duration: 5000, // milissegundos
  position: 'bottom', // ou 'top'
});
```

---

## 🔄 Migração de console.log

**Antes:**
```typescript
console.log('❌ Erro ao carregar:', error);
```

**Depois:**
```typescript
logger.error('Erro ao carregar:', error);
```

---

## 📝 Boas Práticas

1. **Use logger.error para erros** - sempre logados
2. **Use logger.debug para debug** - apenas em desenvolvimento
3. **Use showSuccess após ações bem-sucedidas**
4. **Use showError para erros que o usuário precisa saber**
5. **Evite console.log direto** - use o logger

