import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

  if (error.name === 'MongoError' && (error as any).code === 11000) {
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

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new CustomError(`Route ${req.method} ${req.originalUrl} not found`, 404);
  next(error);
};

// Validation middleware
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map((detail: any) => detail.message).join(', ');
      return next(new CustomError(`Validation Error: ${message}`, 400));
    }
    next();
  };
};