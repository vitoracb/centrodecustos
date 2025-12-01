/**
 * Sistema centralizado de tratamento de erros
 * 
 * Padroniza como erros são exibidos ao usuário e logados.
 * 
 * Uso:
 * - Modo explícito: handleError(error, ErrorType.CRITICAL, { title: '...', message: '...' })
 * - Modo automático: handleError(error, 'salvar despesa') // Detecta tipo automaticamente
 */

import { Alert, Linking } from 'react-native';
import { showError } from './toast';
import { logger } from './logger';

// ========================
// TIPOS
// ========================

export enum ErrorType {
  CRITICAL = 'critical',      // Alert.alert - Salvar, deletar
  NETWORK = 'network',        // Toast - Carregar dados
  VALIDATION = 'validation',  // Alert.alert - Formulário
  SILENT = 'silent'           // Logger apenas - Badge, secundário
}

export interface ErrorOptions {
  title?: string;
  message?: string;
  context?: string; // Para mensagens automáticas
  onRetry?: () => void | Promise<void>;
  openSettings?: boolean; // Para erros de permissão
}

// ========================
// DETECÇÃO DE ERROS
// ========================

/**
 * Detecta se um erro é de rede
 */
const isNetworkError = (error: any): boolean => {
  return (
    error?.message?.includes('network') ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('connection') ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'NETWORK_ERROR'
  );
};

/**
 * Detecta automaticamente o tipo de erro baseado no contexto
 */
const detectErrorType = (error: any, context: string): ErrorType => {
  // Erro de rede detectado
  if (isNetworkError(error)) {
    return ErrorType.NETWORK;
  }
  
  // Contextos críticos (salvar, deletar, aprovar, etc)
  const criticalKeywords = ['salvar', 'deletar', 'aprovar', 'rejeitar', 'excluir', 'remover'];
  if (criticalKeywords.some(k => context.toLowerCase().includes(k))) {
    return ErrorType.CRITICAL;
  }
  
  // Contextos de rede (carregar, buscar, sincronizar, etc)
  const networkKeywords = ['carregar', 'buscar', 'sincronizar', 'atualizar', 'listar'];
  if (networkKeywords.some(k => context.toLowerCase().includes(k))) {
    return ErrorType.NETWORK;
  }
  
  // Padrão: crítico (mais seguro)
  return ErrorType.CRITICAL;
};

// ========================
// FUNÇÃO PRINCIPAL
// ========================

/**
 * Trata erros de forma padronizada
 * 
 * @param error - O erro ocorrido
 * @param typeOrContext - Tipo de erro (ErrorType) OU contexto como string (detecção automática)
 * @param options - Opções adicionais (título, mensagem, retry, etc)
 * 
 * @example
 * // Modo explícito
 * handleError(error, ErrorType.CRITICAL, {
 *   title: 'Erro ao salvar',
 *   message: 'Não foi possível salvar a despesa',
 *   onRetry: () => saveExpense()
 * });
 * 
 * @example
 * // Modo automático
 * handleError(error, 'carregar equipamentos');
 * // Detecta automaticamente que é NETWORK e gera mensagem
 */
export const handleError = (
  error: any,
  typeOrContext: ErrorType | string,
  options?: ErrorOptions
): void => {
  let type: ErrorType;
  let context: string;
  
  // Determina tipo e contexto
  if (typeof typeOrContext === 'string') {
    // ✅ MODO AUTOMÁTICO: Detecta tipo baseado no contexto
    context = typeOrContext;
    type = detectErrorType(error, context);
  } else {
    // ✅ MODO EXPLÍCITO: Usa o tipo passado
    type = typeOrContext;
    context = options?.context || 'operação';
  }
  
  // Mensagens
  const title = options?.title || getDefaultTitle(type);
  const message = options?.message || getDefaultMessage(type, context, error);
  
  // Log usando logger existente
  logger.error(`[${type.toUpperCase()}] ${title}:`, error);
  
  // Exibição para o usuário
  switch (type) {
    case ErrorType.CRITICAL:
      showCriticalError(title, message, options);
      break;
      
    case ErrorType.NETWORK:
      showNetworkError(title, message, options);
      break;
      
    case ErrorType.VALIDATION:
      showValidationError(title, message, options);
      break;
      
    case ErrorType.SILENT:
      // Apenas loga, não mostra nada ao usuário
      break;
  }
  
  // Analytics preparado (descomentar quando necessário)
  // if (type === ErrorType.CRITICAL || type === ErrorType.NETWORK) {
  //   analytics.logError({ type, context, error });
  // }
};

// ========================
// EXIBIÇÃO DE ERROS
// ========================

/**
 * Exibe erro crítico com opção de retry
 */
const showCriticalError = (title: string, message: string, options?: ErrorOptions) => {
  const buttons: any[] = [];
  
  if (options?.onRetry) {
    buttons.push({
      text: 'Tentar Novamente',
      onPress: async () => {
        try {
          await options.onRetry!();
        } catch (retryError) {
          // Se retry falhar, mostra erro novamente
          handleError(retryError, ErrorType.CRITICAL, options);
        }
      },
    });
  }
  
  buttons.push({ text: 'OK' });
  Alert.alert(title, message, buttons);
};

/**
 * Exibe erro de rede com opção de retry ou toast
 */
const showNetworkError = (title: string, message: string, options?: ErrorOptions) => {
  if (options?.onRetry) {
    // Se tem retry, usa Alert com botão
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Tentar Novamente',
          onPress: async () => {
            try {
              await options.onRetry!();
            } catch (retryError) {
              handleError(retryError, ErrorType.NETWORK, options);
            }
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  } else {
    // Senão, usa Toast (menos intrusivo)
    showError(title, message);
  }
};

/**
 * Exibe erro de validação com opção de abrir configurações
 */
const showValidationError = (title: string, message: string, options?: ErrorOptions) => {
  const buttons: any[] = [];
  
  if (options?.openSettings) {
    // Para erros de permissão, mostra botão de configurações
    buttons.push({
      text: 'Abrir Configurações',
      onPress: () => Linking.openSettings(),
    });
    buttons.push({ text: 'Cancelar', style: 'cancel' });
  } else {
    // Erro de validação normal
    buttons.push({ text: 'OK' });
  }
  
  Alert.alert(title, message, buttons);
};

// ========================
// MENSAGENS PADRÃO
// ========================

/**
 * Retorna título padrão baseado no tipo de erro
 */
const getDefaultTitle = (type: ErrorType): string => {
  switch (type) {
    case ErrorType.CRITICAL:
      return 'Erro Crítico';
    case ErrorType.NETWORK:
      return 'Erro de Conexão';
    case ErrorType.VALIDATION:
      return 'Dados Inválidos';
    default:
      return 'Erro';
  }
};

/**
 * Retorna mensagem padrão baseada no tipo e contexto
 */
const getDefaultMessage = (type: ErrorType, context: string, error: any): string => {
  const errorMessage = error?.message || 'Ocorreu um erro inesperado';
  
  switch (type) {
    case ErrorType.CRITICAL:
      return `Não foi possível ${context}. ${errorMessage}`;
    case ErrorType.NETWORK:
      return `Erro ao ${context}. Verifique sua conexão e tente novamente.`;
    case ErrorType.VALIDATION:
      return errorMessage; // Mensagem específica já vem no error
    default:
      return errorMessage;
  }
};

// ========================
// RETRY AUTOMÁTICO (SÓ PARA LEITURA)
// ========================

/**
 * Executa uma função com retry automático em caso de erro de rede
 * 
 * ⚠️ IMPORTANTE: Use APENAS para operações de LEITURA (idempotentes)
 * NÃO use para salvar/deletar (pode duplicar dados)
 * 
 * @param fn - Função a ser executada
 * @param maxRetries - Número máximo de tentativas (padrão: 3)
 * @param delayMs - Delay entre tentativas em ms (padrão: 1000)
 * 
 * @example
 * // ✅ CORRETO: Operação de leitura
 * const data = await withRetry(() => loadEquipments());
 * 
 * @example
 * // ❌ ERRADO: Operação de escrita
 * await withRetry(() => saveExpense()); // Pode salvar múltiplas vezes!
 */
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
      
      // Espera antes de tentar novamente (backoff exponencial)
      const delay = delayMs * attempt;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};
