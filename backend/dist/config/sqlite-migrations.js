"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSQLiteMigrationStatus = exports.runSQLiteMigrations = void 0;
const sqlite_database_1 = require("./sqlite-database");
// Migration definitions for SQLite
const migrations = [
    {
        id: '001_initial_schema',
        description: 'Create initial tables for energy data',
        sql: `
      -- Create migrations table to track applied migrations
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create energy_data table for storing EPİAŞ data
      CREATE TABLE IF NOT EXISTS energy_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        hour TEXT NOT NULL,
        total REAL NOT NULL,
        natural_gas REAL DEFAULT 0,
        damned_hydro REAL DEFAULT 0,
        lignite REAL DEFAULT 0,
        river REAL DEFAULT 0,
        import_coal REAL DEFAULT 0,
        wind REAL DEFAULT 0,
        sun REAL DEFAULT 0,
        fuel_oil REAL DEFAULT 0,
        geothermal REAL DEFAULT 0,
        asphaltite_coal REAL DEFAULT 0,
        black_coal REAL DEFAULT 0,
        biomass REAL DEFAULT 0,
        naphta REAL DEFAULT 0,
        lng REAL DEFAULT 0,
        import_export REAL DEFAULT 0,
        waste_heat REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create unique constraint on date and hour
      CREATE UNIQUE INDEX IF NOT EXISTS idx_energy_data_date_hour ON energy_data(date, hour);

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_energy_data_date ON energy_data(date);

      -- Create data_collection_logs table for tracking API calls
      CREATE TABLE IF NOT EXISTS data_collection_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL, -- 'success', 'error', 'partial'
        records_inserted INTEGER DEFAULT 0,
        records_updated INTEGER DEFAULT 0,
        error_message TEXT,
        execution_time_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `
    }
];
const runSQLiteMigrations = () => {
    const db = (0, sqlite_database_1.getSQLiteDb)();
    try {
        console.log('🔄 Running SQLite database migrations...');
        // Enable foreign keys
        db.pragma('foreign_keys = ON');
        // Execute all migration SQLs
        for (const migration of migrations) {
            console.log(`📝 Applying migration: ${migration.id} - ${migration.description}`);
            // Start transaction
            const transaction = db.transaction(() => {
                // Split SQL into individual statements and execute
                const statements = migration.sql
                    .split(';')
                    .map(stmt => stmt.trim())
                    .filter(stmt => stmt.length > 0);
                for (const statement of statements) {
                    try {
                        db.exec(statement);
                    }
                    catch (error) {
                        if (!error.message.includes('already exists')) {
                            throw error;
                        }
                    }
                }
                // Check if migration was already applied
                const existingMigration = db
                    .prepare('SELECT id FROM migrations WHERE id = ?')
                    .get(migration.id);
                if (!existingMigration) {
                    // Record migration as applied
                    db.prepare('INSERT INTO migrations (id, description) VALUES (?, ?)')
                        .run(migration.id, migration.description);
                }
            });
            transaction();
            console.log(`✅ Migration ${migration.id} applied successfully`);
        }
        console.log('✅ All SQLite migrations completed successfully');
    }
    catch (error) {
        console.error('❌ SQLite migration failed:', error);
        throw error;
    }
};
exports.runSQLiteMigrations = runSQLiteMigrations;
const getSQLiteMigrationStatus = () => {
    const db = (0, sqlite_database_1.getSQLiteDb)();
    try {
        const stmt = db.prepare('SELECT * FROM migrations ORDER BY applied_at DESC');
        return stmt.all();
    }
    catch (error) {
        console.log('No migrations table found yet');
        return [];
    }
};
exports.getSQLiteMigrationStatus = getSQLiteMigrationStatus;
//# sourceMappingURL=sqlite-migrations.js.map