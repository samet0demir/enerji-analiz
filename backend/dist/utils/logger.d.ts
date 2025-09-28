declare class Logger {
    private serviceName;
    constructor(serviceName?: string);
    private formatMessage;
    private log;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
    debug(message: string, data?: any): void;
    apiRequest(method: string, url: string, statusCode: number, duration: number): void;
    dbOperation(operation: string, table: string, records: number, duration: number): void;
    epiasOperation(operation: string, records: number, duration: number): void;
    schedulerEvent(event: string, details?: any): void;
}
export declare const logger: Logger;
export declare const dbLogger: Logger;
export declare const epiasLogger: Logger;
export declare const schedulerLogger: Logger;
export declare const requestLogger: (req: any, res: any, next: any) => void;
export {};
