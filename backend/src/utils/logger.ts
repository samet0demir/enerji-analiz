interface LogLevel {
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug'
};

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  data?: any;
  service?: string;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'EnergyAnalytics') {
    this.serviceName = serviceName;
  }

  private formatMessage(level: string, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      ...(data && { data })
    };
  }

  private log(level: string, message: string, data?: any): void {
    const logEntry = this.formatMessage(level, message, data);

    // Console output with colors
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      debug: '\x1b[35m',   // Magenta
      reset: '\x1b[0m'     // Reset
    };

    const color = (colors as any)[level] || colors.reset;
    const emoji = {
      info: '📊',
      warn: '⚠️',
      error: '❌',
      debug: '🔍'
    };

    console.log(
      `${color}${(emoji as any)[level]} [${logEntry.timestamp}] ${(logEntry.service || 'APP').toUpperCase()} ${level.toUpperCase()}: ${message}${colors.reset}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  }

  info(message: string, data?: any): void {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(LOG_LEVELS.DEBUG, message, data);
    }
  }

  // API specific logging
  apiRequest(method: string, url: string, statusCode: number, duration: number): void {
    const level = statusCode >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
    this.log(level, `${method} ${url} - ${statusCode} (${duration}ms)`);
  }

  // Database specific logging
  dbOperation(operation: string, table: string, records: number, duration: number): void {
    this.info(`DB ${operation} on ${table}: ${records} records (${duration}ms)`);
  }

  // EPİAŞ specific logging
  epiasOperation(operation: string, records: number, duration: number): void {
    this.info(`EPİAŞ ${operation}: ${records} records (${duration}ms)`);
  }

  // Scheduler logging
  schedulerEvent(event: string, details?: any): void {
    this.info(`Scheduler: ${event}`, details);
  }
}

// Create singleton instances
export const logger = new Logger('API');
export const dbLogger = new Logger('Database');
export const epiasLogger = new Logger('EPİAŞ');
export const schedulerLogger = new Logger('Scheduler');

// Request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.apiRequest(req.method, req.originalUrl, res.statusCode, duration);
  });

  next();
};