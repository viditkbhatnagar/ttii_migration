import type { IntegrationLogger } from './contracts.js';

function write(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  details?: Record<string, unknown>,
): void {
  const record = details ? `${message} ${JSON.stringify(details)}` : message;

  if (level === 'debug') {
    console.debug(record);
    return;
  }

  if (level === 'info') {
    console.info(record);
    return;
  }

  if (level === 'warn') {
    console.warn(record);
    return;
  }

  console.error(record);
}

export function createConsoleIntegrationLogger(): IntegrationLogger {
  return {
    debug(message, details) {
      write('debug', message, details);
    },
    info(message, details) {
      write('info', message, details);
    },
    warn(message, details) {
      write('warn', message, details);
    },
    error(message, details) {
      write('error', message, details);
    },
  };
}
