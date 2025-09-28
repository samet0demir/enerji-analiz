"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSQLiteHealth = exports.closeSQLiteDatabase = exports.getSQLiteDb = exports.initializeSQLiteDatabase = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
let db = null;
const initializeSQLiteDatabase = () => {
    if (db) {
        return db;
    }
    // Database file path
    const dbPath = path_1.default.join(__dirname, '../../data/energy.db');
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path_1.default.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    // Initialize SQLite database
    db = new better_sqlite3_1.default(dbPath);
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    console.log('✅ SQLite database connection initialized:', dbPath);
    return db;
};
exports.initializeSQLiteDatabase = initializeSQLiteDatabase;
const getSQLiteDb = () => {
    if (!db) {
        throw new Error('SQLite database not initialized. Call initializeSQLiteDatabase() first.');
    }
    return db;
};
exports.getSQLiteDb = getSQLiteDb;
const closeSQLiteDatabase = () => {
    if (db) {
        db.close();
        db = null;
        console.log('✅ SQLite database connection closed');
    }
};
exports.closeSQLiteDatabase = closeSQLiteDatabase;
// Health check function
const checkSQLiteHealth = () => {
    try {
        const result = db?.prepare('SELECT 1 as health').get();
        return result?.health === 1;
    }
    catch (error) {
        console.error('SQLite health check failed:', error);
        return false;
    }
};
exports.checkSQLiteHealth = checkSQLiteHealth;
//# sourceMappingURL=sqlite-database.js.map