import Database from 'better-sqlite3';
export declare const initializeSQLiteDatabase: () => Database.Database;
export declare const getSQLiteDb: () => Database.Database;
export declare const closeSQLiteDatabase: () => void;
export declare const checkSQLiteHealth: () => boolean;
