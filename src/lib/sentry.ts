import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Configuração do Sentry
export const initSentry = () => {
  // Só inicializar em produção ou se explicitamente habilitado
  const isProduction = Constants.expoConfig?.extra?.environment === 'production';
  const sentryDSN = Constants.expoConfig?.extra?.sentryDSN;

  if (!sentryDSN) {
    console.log('⚠️ Sentry DSN não configurado');
    return;
  }

  Sentry.init({
    dsn: sentryDSN,
    
    // Configurações de ambiente
    environment: isProduction ? 'production' : 'development',
    enabled: isProduction, // Só ativar em produção
    
    // Configurações de performance
    tracesSampleRate: isProduction ? 0.2 : 1.0, // 20% em produção, 100% em dev
    
    // Configurações de sessão
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000, // 30 segundos
    
    // Configurações de release
    release: `${Constants.expoConfig?.name}@${Constants.expoConfig?.version}`,
    dist: Constants.expoConfig?.android?.versionCode?.toString() || 
          Constants.expoConfig?.ios?.buildNumber || 
          '1',
    
    // Integrations (configuração simplificada)
    integrations: [],
    
    // Filtros de eventos
    beforeSend(event, hint) {
      // Não enviar erros de desenvolvimento
      if (!isProduction) {
        console.log('🐛 Sentry Event (dev):', event);
        return null;
      }
      
      // Filtrar erros conhecidos/ignoráveis
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as Error).message;
        
        // Ignorar erros de rede temporários
        if (message.includes('Network request failed')) {
          return null;
        }
        
        // Ignorar erros de timeout
        if (message.includes('timeout')) {
          return null;
        }
      }
      
      return event;
    },
    
    // Breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Filtrar breadcrumbs sensíveis
      if (breadcrumb.category === 'console') {
        // Não logar senhas ou tokens
        if (breadcrumb.message?.includes('password') || 
            breadcrumb.message?.includes('token')) {
          return null;
        }
      }
      
      return breadcrumb;
    },
  });
  
  console.log('✅ Sentry inicializado');
};

// Função para capturar erros manualmente
export const captureError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
};

// Função para capturar mensagens
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

// Função para adicionar contexto do usuário
export const setUserContext = (user: {
  id: string;
  email?: string;
  center?: string;
  role?: string;
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email,
    // Dados customizados
    center: user.center,
    role: user.role,
  });
};

// Função para limpar contexto do usuário (logout)
export const clearUserContext = () => {
  Sentry.setUser(null);
};

// Função para adicionar breadcrumb customizado
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
};

// Função para iniciar transação de performance
export const startTransaction = (name: string, op: string) => {
  // Transações são criadas automaticamente pelo Sentry
  // Esta função é mantida para compatibilidade futura
  console.log(`📊 Transaction: ${name} (${op})`);
  return null;
};

// HOC para capturar erros em componentes
export const withSentryErrorBoundary = (Component: React.ComponentType<any>) => {
  return Sentry.wrap(Component);
};

export default Sentry;
