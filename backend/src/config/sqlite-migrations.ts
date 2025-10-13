import { getSQLiteDb } from './sqlite-database';

interface Migration {
  id: string;
  description: string;
  sql: string;
}

// Migration definitions for SQLite
const migrations: Migration[] = [
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
  },
  {
    id: '002_staging_and_backfill',
    description: 'Create staging table for backfill and add data quality columns',
    sql: `
      -- Create staging table for raw data before validation
      CREATE TABLE IF NOT EXISTS energy_data_staging (
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

        -- Data quality flags
        is_valid INTEGER DEFAULT 1,
        is_interpolated INTEGER DEFAULT 0,
        is_outlier INTEGER DEFAULT 0,
        validation_errors TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create unique constraint on staging table
      CREATE UNIQUE INDEX IF NOT EXISTS idx_staging_date_hour ON energy_data_staging(date, hour);

      -- Create backfill progress tracking table
      CREATE TABLE IF NOT EXISTS backfill_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT NOT NULL, -- 'in_progress', 'completed', 'failed'
        records_fetched INTEGER DEFAULT 0,
        last_processed_date TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      );
    `
  },
  {
    id: '003_ptf_and_consumption',
    description: 'Add PTF (Market Clearing Price) and Consumption tables',
    sql: `
      -- Create PTF (Piyasa Takas Fiyatı) table
      CREATE TABLE IF NOT EXISTS ptf_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        hour TEXT NOT NULL,
        price_try REAL NOT NULL,
        price_usd REAL DEFAULT 0,
        price_eur REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create unique constraint on date and hour
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ptf_date_hour ON ptf_data(date, hour);
      CREATE INDEX IF NOT EXISTS idx_ptf_date ON ptf_data(date);

      -- Create Consumption table
      CREATE TABLE IF NOT EXISTS consumption_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        hour TEXT NOT NULL,
        consumption REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create unique constraint on date and hour
      CREATE UNIQUE INDEX IF NOT EXISTS idx_consumption_date_hour ON consumption_data(date, hour);
      CREATE INDEX IF NOT EXISTS idx_consumption_date ON consumption_data(date);
    `
  },
  {
    id: '004_weather_data',
    description: 'Add weather data table for Istanbul',
    sql: `
      -- Create weather_data table (from Open-Meteo API)
      CREATE TABLE IF NOT EXISTS weather_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        hour TEXT NOT NULL,
        temperature REAL NOT NULL,           -- Temperature in °C
        windspeed REAL DEFAULT 0,            -- Wind speed in km/h
        winddirection REAL DEFAULT 0,        -- Wind direction in degrees
        direct_radiation REAL DEFAULT 0,     -- Direct solar radiation in W/m²
        precipitation REAL DEFAULT 0,        -- Precipitation in mm
        cloudcover REAL DEFAULT 0,           -- Cloud cover in %
        humidity REAL DEFAULT 0,             -- Relative humidity in %
        city TEXT DEFAULT 'Istanbul',        -- City name (for future multi-city support)
        latitude REAL DEFAULT 41.01,         -- Istanbul coordinates
        longitude REAL DEFAULT 28.94,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create unique constraint on date, hour, and city
      CREATE UNIQUE INDEX IF NOT EXISTS idx_weather_date_hour_city ON weather_data(date, hour, city);
      CREATE INDEX IF NOT EXISTS idx_weather_date ON weather_data(date);
      CREATE INDEX IF NOT EXISTS idx_weather_city ON weather_data(city);
    `
  }
];

export const runSQLiteMigrations = (): void => {
  const db = getSQLiteDb();

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
          } catch (error: any) {
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
  } catch (error) {
    console.error('❌ SQLite migration failed:', error);
    throw error;
  }
};

export const getSQLiteMigrationStatus = (): any[] => {
  const db = getSQLiteDb();
  try {
    const stmt = db.prepare('SELECT * FROM migrations ORDER BY applied_at DESC');
    return stmt.all();
  } catch (error) {
    console.log('No migrations table found yet');
    return [];
  }
};