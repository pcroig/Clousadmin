// ========================================
// Logger Estructurado - Sistema Central
// ========================================
// Logger simple y eficiente sin dependencias externas
// Proporciona logs estructurados con niveles y contexto

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

class Logger {
  private isDevelopment: boolean;
  private minLevel: LogLevel;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || (this.isDevelopment ? 'debug' : 'info');
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minLevelIndex = levels.indexOf(this.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }

  private formatEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // En desarrollo: formato legible
      const parts = [
        `[${entry.level.toUpperCase()}]`,
        entry.timestamp,
        entry.message,
      ];

      if (entry.context && Object.keys(entry.context).length > 0) {
        parts.push(JSON.stringify(entry.context, null, 2));
      }

      if (entry.error) {
        parts.push(`\nError: ${entry.error.message}`);
        if (entry.error.stack) {
          parts.push(entry.error.stack);
        }
      }

      return parts.join(' ');
    } else {
      // En producción: JSON estructurado para herramientas de análisis
      return JSON.stringify(entry);
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    const formatted = this.formatEntry(entry);

    // Usar console nativo con el método apropiado
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, contextOrError?: LogContext | Error, maybeError?: Error): void {
    let context: LogContext | undefined;
    let error: Error | undefined;

    if (contextOrError instanceof Error) {
      error = contextOrError;
    } else {
      context = contextOrError;
      error = maybeError;
    }

    this.log('error', message, context, error);
  }

  // Métodos de conveniencia para casos de uso comunes
  api(endpoint: string, method: string, status: number, durationMs?: number): void {
    this.info('API Request', {
      endpoint,
      method,
      status,
      durationMs,
    });
  }

  database(operation: string, table: string, durationMs?: number, error?: Error): void {
    if (error) {
      this.error('Database Error', { operation, table, durationMs }, error);
    } else {
      this.debug('Database Operation', { operation, table, durationMs });
    }
  }

  cron(name: string, status: 'started' | 'completed' | 'failed', metadata?: LogContext): void {
    const level = status === 'failed' ? 'error' : 'info';
    this.log(level, `CRON ${name} ${status}`, metadata);
  }
}

// Singleton instance
export const logger = new Logger();

// Export type para uso en otros módulos
export type { LogLevel, LogContext };
