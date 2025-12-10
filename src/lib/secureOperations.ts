/**
 * Wrapper para operações seguras com rate limiting e sanitização
 * Pode ser usado para envolver funções de contexto sem modificá-las diretamente
 */

import { Alert } from 'react-native';
import { createRateLimiter, sanitizeName, sanitizeText, sanitizeCurrency, sanitizeNumber } from './security';
import { logger } from './logger';

// ============================================================================
// TIPOS
// ============================================================================

type OperationType = 'read' | 'write' | 'delete' | 'auth';

interface SecureOperationOptions {
  operationType: OperationType;
  userId?: string;
  showAlert?: boolean;
  logOperation?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetInMs: number;
}

// ============================================================================
// RATE LIMITING WRAPPER
// ============================================================================

/**
 * Executa uma operação com rate limiting
 * Se exceder o limite, mostra alerta e rejeita a operação
 */
export async function withRateLimit<T>(
  operation: () => Promise<T> | T,
  options: SecureOperationOptions
): Promise<T> {
  const { operationType, userId, showAlert = true, logOperation = true } = options;

  const rateLimiter = createRateLimiter(operationType, userId);
  const result: RateLimitResult = rateLimiter();

  if (!result.allowed) {
    const waitSeconds = Math.ceil(result.resetInMs / 1000);
    const message = `Muitas operações. Aguarde ${waitSeconds} segundos.`;

    if (logOperation) {
      logger.warn('Rate limit excedido', { operationType, userId, resetInMs: result.resetInMs });
    }

    if (showAlert) {
      Alert.alert('Limite atingido', message);
    }

    throw new Error(`RATE_LIMIT_EXCEEDED: ${message}`);
  }

  if (logOperation && result.remainingRequests < 10) {
    logger.info('Rate limit quase atingido', {
      operationType,
      remaining: result.remainingRequests,
    });
  }

  return operation();
}

// ============================================================================
// SANITIZAÇÃO DE DADOS FINANCEIROS
// ============================================================================

interface ExpenseData {
  name: string;
  value: number | string;
  observations?: string;
  [key: string]: any;
}

interface ReceiptData {
  name: string;
  value: number | string;
  category?: string;
  [key: string]: any;
}

/**
 * Sanitiza dados de despesa antes de salvar
 */
export function sanitizeExpenseData<T extends ExpenseData>(data: T): T {
  return {
    ...data,
    name: sanitizeName(data.name) || 'Despesa sem nome',
    value: sanitizeCurrency(data.value),
    observations: data.observations ? sanitizeText(data.observations, 1000) : undefined,
  };
}

/**
 * Sanitiza dados de recebimento antes de salvar
 */
export function sanitizeReceiptData<T extends ReceiptData>(data: T): T {
  return {
    ...data,
    name: sanitizeName(data.name) || 'Recebimento sem nome',
    value: sanitizeCurrency(data.value),
    category: data.category ? sanitizeName(data.category) : undefined,
  };
}

/**
 * Sanitiza dados de equipamento antes de salvar
 */
export function sanitizeEquipmentData(data: {
  name: string;
  brand: string;
  year: number | string;
  [key: string]: any;
}) {
  return {
    ...data,
    name: sanitizeName(data.name) || 'Equipamento sem nome',
    brand: sanitizeName(data.brand) || 'Marca desconhecida',
    year: sanitizeNumber(data.year, { min: 1900, max: new Date().getFullYear() + 1, allowDecimals: false }),
  };
}

/**
 * Sanitiza dados de contrato antes de salvar
 */
export function sanitizeContractData(data: {
  name: string;
  value?: number | string;
  observations?: string;
  [key: string]: any;
}) {
  return {
    ...data,
    name: sanitizeName(data.name) || 'Contrato sem nome',
    value: data.value ? sanitizeCurrency(data.value) : undefined,
    observations: data.observations ? sanitizeText(data.observations, 2000) : undefined,
  };
}

/**
 * Sanitiza dados de funcionário antes de salvar
 */
export function sanitizeEmployeeData(data: {
  employeeName: string;
  documentName: string;
  [key: string]: any;
}) {
  return {
    ...data,
    employeeName: sanitizeName(data.employeeName) || 'Funcionário sem nome',
    documentName: sanitizeName(data.documentName) || 'Documento sem nome',
  };
}

// ============================================================================
// OPERAÇÕES SEGURAS (COMBINANDO RATE LIMIT + SANITIZAÇÃO)
// ============================================================================

/**
 * Cria uma versão segura de uma função de adicionar dados
 * Aplica sanitização e rate limiting automaticamente
 */
export function createSecureAddOperation<TInput, TOutput>(
  addFn: (data: TInput) => TOutput | Promise<TOutput>,
  sanitizeFn: (data: TInput) => TInput,
  options: Partial<SecureOperationOptions> = {}
): (data: TInput, userId?: string) => Promise<TOutput> {
  return async (data: TInput, userId?: string) => {
    // Sanitiza os dados
    const sanitizedData = sanitizeFn(data);

    // Executa com rate limiting
    return withRateLimit(
      () => addFn(sanitizedData),
      {
        operationType: 'write',
        userId,
        ...options,
      }
    );
  };
}

/**
 * Cria uma versão segura de uma função de deletar dados
 * Aplica rate limiting (mais restritivo para deleções)
 */
export function createSecureDeleteOperation<TOutput>(
  deleteFn: (id: string) => TOutput | Promise<TOutput>,
  options: Partial<SecureOperationOptions> = {}
): (id: string, userId?: string) => Promise<TOutput> {
  return async (id: string, userId?: string) => {
    return withRateLimit(
      () => deleteFn(id),
      {
        operationType: 'delete',
        userId,
        ...options,
      }
    );
  };
}

// ============================================================================
// VALIDAÇÃO DE OPERAÇÕES
// ============================================================================

/**
 * Valida se uma operação de valor monetário está dentro dos limites aceitáveis
 */
export function validateMonetaryOperation(
  value: number,
  options: {
    maxValue?: number;
    minValue?: number;
    operationType?: string;
  } = {}
): { isValid: boolean; error?: string } {
  const { maxValue = 10000000, minValue = 0, operationType = 'operação' } = options;

  if (value < minValue) {
    return { isValid: false, error: `Valor mínimo para ${operationType}: R$ ${minValue.toFixed(2)}` };
  }

  if (value > maxValue) {
    return {
      isValid: false,
      error: `Valor máximo para ${operationType}: R$ ${maxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    };
  }

  return { isValid: true };
}

/**
 * Verifica se o usuário tem permissão para uma operação específica
 * (placeholder - deve ser integrado com o sistema de permissões existente)
 */
export function checkOperationPermission(
  operation: 'create' | 'read' | 'update' | 'delete',
  resource: string,
  userRole?: string
): boolean {
  // Por padrão, permite todas as operações
  // Integrar com o PermissionsContext existente
  return true;
}

// ============================================================================
// LOGGING DE SEGURANÇA
// ============================================================================

/**
 * Registra uma operação para auditoria
 */
export function logSecurityEvent(
  event: 'operation' | 'rate_limit' | 'validation_fail' | 'permission_denied',
  details: {
    operation?: string;
    userId?: string;
    resource?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }
) {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };

  switch (event) {
    case 'rate_limit':
    case 'permission_denied':
      logger.warn(`Security Event: ${event}`, logData);
      break;
    case 'validation_fail':
      logger.info(`Security Event: ${event}`, logData);
      break;
    default:
      logger.debug(`Security Event: ${event}`, logData);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const secureOps = {
  withRateLimit,
  sanitizeExpenseData,
  sanitizeReceiptData,
  sanitizeEquipmentData,
  sanitizeContractData,
  sanitizeEmployeeData,
  createSecureAddOperation,
  createSecureDeleteOperation,
  validateMonetaryOperation,
  checkOperationPermission,
  logSecurityEvent,
};

export default secureOps;
