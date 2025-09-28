"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.notFound = exports.asyncHandler = exports.errorHandler = exports.CustomError = void 0;
class CustomError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    // Log error
    console.error('💥 Error:', {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    // Default error
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    // Mongoose/Database errors
    if (error.name === 'CastError') {
        message = 'Resource not found';
        statusCode = 404;
    }
    if (error.name === 'ValidationError') {
        message = 'Validation Error';
        statusCode = 400;
    }
    if (error.name === 'MongoError' && error.code === 11000) {
        message = 'Duplicate field value entered';
        statusCode = 400;
    }
    // EPİAŞ API errors
    if (message.includes('EPİAŞ') || message.includes('EPIAS')) {
        statusCode = 502; // Bad Gateway
    }
    // Database connection errors
    if (message.includes('database') || message.includes('connection')) {
        statusCode = 503; // Service Unavailable
    }
    res.status(statusCode).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: error
        })
    });
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
// 404 handler
const notFound = (req, res, next) => {
    const error = new CustomError(`Route ${req.method} ${req.originalUrl} not found`, 404);
    next(error);
};
exports.notFound = notFound;
// Validation middleware
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            const message = error.details.map((detail) => detail.message).join(', ');
            return next(new CustomError(`Validation Error: ${message}`, 400));
        }
        next();
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=errorHandler.js.map