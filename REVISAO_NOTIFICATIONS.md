# 🔔 Notificações de Revisão de Equipamentos

## 📋 Visão Geral

O sistema envia notificações push automaticamente quando uma revisão de equipamento está próxima:

- **7 dias antes** da revisão
- **1 dia antes** da revisão  
- **No dia** da revisão

---

## 🛠️ Como Funciona

### 1. Verificação Automática

O sistema verifica as datas de revisão:
- **Ao iniciar o app**
- **Quando o app volta ao foreground** (quando você abre o app novamente)
- **A cada 1 hora** enquanto o app está aberto

### 2. Filtros

Apenas equipamentos **ativos** com data de revisão válida são verificados.

### 3. Prevenção de Duplicatas

O sistema evita enviar a mesma notificação múltiplas vezes no mesmo dia usando um histórico armazenado localmente (AsyncStorage).

---

## 📱 Notificações Enviadas

### 7 dias antes
```
Título: "Revisão Próxima"
Mensagem: "Trator John Deere - Revisão em 7 dias (15/01/2025)"
```

### 1 dia antes
```
Título: "Revisão Amanhã"
Mensagem: "Trator John Deere - Revisão agendada para amanhã (21/01/2025)"
```

### No dia
```
Título: "Revisão Hoje!"
Mensagem: "Trator John Deere - Revisão agendada para hoje (22/01/2025)"
```

---

## 🏗️ Arquitetura

### Arquivos Criados

1. **`src/lib/reviewNotifications.ts`**
   - Lógica de verificação de datas
   - Cálculo de dias até a revisão
   - Controle de histórico (AsyncStorage)
   - Prevenção de duplicatas

2. **`src/hooks/useReviewNotifications.ts`**
   - Hook React que verifica revisões
   - Escuta mudanças de estado do app
   - Intervalo de verificação (1 hora)

3. **`src/components/ReviewNotificationsWrapper.tsx`**
   - Componente wrapper para usar o hook
   - Integrado no `app/_layout.tsx`

### Integração

```typescript
// app/_layout.tsx
<EquipmentProvider>
  <ReviewNotificationsWrapper>
    {/* resto do app */}
  </ReviewNotificationsWrapper>
</EquipmentProvider>
```

---

## 🔧 Configuração

### Dependências

```json
{
  "dayjs": "^1.11.19",
  "@react-native-async-storage/async-storage": "^1.x",
  "expo-notifications": "^0.x"
}
```

### Formato de Data

As datas de revisão devem estar no formato **DD/MM/YYYY** (ex: `22/01/2025`).

---

## 📊 Histórico de Notificações

O sistema armazena um histórico local para evitar duplicatas:

```typescript
{
  equipmentId: "123",
  reviewDate: "22/01/2025",
  daysUntil: 0,
  notifiedAt: "2025-01-22T10:30:00.000Z"
}
```

### Limpeza Automática

Notificações com mais de **30 dias** são removidas automaticamente do histórico.

---

## 🐛 Troubleshooting

### Notificações não aparecem

1. **Verificar se o equipamento está ativo**
   - Apenas equipamentos com `status: 'ativo'` recebem notificações

2. **Verificar se a data de revisão está preenchida**
   - O campo `nextReview` deve estar no formato `DD/MM/YYYY`

3. **Verificar permissões**
   - O app precisa de permissão para enviar notificações
   - Verifique em: Configurações > App > Notificações

4. **Verificar logs**
   ```typescript
   // Logs aparecem no console
   logger.debug('Notificação de revisão enviada: Trator (0 dias)');
   ```

### Limpar histórico de notificações

Se quiser forçar o envio de notificações novamente, você pode limpar o AsyncStorage:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Limpar histórico
await AsyncStorage.removeItem('@review_notifications');
```

---

## 🧪 Teste Manual

Para testar o sistema:

1. **Criar um equipamento** com data de revisão próxima:
   - Ex: Se hoje é 15/01, coloque revisão para 22/01 (7 dias)
   - O app deve enviar notificação imediatamente

2. **Aguardar ou ajustar data**:
   - Para testar "1 dia antes", coloque revisão para amanhã
   - Para testar "no dia", coloque revisão para hoje

3. **Forçar verificação**:
   ```typescript
   import { checkReviewNotifications } from '@/src/lib/reviewNotifications';
   import { useEquipment } from '@/src/context/EquipmentContext';
   
   const { equipments } = useEquipment();
   await checkReviewNotifications(equipments);
   ```

---

## ✅ Status

- ✅ Verificação automática ao iniciar app
- ✅ Verificação quando app volta ao foreground
- ✅ Verificação periódica (1 hora)
- ✅ Prevenção de duplicatas
- ✅ Limpeza automática de histórico antigo
- ✅ Apenas equipamentos ativos
- ✅ TypeScript sem erros
- ✅ Logs para debugging

**Sistema funcionando!** 🎉

---

## 📝 Notas Técnicas

- O sistema usa **notificações locais** (não requer servidor)
- As verificações são feitas **no cliente** (no dispositivo)
- O histórico é armazenado **localmente** (AsyncStorage)
- A verificação é **não-bloqueante** (não afeta performance do app)

