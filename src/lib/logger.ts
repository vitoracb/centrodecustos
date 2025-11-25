/**
 * Sistema de Logging
 * 
 * Desabilita logs em produção para melhor performance
 * e reduzir exposição de informações sensíveis
 */

const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface Logger {
  log: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

const createLogger = (level: LogLevel): Logger[LogLevel] => {
  if (!isDevelopment) {
    // Em produção, apenas erros são logados
    if (level === 'error') {
      return (...args: any[]) => {
        console.error(...args);
      };
    }
    // Silencia outros logs em produção
    return () => {};
  }

  // Em desenvolvimento, todos os logs funcionam
  const consoleMethod = console[level] || console.log;
  return (...args: any[]) => {
    consoleMethod(...args);
  };
};

export const logger: Logger = {
  log: createLogger('log'),
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),
  debug: createLogger('debug'),
};

// Helper para logs formatados
export const logWithPrefix = (prefix: string, level: LogLevel = 'log') => {
  return (...args: any[]) => {
    if (isDevelopment || level === 'error') {
      const consoleMethod = console[level] || console.log;
      consoleMethod(`[${prefix}]`, ...args);
    }
  };
};

