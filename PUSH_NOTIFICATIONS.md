# 🔔 Sistema de Push Notifications

## 📋 Visão Geral

O sistema de push notifications foi implementado para notificar usuários sobre eventos importantes do app:

1. **Novo Pedido de Orçamento** - Quando um novo pedido é criado
2. **Orçamento Enviado** - Quando um orçamento é enviado para um pedido
3. **Novo Contrato** - Quando um novo contrato é adicionado

---

## 🛠️ Implementação

### Arquivos Criados/Modificados

1. **`src/lib/notifications.ts`** - Serviço central de notificações
   - Gerencia permissões
   - Envia notificações locais
   - Configura canais (Android)

2. **`src/context/OrderContext.tsx`** - Integração de notificações
   - Notifica ao criar novo pedido (`addOrder`)
   - Notifica ao enviar orçamento (`updateOrder`)

3. **`src/context/ContractContext.tsx`** - Integração de notificações
   - Notifica ao adicionar novo contrato (`addContract`)

4. **`app/_layout.tsx`** - Inicialização de permissões
   - Solicita permissões ao iniciar o app

5. **`app.json`** - Configuração do plugin
   - Plugin `expo-notifications` configurado

---

## 📱 Como Funciona

### 1. Permissões

Ao iniciar o app, as permissões de notificação são solicitadas automaticamente:

```typescript
// app/_layout.tsx
useEffect(() => {
  requestNotificationPermissions().catch((error) => {
    console.warn('Erro ao solicitar permissões de notificação:', error);
  });
}, []);
```

### 2. Notificações Locais

As notificações são enviadas **localmente** (no dispositivo), não requerem servidor:

```typescript
// Exemplo: Novo pedido
await notificationService.notifyNewOrder('Pedido #123', 'Valença');
```

### 3. Eventos que Disparam Notificações

#### Novo Pedido (`OrderContext.addOrder`)
```typescript
// Quando um novo pedido é criado
await notificationService.notifyNewOrder(orderName, costCenter);
```

#### Orçamento Enviado (`OrderContext.updateOrder`)
```typescript
// Quando o status muda para "orcamento_enviado"
if (wasBudgetSent) {
  await notificationService.notifyBudgetSent(orderName, costCenter);
}
```

#### Novo Contrato (`ContractContext.addContract`)
```typescript
// Quando um novo contrato é adicionado
await notificationService.notifyNewContract(contractName, costCenter);
```

---

## 🔧 Configuração

### Android

O canal de notificação é configurado automaticamente:

```typescript
await Notifications.setNotificationChannelAsync('default', {
  name: 'Notificações Gerais',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF231F7C',
});
```

### iOS

As notificações funcionam automaticamente após a permissão ser concedida.

---

## 📦 Dependências

```json
{
  "expo-notifications": "^0.x"
}
```

---

## 🚀 Próximos Passos (Opcional)

### Notificações Remotas (Push via Expo)

Para enviar notificações remotas (de um servidor), você precisaria:

1. **Configurar EAS (Expo Application Services)**
   ```bash
   npx eas build:configure
   ```

2. **Obter Push Token**
   ```typescript
   const token = await getPushToken();
   // Salvar token no Supabase para cada usuário
   ```

3. **Enviar via Expo Push API**
   ```typescript
   // No backend ou via Supabase Edge Function
   fetch('https://exp.host/--/api/v2/push/send', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       to: pushToken,
       title: 'Novo Pedido',
       body: 'Pedido #123 criado',
     }),
   });
   ```

---

## 🐛 Troubleshooting

### Notificações não aparecem

1. **Verificar permissões**
   - iOS: Configurações > App > Notificações
   - Android: Configurações > Apps > App > Notificações

2. **Verificar logs**
   ```typescript
   // Logs aparecem no console
   logger.debug('Notificação enviada:', { title, body });
   ```

3. **Testar manualmente**
   ```typescript
   import { notificationService } from '@/src/lib/notifications';
   await notificationService.notifyNewOrder('Teste', 'Valença');
   ```

### Erro de permissão

Se as permissões forem negadas, as notificações não serão enviadas, mas o app continuará funcionando normalmente (falha silenciosa).

---

## ✅ Status

- ✅ Notificações locais funcionando
- ✅ Permissões solicitadas automaticamente
- ✅ Integrado em OrderContext e ContractContext
- ✅ Tratamento de erros (falha silenciosa)
- ✅ Configuração Android (canal de notificação)
- ✅ TypeScript sem erros

**Pronto para uso!** 🎉

