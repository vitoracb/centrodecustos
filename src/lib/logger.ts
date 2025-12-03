type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  log: (level: LogLevel, ...args: any[]) => void;
}

export const logger: Logger = {
  debug: (...args: any[]) => {
    if (__DEV__) console.debug('[DEBUG]', ...args);
  },
  info: (...args: any[]) => {
    if (__DEV__) console.info('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  log: (level: LogLevel, ...args: any[]) => {
    switch (level) {
      case 'debug':
        if (__DEV__) console.debug('[DEBUG]', ...args);
        break;
      case 'info':
        if (__DEV__) console.info('[INFO]', ...args);
        break;
      case 'warn':
        console.warn('[WARN]', ...args);
        break;
      case 'error':
        console.error('[ERROR]', ...args);
        break;
      default:
        console.log(...args);
    }
  },
};

