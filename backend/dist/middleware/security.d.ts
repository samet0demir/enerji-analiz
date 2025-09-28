import { Request, Response, NextFunction } from 'express';
export declare const generalLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const strictLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const responseCompression: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const apiKeyAuth: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const ipWhitelist: (allowedIPs: string[]) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const requestSizeLimiter: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const corsOptions: {
    origin: (origin: string | undefined, callback: Function) => any;
    credentials: boolean;
    optionsSuccessStatus: number;
    methods: string[];
    allowedHeaders: string[];
};
