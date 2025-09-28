import { Pool } from 'pg';
import { getDbPool } from './database';

interface Migration {
  id: string;
  description: string;
  sql: string;
}

// Migration definitions
const migrations: Migration[] = [
  {
    id: '001_initial_schema',
    description: 'Create initial tables for energy data',
    sql: `
      -- Create migrations table to track applied migrations
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create energy_data table for storing EPİAŞ data
      CREATE TABLE IF NOT EXISTS energy_data (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        hour VARCHAR(5) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        natural_gas DECIMAL(10,2) DEFAULT 0,
        damned_hydro DECIMAL(10,2) DEFAULT 0,
        lignite DECIMAL(10,2) DEFAULT 0,
        river DECIMAL(10,2) DEFAULT 0,
        import_coal DECIMAL(10,2) DEFAULT 0,
        wind DECIMAL(10,2) DEFAULT 0,
        sun DECIMAL(10,2) DEFAULT 0,
        fuel_oil DECIMAL(10,2) DEFAULT 0,
        geothermal DECIMAL(10,2) DEFAULT 0,
        asphaltite_coal DECIMAL(10,2) DEFAULT 0,
        black_coal DECIMAL(10,2) DEFAULT 0,
        biomass DECIMAL(10,2) DEFAULT 0,
        naphta DECIMAL(10,2) DEFAULT 0,
        lng DECIMAL(10,2) DEFAULT 0,
        import_export DECIMAL(10,2) DEFAULT 0,
        waste_heat DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

        -- Ensure unique constraint on date and hour
        UNIQUE(date, hour)
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_energy_data_date ON energy_data(date);
      CREATE INDEX IF NOT EXISTS idx_energy_data_date_hour ON energy_data(date, hour);

      -- Create data_collection_logs table for tracking API calls
      CREATE TABLE IF NOT EXISTS data_collection_logs (
        id SERIAL PRIMARY KEY,
        status VARCHAR(20) NOT NULL, -- 'success', 'error', 'partial'
        records_inserted INTEGER DEFAULT 0,
        records_updated INTEGER DEFAULT 0,
        error_message TEXT,
        execution_time_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  }
];

export const runMigrations = async (): Promise<void> => {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    console.log('🔄 Running database migrations...');

    // Create migrations table if it doesn't exist
    await client.query(migrations[0].sql);

    // Check which migrations have been applied
    const appliedMigrations = await client.query(
      'SELECT id FROM migrations ORDER BY applied_at'
    );
    const appliedIds = appliedMigrations.rows.map(row => row.id);

    // Run pending migrations
    for (const migration of migrations) {
      if (!appliedIds.includes(migration.id)) {
        console.log(`📝 Applying migration: ${migration.id} - ${migration.description}`);

        await client.query('BEGIN');
        try {
          // Execute migration SQL
          await client.query(migration.sql);

          // Record migration as applied
          await client.query(
            'INSERT INTO migrations (id, description) VALUES ($1, $2)',
            [migration.id, migration.description]
          );

          await client.query('COMMIT');
          console.log(`✅ Migration ${migration.id} applied successfully`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      } else {
        console.log(`⏭️  Migration ${migration.id} already applied`);
      }
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getMigrationStatus = async (): Promise<any[]> => {
  const pool = getDbPool();
  const result = await pool.query(
    'SELECT * FROM migrations ORDER BY applied_at DESC'
  );
  return result.rows;
};