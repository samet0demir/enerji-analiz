/**
 * Backfill Script - 6 Months Historical Data
 *
 * Purpose: Fetch 6 months of historical energy data from EPİAŞ API
 * Strategy: Chunk-based fetching with progress tracking
 *
 * Usage: ts-node src/scripts/backfill-historical-data.ts
 */

import { getHistoricalGeneration } from '../services/epias.service';
import { getSQLiteDb, initializeSQLiteDatabase } from '../config/sqlite-database';
import { runSQLiteMigrations } from '../config/sqlite-migrations';
import dotenv from 'dotenv';

dotenv.config();

interface BackfillProgress {
  id?: number;
  start_date: string;
  end_date: string;
  status: string;
  records_fetched: number;
  last_processed_date?: string;
  error_message?: string;
}

// Backfill configuration
const CHUNK_SIZE_DAYS = 7; // Fetch 1 week at a time (reduces API load)
const MONTHS_TO_BACKFILL = 6;
const DELAY_BETWEEN_CHUNKS_MS = 2000; // 2 seconds delay to avoid rate limiting

/**
 * Calculate start date (6 months ago from today)
 */
const getStartDate = (): Date => {
  const today = new Date();
  today.setMonth(today.getMonth() - MONTHS_TO_BACKFILL);
  return today;
};

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Save raw data to staging table
 */
const saveToStaging = (data: any[]): number => {
  const db = getSQLiteDb();
  let insertedCount = 0;
  let updatedCount = 0;

  const insertStmt = db.prepare(`
    INSERT INTO energy_data_staging (
      date, hour, total,
      natural_gas, damned_hydro, lignite, river, import_coal,
      wind, sun, fuel_oil, geothermal, asphaltite_coal,
      black_coal, biomass, naphta, lng, import_export, waste_heat
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date, hour) DO UPDATE SET
      total = excluded.total,
      natural_gas = excluded.natural_gas,
      damned_hydro = excluded.damned_hydro,
      lignite = excluded.lignite,
      river = excluded.river,
      import_coal = excluded.import_coal,
      wind = excluded.wind,
      sun = excluded.sun,
      fuel_oil = excluded.fuel_oil,
      geothermal = excluded.geothermal,
      asphaltite_coal = excluded.asphaltite_coal,
      black_coal = excluded.black_coal,
      biomass = excluded.biomass,
      naphta = excluded.naphta,
      lng = excluded.lng,
      import_export = excluded.import_export,
      waste_heat = excluded.waste_heat
  `);

  for (const item of data) {
    try {
      const result = insertStmt.run(
        item.date,
        item.hour,
        item.total || 0,
        item.naturalGas || 0,
        item.dammedHydro || 0,
        item.lignite || 0,
        item.river || 0,
        item.importCoal || 0,
        item.wind || 0,
        item.sun || 0,
        item.fuelOil || 0,
        item.geothermal || 0,
        item.asphaltiteCoal || 0,
        item.blackCoal || 0,
        item.biomass || 0,
        item.naphta || 0,
        item.lng || 0,
        item.importExport || 0,
        item.wasteHeat || 0
      );

      if (result.changes > 0) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    } catch (error: any) {
      console.error(`Error saving record ${item.date} ${item.hour}:`, error.message);
    }
  }

  console.log(`  ✅ Saved: ${insertedCount} inserted, ${updatedCount} updated`);
  return insertedCount + updatedCount;
};

/**
 * Track backfill progress in database
 */
const updateProgress = (progress: BackfillProgress): void => {
  const db = getSQLiteDb();

  if (!progress.id) {
    // Create new progress entry
    const stmt = db.prepare(`
      INSERT INTO backfill_progress (start_date, end_date, status, records_fetched)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      progress.start_date,
      progress.end_date,
      progress.status,
      progress.records_fetched
    );
    progress.id = result.lastInsertRowid as number;
  } else {
    // Update existing progress
    const stmt = db.prepare(`
      UPDATE backfill_progress
      SET status = ?, records_fetched = ?, last_processed_date = ?,
          error_message = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      progress.status,
      progress.records_fetched,
      progress.last_processed_date,
      progress.error_message,
      progress.id
    );
  }
};

/**
 * Sleep utility for delays between chunks
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Main backfill execution
 */
const runBackfill = async (): Promise<void> => {
  console.log('🚀 Starting 6-month historical data backfill...\n');

  // Initialize database
  initializeSQLiteDatabase();
  runSQLiteMigrations();

  const startDate = getStartDate();
  const endDate = new Date(); // Today

  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  console.log(`📅 Date Range: ${startDateStr} to ${endDateStr}`);
  console.log(`📦 Chunk Size: ${CHUNK_SIZE_DAYS} days`);
  console.log(`⏱️  Delay Between Chunks: ${DELAY_BETWEEN_CHUNKS_MS}ms\n`);

  // Initialize progress tracking
  const progress: BackfillProgress = {
    start_date: startDateStr,
    end_date: endDateStr,
    status: 'in_progress',
    records_fetched: 0
  };
  updateProgress(progress);

  // Calculate total chunks
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalChunks = Math.ceil(totalDays / CHUNK_SIZE_DAYS);

  console.log(`📊 Total Days: ${totalDays}`);
  console.log(`📦 Total Chunks: ${totalChunks}\n`);

  let currentDate = new Date(startDate);
  let chunkNumber = 0;
  let totalRecordsFetched = 0;

  // Fetch data in chunks
  while (currentDate < endDate) {
    chunkNumber++;
    const chunkStartDate = new Date(currentDate);
    const chunkEndDate = new Date(currentDate);
    chunkEndDate.setDate(chunkEndDate.getDate() + CHUNK_SIZE_DAYS - 1);

    // Don't exceed today
    if (chunkEndDate > endDate) {
      chunkEndDate.setTime(endDate.getTime());
    }

    const chunkStartStr = formatDate(chunkStartDate);
    const chunkEndStr = formatDate(chunkEndDate);

    console.log(`\n📦 Chunk ${chunkNumber}/${totalChunks}: ${chunkStartStr} to ${chunkEndStr}`);

    try {
      // Fetch data from EPİAŞ
      console.log('  ⏳ Fetching from EPİAŞ API...');
      const data = await getHistoricalGeneration(chunkStartStr, chunkEndStr);

      if (!data || data.length === 0) {
        console.log('  ⚠️  No data received from API');
      } else {
        console.log(`  📥 Received ${data.length} records`);

        // Save to staging
        const savedCount = saveToStaging(data);
        totalRecordsFetched += savedCount;

        // Update progress
        progress.records_fetched = totalRecordsFetched;
        progress.last_processed_date = chunkEndStr;
        updateProgress(progress);

        console.log(`  📊 Total Progress: ${totalRecordsFetched} records`);
      }

      // Delay before next chunk (avoid rate limiting)
      if (chunkNumber < totalChunks) {
        console.log(`  ⏸️  Waiting ${DELAY_BETWEEN_CHUNKS_MS}ms before next chunk...`);
        await sleep(DELAY_BETWEEN_CHUNKS_MS);
      }

    } catch (error: any) {
      console.error(`  ❌ Error fetching chunk: ${error.message}`);

      // Continue with next chunk instead of failing entirely
      progress.error_message = `Failed at chunk ${chunkNumber}: ${error.message}`;
      updateProgress(progress);
    }

    // Move to next chunk
    currentDate.setDate(currentDate.getDate() + CHUNK_SIZE_DAYS);
  }

  // Mark as completed
  progress.status = 'completed';
  updateProgress(progress);

  console.log('\n\n✅ Backfill completed!');
  console.log(`📊 Total records fetched: ${totalRecordsFetched}`);
  console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

  // Calculate completeness
  const expectedHours = totalDays * 24;
  const completeness = ((totalRecordsFetched / expectedHours) * 100).toFixed(2);
  console.log(`📈 Completeness: ${completeness}% (${totalRecordsFetched}/${expectedHours} hours)`);

  if (parseFloat(completeness) < 90) {
    console.log('⚠️  Warning: Completeness is below 90%');
  }

  console.log('\n🎯 Next Steps:');
  console.log('  1. Run validation: npm run validate-data');
  console.log('  2. Check staging table: SELECT COUNT(*) FROM energy_data_staging;');
  console.log('  3. Review backfill_progress table for details\n');
};

// Execute backfill
runBackfill()
  .then(() => {
    console.log('✅ Backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill script failed:', error);
    process.exit(1);
  });
