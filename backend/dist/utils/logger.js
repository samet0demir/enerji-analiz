"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.schedulerLogger = exports.epiasLogger = exports.dbLogger = exports.logger = void 0;
const LOG_LEVELS = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    DEBUG: 'debug'
};
class Logger {
    constructor(serviceName = 'EnergyAnalytics') {
        this.serviceName = serviceName;
    }
    formatMessage(level, message, data) {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            service: this.serviceName,
            ...(data && { data })
        };
    }
    log(level, message, data) {
        const logEntry = this.formatMessage(level, message, data);
        // Console output with colors
        const colors = {
            info: '\x1b[36m', // Cyan
            warn: '\x1b[33m', // Yellow
            error: '\x1b[31m', // Red
            debug: '\x1b[35m', // Magenta
            reset: '\x1b[0m' // Reset
        };
        const color = colors[level] || colors.reset;
        const emoji = {
            info: '📊',
            warn: '⚠️',
            error: '❌',
            debug: '🔍'
        };
        console.log(`${color}${emoji[level]} [${logEntry.timestamp}] ${(logEntry.service || 'APP').toUpperCase()} ${level.toUpperCase()}: ${message}${colors.reset}`, data ? JSON.stringify(data, null, 2) : '');
    }
    info(message, data) {
        this.log(LOG_LEVELS.INFO, message, data);
    }
    warn(message, data) {
        this.log(LOG_LEVELS.WARN, message, data);
    }
    error(message, data) {
        this.log(LOG_LEVELS.ERROR, message, data);
    }
    debug(message, data) {
        if (process.env.NODE_ENV === 'development') {
            this.log(LOG_LEVELS.DEBUG, message, data);
        }
    }
    // API specific logging
    apiRequest(method, url, statusCode, duration) {
        const level = statusCode >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
        this.log(level, `${method} ${url} - ${statusCode} (${duration}ms)`);
    }
    // Database specific logging
    dbOperation(operation, table, records, duration) {
        this.info(`DB ${operation} on ${table}: ${records} records (${duration}ms)`);
    }
    // EPİAŞ specific logging
    epiasOperation(operation, records, duration) {
        this.info(`EPİAŞ ${operation}: ${records} records (${duration}ms)`);
    }
    // Scheduler logging
    schedulerEvent(event, details) {
        this.info(`Scheduler: ${event}`, details);
    }
}
// Create singleton instances
exports.logger = new Logger('API');
exports.dbLogger = new Logger('Database');
exports.epiasLogger = new Logger('EPİAŞ');
exports.schedulerLogger = new Logger('Scheduler');
// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        exports.logger.apiRequest(req.method, req.originalUrl, res.statusCode, duration);
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=logger.js.map