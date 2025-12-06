# 📊 Guia de Setup do Sentry

## 🎯 Objetivo
Configurar monitoramento de erros e performance com Sentry para o app Centro de Custos.

---

## 📋 Pré-requisitos
- [ ] Conta no Sentry (https://sentry.io)
- [ ] Projeto criado no Sentry
- [ ] DSN do projeto

---

## 🚀 PASSO A PASSO

### **1. Criar Conta e Projeto no Sentry (10 min)**

1. Acesse: https://sentry.io/signup/
2. Crie uma conta (pode usar GitHub)
3. Crie um novo projeto:
   - **Platform:** React Native
   - **Project Name:** `centrodecustos-app`
   - **Team:** Seu time ou pessoal

4. Copie o **DSN** (Data Source Name)
   - Formato: `https://xxx@xxx.ingest.sentry.io/xxx`

---

### **2. Configurar Variáveis de Ambiente (5 min)**

Adicione o DSN no arquivo `.env`:

```bash
# Sentry
EXPO_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

Adicione também no `app.config.js`:

```javascript
export default {
  // ... outras configurações
  extra: {
    // ... outras extras
    sentryDSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
  },
};
```

---

### **3. Inicializar Sentry no App (5 min)**

Edite o arquivo `app/_layout.tsx` para inicializar o Sentry:

```typescript
import { initSentry } from '../src/lib/sentry';

// No início do componente, antes do return
useEffect(() => {
  initSentry();
}, []);
```

---

### **4. Integrar com Contextos (10 min)**

#### **4.1 AuthContext - Adicionar contexto do usuário**

No arquivo `src/context/AuthContext.tsx`, após login bem-sucedido:

```typescript
import { setUserContext, clearUserContext } from '../lib/sentry';

// Após login
setUserContext({
  id: user.id,
  email: user.email,
  center: userPermissions?.center,
  role: userPermissions?.role,
});

// No logout
clearUserContext();
```

#### **4.2 Capturar Erros nos Contextos**

Adicione captura de erros em operações críticas:

```typescript
import { captureError, addBreadcrumb } from '../lib/sentry';

try {
  // Operação crítica
  await someOperation();
  addBreadcrumb('Operation completed', 'action', { operation: 'someOperation' });
} catch (error) {
  captureError(error as Error, {
    context: 'FinancialContext',
    operation: 'someOperation',
    userId: user?.id,
  });
  throw error;
}
```

---

### **5. Testar Sentry (10 min)**

#### **5.1 Teste Manual**

Adicione um botão de teste temporário:

```typescript
import { captureError, captureMessage } from '../lib/sentry';

// Botão de teste
<TouchableOpacity onPress={() => {
  captureMessage('Teste do Sentry', 'info');
  console.log('✅ Mensagem de teste enviada ao Sentry');
}}>
  <Text>Testar Sentry</Text>
</TouchableOpacity>

// Teste de erro
<TouchableOpacity onPress={() => {
  try {
    throw new Error('Erro de teste do Sentry');
  } catch (error) {
    captureError(error as Error, { test: true });
  }
}}>
  <Text>Testar Erro</Text>
</TouchableOpacity>
```

#### **5.2 Verificar no Dashboard**

1. Acesse o dashboard do Sentry
2. Vá em **Issues**
3. Verifique se os eventos de teste aparecem
4. Remova os botões de teste após confirmar

---

### **6. Configurar Alertas (5 min)**

No dashboard do Sentry:

1. Vá em **Alerts** → **Create Alert**
2. Configure alertas para:
   - **Novos erros:** Alerta imediato
   - **Erros frequentes:** > 10 ocorrências em 1 hora
   - **Erros críticos:** Qualquer erro em produção

3. Configure notificações:
   - Email
   - Slack (opcional)
   - Discord (opcional)

---

### **7. Configurar Source Maps (15 min)**

Para ver o código fonte nos erros, configure source maps:

#### **7.1 Instalar Sentry CLI**

```bash
npm install --save-dev @sentry/cli
```

#### **7.2 Configurar Upload Automático**

Adicione no `app.config.js`:

```javascript
export default {
  // ... outras configurações
  hooks: {
    postPublish: [
      {
        file: 'sentry-expo/upload-sourcemaps',
        config: {
          organization: 'sua-org',
          project: 'centrodecustos-app',
          authToken: process.env.SENTRY_AUTH_TOKEN,
        },
      },
    ],
  },
};
```

#### **7.3 Criar Auth Token**

1. Acesse: https://sentry.io/settings/account/api/auth-tokens/
2. Crie um novo token com permissões:
   - `project:read`
   - `project:releases`
   - `org:read`
3. Adicione no `.env`:

```bash
SENTRY_AUTH_TOKEN=seu_token_aqui
```

---

## 📊 MONITORAMENTO EM PRODUÇÃO

### **Métricas Importantes**

1. **Crash Rate:** < 1%
2. **Error Rate:** < 5%
3. **Response Time:** < 2s
4. **Session Duration:** > 5min

### **Dashboards Recomendados**

1. **Overview:**
   - Total de erros (24h)
   - Crash rate
   - Usuários afetados
   - Releases

2. **Performance:**
   - Tempo de resposta
   - Transações lentas
   - Network errors

3. **User Impact:**
   - Usuários com erros
   - Sessões com crash
   - Erros por centro de custo

---

## 🚨 TROUBLESHOOTING

### **Problema 1: Eventos não aparecem**

**Solução:**
```typescript
// Verificar se Sentry está inicializado
console.log('Sentry DSN:', Constants.expoConfig?.extra?.sentryDSN);

// Forçar envio em desenvolvimento
Sentry.init({
  dsn: '...',
  enabled: true, // Forçar true
  debug: true, // Ativar debug
});
```

### **Problema 2: Source maps não funcionam**

**Solução:**
```bash
# Verificar se source maps foram enviados
npx sentry-cli releases files <version> list

# Re-upload manual
npx sentry-cli releases files <version> upload-sourcemaps ./dist
```

### **Problema 3: Muitos eventos**

**Solução:**
```typescript
// Ajustar sample rate
Sentry.init({
  tracesSampleRate: 0.1, // 10% dos eventos
  sampleRate: 0.5, // 50% dos erros
});
```

---

## 📈 BOAS PRÁTICAS

### **1. Contexto Rico**

Sempre adicione contexto aos erros:

```typescript
captureError(error, {
  userId: user.id,
  center: user.center,
  operation: 'createExpense',
  data: { amount: 100, category: 'food' },
});
```

### **2. Breadcrumbs**

Use breadcrumbs para rastrear fluxo:

```typescript
addBreadcrumb('User opened expense form', 'navigation');
addBreadcrumb('User filled amount', 'user', { amount: 100 });
addBreadcrumb('User submitted form', 'action');
```

### **3. Filtrar Dados Sensíveis**

Nunca envie:
- Senhas
- Tokens
- Dados bancários
- CPF/CNPJ

```typescript
beforeSend(event) {
  // Remover dados sensíveis
  if (event.request?.data) {
    delete event.request.data.password;
    delete event.request.data.token;
  }
  return event;
}
```

### **4. Releases e Deploys**

Sempre marque releases:

```bash
# Criar release
npx sentry-cli releases new <version>

# Associar commits
npx sentry-cli releases set-commits <version> --auto

# Finalizar release
npx sentry-cli releases finalize <version>
```

---

## 🎯 CHECKLIST FINAL

- [ ] Sentry instalado e configurado
- [ ] DSN adicionado no `.env`
- [ ] Sentry inicializado no `_layout.tsx`
- [ ] Contexto de usuário configurado
- [ ] Erros capturados nos contextos críticos
- [ ] Testes realizados e funcionando
- [ ] Alertas configurados
- [ ] Source maps configurados
- [ ] Dados sensíveis filtrados
- [ ] Dashboard monitorado

---

## 📞 SUPORTE

- Documentação: https://docs.sentry.io/platforms/react-native/
- Discord: https://discord.gg/sentry
- Status: https://status.sentry.io/

---

## 🎊 PRONTO!

Sentry configurado e monitorando seu app! 🚀

**Próximos passos:**
1. ✅ Monitorar dashboard diariamente
2. ✅ Configurar alertas no Slack
3. ✅ Revisar erros semanalmente
4. ✅ Criar dashboards customizados
