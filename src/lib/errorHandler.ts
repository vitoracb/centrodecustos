import { Alert } from 'react-native';
import { logger } from './logger';
import { showError, showInfo } from './toast';

/**
 * Tipos de erros para tratamento diferenciado
 */
export enum ErrorType {
  /** Erros críticos que impedem a operação - mostram Alert */
  CRITICAL = 'CRITICAL',
  /** Erros de rede/API - mostram Toast */
  NETWORK = 'NETWORK',
  /** Erros de validação - mostram Toast */
  VALIDATION = 'VALIDATION',
  /** Erros silenciosos - apenas log */
  SILENT = 'SILENT',
}

/**
 * Interface para configuração de tratamento de erro
 */
interface ErrorHandlerOptions {
  /** Tipo do erro */
  type?: ErrorType;
  /** Título personalizado (para Alert ou Toast) */
  title?: string;
  /** Mensagem personalizada */
  message?: string;
  /** Se deve logar o erro */
  log?: boolean;
  /** Callback customizado para tratamento */
  onError?: (error: any) => void;
}

/**
 * Detecta o tipo de erro baseado na mensagem ou código
 */
function detectErrorType(error: any): ErrorType {
  const errorMessage = error?.message || String(error || '');
  const errorCode = error?.code || '';

  // Erros de rede
  if (
    errorCode === 'PGRST116' || // Not found
    errorCode === 'PGRST301' || // Multiple rows
    errorMessage.includes('network') ||
    errorMessage.includes('Network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout') ||
    errorCode?.startsWith('PGRST')
  ) {
    return ErrorType.NETWORK;
  }

  // Erros de validação
  if (
    errorMessage.includes('invalid') ||
    errorMessage.includes('Invalid') ||
    errorMessage.includes('validation') ||
    errorMessage.includes('required') ||
    errorCode === '23514' // Check constraint violation
  ) {
    return ErrorType.VALIDATION;
  }

  // Erros críticos (padrão)
  return ErrorType.CRITICAL;
}

/**
 * Extrai mensagem amigável do erro
 */
function getErrorMessage(error: any, defaultMessage?: string): string {
  if (error?.message) {
    // Mensagens de erro do Supabase
    if (error.message.includes('Could not find')) {
      return 'Recurso não encontrado';
    }
    if (error.message.includes('duplicate key')) {
      return 'Este item já existe';
    }
    if (error.message.includes('violates check constraint')) {
      return 'Dados inválidos';
    }
    if (error.message.includes('foreign key constraint')) {
      return 'Não é possível excluir este item pois está em uso';
    }
    return error.message;
  }
  return defaultMessage || 'Ocorreu um erro inesperado';
}

/**
 * Handler padronizado de erros
 * 
 * @param error - O erro a ser tratado
 * @param options - Opções de tratamento
 * 
 * @example
 * ```ts
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error, {
 *     type: ErrorType.NETWORK,
 *     title: 'Erro ao salvar',
 *     message: 'Não foi possível salvar os dados. Verifique sua conexão.',
 *   });
 * }
 * ```
 */
export function handleError(
  error: any,
  options: ErrorHandlerOptions = {}
): void {
  const {
    type,
    title,
    message,
    log = true,
    onError,
  } = options;

  // Executa callback customizado se fornecido
  if (onError) {
    onError(error);
    return;
  }

  // Detecta tipo de erro se não fornecido
  const errorType = type || detectErrorType(error);
  const errorMessage = message || getErrorMessage(error);
  const errorTitle = title || 'Erro';

  // Log do erro (sempre, exceto se explicitamente desabilitado)
  if (log) {
    logger.error(`[${errorType}] ${errorTitle}:`, error);
  }

  // Tratamento baseado no tipo
  switch (errorType) {
    case ErrorType.CRITICAL:
      // Erros críticos: Alert (bloqueia a ação)
      Alert.alert(errorTitle, errorMessage);
      break;

    case ErrorType.NETWORK:
    case ErrorType.VALIDATION:
      // Erros de rede/validação: Toast (não bloqueia)
      showError(errorTitle, errorMessage);
      break;

    case ErrorType.SILENT:
      // Erros silenciosos: apenas log (já foi logado acima)
      break;

    default:
      // Fallback: Toast
      showError(errorTitle, errorMessage);
  }
}

/**
 * Wrapper para operações assíncronas com tratamento de erro automático
 * 
 * @example
 * ```ts
 * const result = await safeAsync(async () => {
 *   return await someOperation();
 * }, {
 *   type: ErrorType.NETWORK,
 *   title: 'Erro ao carregar',
 * });
 * ```
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorOptions: ErrorHandlerOptions = {}
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, errorOptions);
    return null;
  }
}

/**
 * Handler específico para erros de Supabase
 */
export function handleSupabaseError(
  error: any,
  defaultMessage: string = 'Erro ao realizar operação',
  options: Omit<ErrorHandlerOptions, 'type'> = {}
): void {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  // Mapeia códigos de erro do Supabase para tipos
  let errorType = ErrorType.NETWORK;
  let friendlyMessage = defaultMessage;

  switch (errorCode) {
    case 'PGRST116': // Not found
      errorType = ErrorType.VALIDATION;
      friendlyMessage = 'Item não encontrado';
      break;
    case 'PGRST301': // Multiple rows
      errorType = ErrorType.CRITICAL;
      friendlyMessage = 'Múltiplos itens encontrados';
      break;
    case '23514': // Check constraint
      errorType = ErrorType.VALIDATION;
      friendlyMessage = 'Dados inválidos. Verifique os campos preenchidos.';
      break;
    case '23503': // Foreign key violation
      errorType = ErrorType.CRITICAL;
      friendlyMessage = 'Não é possível excluir este item pois está em uso';
      break;
    case '23505': // Unique violation
      errorType = ErrorType.VALIDATION;
      friendlyMessage = 'Este item já existe';
      break;
    case 'PGRST204': // Column not found
      errorType = ErrorType.CRITICAL;
      friendlyMessage = 'Erro de configuração do banco de dados';
      break;
    default:
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorType = ErrorType.NETWORK;
        friendlyMessage = 'Erro de conexão. Verifique sua internet.';
      }
  }

  handleError(error, {
    ...options,
    type: errorType,
    message: options.message || friendlyMessage,
  });
}

