"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseHealth = exports.closeDatabase = exports.getDbPool = exports.initializeDatabase = void 0;
const pg_1 = require("pg");
// Database connection pool
let pool = null;
const initializeDatabase = () => {
    if (pool) {
        return pool;
    }
    const dbConfig = {
        connectionString: process.env.DATABASE_URL,
        // Connection pool settings
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    };
    pool = new pg_1.Pool(dbConfig);
    // Handle pool errors
    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
    });
    console.log('✅ Database connection pool initialized');
    return pool;
};
exports.initializeDatabase = initializeDatabase;
const getDbPool = () => {
    if (!pool) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return pool;
};
exports.getDbPool = getDbPool;
const closeDatabase = async () => {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('✅ Database connection pool closed');
    }
};
exports.closeDatabase = closeDatabase;
// Health check function
const checkDatabaseHealth = async () => {
    try {
        const client = await (0, exports.getDbPool)().connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        return result.rows.length > 0;
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
//# sourceMappingURL=database.js.map