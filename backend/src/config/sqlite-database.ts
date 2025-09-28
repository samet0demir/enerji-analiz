import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export const initializeSQLiteDatabase = (): Database.Database => {
  if (db) {
    return db;
  }

  // Database file path
  const dbPath = path.join(__dirname, '../../data/energy.db');

  // Ensure data directory exists
  const fs = require('fs');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize SQLite database
  db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  console.log('✅ SQLite database connection initialized:', dbPath);
  return db;
};

export const getSQLiteDb = (): Database.Database => {
  if (!db) {
    throw new Error('SQLite database not initialized. Call initializeSQLiteDatabase() first.');
  }
  return db;
};

export const closeSQLiteDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
    console.log('✅ SQLite database connection closed');
  }
};

// Health check function
export const checkSQLiteHealth = (): boolean => {
  try {
    const result = db?.prepare('SELECT 1 as health').get() as { health: number } | undefined;
    return result?.health === 1;
  } catch (error) {
    console.error('SQLite health check failed:', error);
    return false;
  }
};