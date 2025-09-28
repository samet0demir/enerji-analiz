"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = exports.requestSizeLimiter = exports.ipWhitelist = exports.apiKeyAuth = exports.responseCompression = exports.securityHeaders = exports.apiLimiter = exports.strictLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
// Rate limiting configuration
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Stricter rate limiting for sensitive endpoints
exports.strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
        error: 'Too many requests to this endpoint, please try again after 15 minutes.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiting for API endpoints specifically
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'development' ? 500 : 30, // Development'te çok gevşek
    message: {
        error: 'API rate limit exceeded. Please try again after 1 minute.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for certain IPs (localhost, etc.)
    skip: (req) => {
        const ip = req.ip;
        const allowedIPs = ['127.0.0.1', '::1', 'localhost'];
        return allowedIPs.includes(ip || '');
    }
});
// Security headers with helmet
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' }
});
// Response compression
exports.responseCompression = (0, compression_1.default)({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
    level: 6,
    threshold: 1024
});
// API Key authentication middleware (optional)
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apikey;
    // For development, skip API key validation
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    // In production, validate API key
    const validApiKey = process.env.API_KEY;
    if (!validApiKey) {
        return next(); // Skip if no API key is set
    }
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or missing API key',
            message: 'Please provide a valid API key in the x-api-key header or apikey query parameter'
        });
    }
    next();
};
exports.apiKeyAuth = apiKeyAuth;
// IP whitelist middleware
const ipWhitelist = (allowedIPs) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress || '';
        // Skip in development
        if (process.env.NODE_ENV === 'development') {
            return next();
        }
        if (!allowedIPs.includes(clientIP)) {
            return res.status(403).json({
                success: false,
                error: 'Access forbidden',
                message: 'Your IP address is not authorized to access this resource'
            });
        }
        next();
    };
};
exports.ipWhitelist = ipWhitelist;
// Request size limiter
const requestSizeLimiter = (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 1024 * 1024; // 1MB
    if (contentLength > maxSize) {
        return res.status(413).json({
            success: false,
            error: 'Request entity too large',
            message: 'Request size exceeds the maximum allowed limit of 1MB'
        });
    }
    next();
};
exports.requestSizeLimiter = requestSizeLimiter;
// CORS options for production
exports.corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
            'http://localhost:5173'
        ];
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};
//# sourceMappingURL=security.js.map