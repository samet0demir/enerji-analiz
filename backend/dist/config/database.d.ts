import { Pool } from 'pg';
export declare const initializeDatabase: () => Pool;
export declare const getDbPool: () => Pool;
export declare const closeDatabase: () => Promise<void>;
export declare const checkDatabaseHealth: () => Promise<boolean>;
