/**
 * Utilitários de segurança para sanitização de inputs e proteção contra ataques
 */

// ============================================================================
// SANITIZAÇÃO DE STRINGS
// ============================================================================

/**
 * Remove caracteres potencialmente perigosos de uma string
 * Protege contra XSS e injeção de código
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';

  return input
    .trim()
    // Remove tags HTML/XML
    .replace(/<[^>]*>/g, '')
    // Escapa caracteres especiais HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Remove caracteres de controle (exceto newline e tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limita espaços múltiplos a um único espaço
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitiza string para uso em nomes (pessoas, equipamentos, etc.)
 * Mais restritivo - apenas letras, números, espaços e alguns caracteres
 */
export function sanitizeName(input: string | null | undefined): string {
  if (!input) return '';

  return input
    .trim()
    // Remove tags HTML
    .replace(/<[^>]*>/g, '')
    // Permite apenas letras (incluindo acentos), números, espaços, hífens e pontos
    .replace(/[^\p{L}\p{N}\s\-\.]/gu, '')
    // Limita espaços múltiplos
    .replace(/\s+/g, ' ')
    .trim()
    // Limita tamanho máximo
    .slice(0, 200);
}

/**
 * Sanitiza string para uso em observações/descrições
 * Permite mais caracteres, mas ainda protege contra XSS
 */
export function sanitizeText(input: string | null | undefined, maxLength: number = 2000): string {
  if (!input) return '';

  return input
    .trim()
    // Remove tags HTML
    .replace(/<[^>]*>/g, '')
    // Remove caracteres de controle perigosos
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Mantém quebras de linha (converte para padrão)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Limita quebras de linha consecutivas a 2
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitiza valores numéricos
 * Retorna 0 se inválido
 */
export function sanitizeNumber(input: string | number | null | undefined, options: {
  min?: number;
  max?: number;
  allowDecimals?: boolean;
  defaultValue?: number;
} = {}): number {
  const { min, max, allowDecimals = true, defaultValue = 0 } = options;

  if (input === null || input === undefined || input === '') {
    return defaultValue;
  }

  // Converte para string e limpa
  let numStr = String(input)
    .replace(/[^\d.,\-]/g, '')
    .replace(',', '.');

  // Parse
  const num = allowDecimals ? parseFloat(numStr) : parseInt(numStr, 10);

  if (isNaN(num)) {
    return defaultValue;
  }

  // Aplica limites
  let result = num;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;

  return result;
}

/**
 * Sanitiza valor monetário
 * Retorna valor em centavos ou como número decimal
 */
export function sanitizeCurrency(input: string | number | null | undefined): number {
  return sanitizeNumber(input, {
    min: 0,
    max: 999999999.99, // ~1 bilhão
    allowDecimals: true,
    defaultValue: 0,
  });
}

/**
 * Sanitiza código/identificador
 * Apenas letras minúsculas, números e underscores
 */
export function sanitizeCode(input: string | null | undefined): string {
  if (!input) return '';

  return input
    .toLowerCase()
    .trim()
    // Remove tudo exceto letras, números e underscore
    .replace(/[^a-z0-9_]/g, '_')
    // Remove underscores múltiplos
    .replace(/_+/g, '_')
    // Remove underscore no início/fim
    .replace(/^_|_$/g, '')
    .slice(0, 50);
}

// ============================================================================
// VALIDAÇÕES DE SEGURANÇA
// ============================================================================

/**
 * Verifica se uma string contém padrões suspeitos de injeção SQL
 */
export function hasSQLInjectionPatterns(input: string): boolean {
  if (!input) return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/i,
    /(\bOR\b\s+[\d'"]+=[\d'"]+)/i, // OR 1=1, OR '1'='1'
    /(\bAND\b\s+[\d'"]+=[\d'"]+)/i,
    /(--\s*$|\/\*|\*\/)/i, // Comentários SQL
    /(\bUNION\b\s+\bSELECT\b)/i,
    /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))/i,
    /(\bINTO\b\s+\bOUTFILE\b)/i,
    /(\bLOAD_FILE\b)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Verifica se uma string contém padrões suspeitos de XSS
 */
export function hasXSSPatterns(input: string): boolean {
  if (!input) return false;

  const xssPatterns = [
    /<script\b[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<svg\b.*?onload/i,
    /expression\s*\(/i,
    /data:\s*text\/html/i,
    /vbscript:/i,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Valida e sanitiza input completo
 * Retorna objeto com valor sanitizado e possíveis avisos
 */
export function validateAndSanitize(
  input: string | null | undefined,
  type: 'name' | 'text' | 'code' | 'general' = 'general',
  options: { maxLength?: number; required?: boolean } = {}
): { value: string; isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const { maxLength = 1000, required = false } = options;

  // Verifica se é obrigatório
  if (required && (!input || input.trim() === '')) {
    return { value: '', isValid: false, warnings: ['Campo obrigatório'] };
  }

  if (!input) {
    return { value: '', isValid: true, warnings: [] };
  }

  // Verifica padrões perigosos
  if (hasSQLInjectionPatterns(input)) {
    warnings.push('Caracteres suspeitos detectados e removidos');
  }

  if (hasXSSPatterns(input)) {
    warnings.push('Conteúdo potencialmente perigoso removido');
  }

  // Sanitiza de acordo com o tipo
  let sanitized: string;
  switch (type) {
    case 'name':
      sanitized = sanitizeName(input);
      break;
    case 'text':
      sanitized = sanitizeText(input, maxLength);
      break;
    case 'code':
      sanitized = sanitizeCode(input);
      break;
    default:
      sanitized = sanitizeString(input).slice(0, maxLength);
  }

  // Verifica se houve alteração significativa
  if (input.trim() !== sanitized && input.trim().length > 0) {
    if (!warnings.length) {
      warnings.push('Alguns caracteres foram ajustados');
    }
  }

  return {
    value: sanitized,
    isValid: sanitized.length > 0 || !required,
    warnings,
  };
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

/**
 * Verifica e aplica rate limiting
 * Retorna true se a requisição deve ser permitida
 */
export function checkRateLimit(
  key: string,
  options: {
    maxRequests?: number;
    windowMs?: number;
    blockDurationMs?: number;
  } = {}
): { allowed: boolean; remainingRequests: number; resetInMs: number } {
  const {
    maxRequests = 60,      // 60 requisições
    windowMs = 60000,      // por minuto
    blockDurationMs = 60000, // bloqueio de 1 minuto
  } = options;

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Limpa entradas antigas (garbage collection simples)
  if (rateLimitStore.size > 1000) {
    const cutoff = now - windowMs * 2;
    rateLimitStore.forEach((value, key) => {
      if (value.lastRequest < cutoff) {
        rateLimitStore.delete(key);
      }
    });
  }

  if (!entry) {
    // Primeira requisição
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    });
    return { allowed: true, remainingRequests: maxRequests - 1, resetInMs: windowMs };
  }

  // Verifica se a janela expirou
  if (now - entry.firstRequest > windowMs) {
    // Reset da janela
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    });
    return { allowed: true, remainingRequests: maxRequests - 1, resetInMs: windowMs };
  }

  // Verifica se excedeu o limite
  if (entry.count >= maxRequests) {
    const resetInMs = entry.firstRequest + windowMs + blockDurationMs - now;
    return { allowed: false, remainingRequests: 0, resetInMs: Math.max(0, resetInMs) };
  }

  // Incrementa contador
  entry.count++;
  entry.lastRequest = now;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remainingRequests: maxRequests - entry.count,
    resetInMs: entry.firstRequest + windowMs - now,
  };
}

/**
 * Cria um rate limiter para operações específicas
 */
export function createRateLimiter(
  operationType: 'read' | 'write' | 'delete' | 'auth',
  userId?: string
) {
  const limits = {
    read: { maxRequests: 120, windowMs: 60000 },   // 120 leituras/min
    write: { maxRequests: 30, windowMs: 60000 },   // 30 escritas/min
    delete: { maxRequests: 10, windowMs: 60000 },  // 10 deleções/min
    auth: { maxRequests: 5, windowMs: 300000 },    // 5 tentativas/5min
  };

  const key = `${operationType}:${userId || 'anonymous'}`;
  return () => checkRateLimit(key, limits[operationType]);
}

/**
 * Reseta o rate limit para uma chave específica
 * Útil após login bem-sucedido, por exemplo
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// ============================================================================
// VALIDAÇÃO DE EMAILS
// ============================================================================

/**
 * Valida formato de email
 */
export function validateEmail(email: string | null | undefined): {
  isValid: boolean;
  sanitized: string;
  errorMessage?: string;
} {
  if (!email || email.trim() === '') {
    return { isValid: false, sanitized: '', errorMessage: 'Email é obrigatório' };
  }

  const sanitized = email.trim().toLowerCase();

  // Regex para validação de email (RFC 5322 simplificado)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitized)) {
    return { isValid: false, sanitized, errorMessage: 'Formato de email inválido' };
  }

  if (sanitized.length > 254) {
    return { isValid: false, sanitized, errorMessage: 'Email muito longo' };
  }

  return { isValid: true, sanitized };
}

// ============================================================================
// VALIDAÇÃO DE SENHAS
// ============================================================================

/**
 * Valida força da senha
 */
export function validatePassword(password: string | null | undefined): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errorMessage?: string;
  suggestions: string[];
} {
  const suggestions: string[] = [];

  if (!password) {
    return {
      isValid: false,
      strength: 'weak',
      errorMessage: 'Senha é obrigatória',
      suggestions: ['Digite uma senha'],
    };
  }

  if (password.length < 8) {
    suggestions.push('Use pelo menos 8 caracteres');
  }

  if (!/[a-z]/.test(password)) {
    suggestions.push('Adicione letras minúsculas');
  }

  if (!/[A-Z]/.test(password)) {
    suggestions.push('Adicione letras maiúsculas');
  }

  if (!/[0-9]/.test(password)) {
    suggestions.push('Adicione números');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    suggestions.push('Adicione caracteres especiais');
  }

  // Verifica senhas comuns
  const commonPasswords = ['12345678', 'password', 'qwerty', 'abc123', '123456789'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      isValid: false,
      strength: 'weak',
      errorMessage: 'Senha muito comum',
      suggestions: ['Use uma senha mais única'],
    };
  }

  // Calcula força
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 2) strength = 'medium';

  const isValid = password.length >= 8 && score >= 2;

  return {
    isValid,
    strength,
    errorMessage: isValid ? undefined : 'Senha muito fraca',
    suggestions,
  };
}

// ============================================================================
// EXPORTS UTILITÁRIOS
// ============================================================================

// ============================================================================
// CRIPTOGRAFIA PARA DADOS SENSÍVEIS
// ============================================================================

/**
 * Gera uma chave derivada simples do userId para criptografia
 * NOTA: Para produção, considere usar expo-crypto ou libraries mais robustas
 */
function generateKey(userId: string): string {
  // Implementação simples usando hash do userId
  // Em produção, considere usar PBKDF2 ou similar
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Criptografa dados sensíveis usando uma cifra simples XOR
 * NOTA: Para produção, use algoritmos mais robustos como AES
 */
export function encryptSensitiveData(data: any, userId: string): string {
  if (!data || !userId) return '';

  try {
    const jsonString = JSON.stringify(data);
    const key = generateKey(userId);
    let encrypted = '';

    for (let i = 0; i < jsonString.length; i++) {
      const keyChar = key[i % key.length];
      const dataChar = jsonString.charCodeAt(i);
      const keyCharCode = keyChar.charCodeAt(0);
      encrypted += String.fromCharCode(dataChar ^ keyCharCode);
    }

    // Encode to base64 para storage seguro
    return btoa(encrypted);
  } catch (error) {
    console.warn('[Security] Erro ao criptografar dados:', error);
    return '';
  }
}

/**
 * Descriptografa dados sensíveis
 */
export function decryptSensitiveData<T = any>(encryptedData: string, userId: string): T | null {
  if (!encryptedData || !userId) return null;

  try {
    // Decode from base64
    const encrypted = atob(encryptedData);
    const key = generateKey(userId);
    let decrypted = '';

    for (let i = 0; i < encrypted.length; i++) {
      const keyChar = key[i % key.length];
      const encryptedChar = encrypted.charCodeAt(i);
      const keyCharCode = keyChar.charCodeAt(0);
      decrypted += String.fromCharCode(encryptedChar ^ keyCharCode);
    }

    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.warn('[Security] Erro ao descriptografar dados:', error);
    return null;
  }
}

/**
 * Verifica se um tipo de dados deve ser criptografado
 */
export function shouldEncryptData(key: string): boolean {
  const sensitiveKeyPatterns = [
    'financial_transactions', // dados financeiros
    'expenses',              // despesas
    'receipts',              // recebimentos
    'contracts',             // contratos
    'salary',                // salários
    'payment',               // pagamentos
  ];

  return sensitiveKeyPatterns.some(pattern => key.toLowerCase().includes(pattern));
}

export const security = {
  sanitizeString,
  sanitizeName,
  sanitizeText,
  sanitizeNumber,
  sanitizeCurrency,
  sanitizeCode,
  hasSQLInjectionPatterns,
  hasXSSPatterns,
  validateAndSanitize,
  checkRateLimit,
  createRateLimiter,
  resetRateLimit,
  validateEmail,
  validatePassword,
  encryptSensitiveData,
  decryptSensitiveData,
  shouldEncryptData,
};

export default security;
