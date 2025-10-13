/**
 * Backfill Script - 1 Year Production Data
 *
 * Purpose: Fetch 1 year of production data from EPİAŞ API
 * Strategy: Chunk-based fetching (30 days at a time)
 *
 * Usage: npm run backfill:production
 */

import { getHistoricalGeneration } from '../services/epias.service';
import { saveEnergyData } from '../services/database.service';
import { initializeSQLiteDatabase } from '../config/sqlite-database';
import { runSQLiteMigrations } from '../config/sqlite-migrations';
import dotenv from 'dotenv';

dotenv.config();

const CHUNK_SIZE_DAYS = 30; // Fetch 1 month at a time
const DELAY_BETWEEN_CHUNKS_MS = 3000; // 3 seconds delay

/**
 * Format date to YYYY-MM-DD (for production API)
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Main backfill execution
 */
const runBackfill = async (): Promise<void> => {
  console.log('🚀 Starting 1-year Production Data backfill...\n');

  // Initialize database
  initializeSQLiteDatabase();
  runSQLiteMigrations();

  // Date range: 1 year
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 1);

  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  console.log(`📅 Date Range: ${startDateStr} to ${endDateStr}`);
  console.log(`📦 Chunk Size: ${CHUNK_SIZE_DAYS} days`);
  console.log(`⏱️  Delay Between Chunks: ${DELAY_BETWEEN_CHUNKS_MS}ms\n`);

  // Calculate total chunks
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalChunks = Math.ceil(totalDays / CHUNK_SIZE_DAYS);

  console.log(`📊 Total Days: ${totalDays}`);
  console.log(`📦 Total Chunks: ${totalChunks}\n`);

  let currentDate = new Date(startDate);
  let chunkNumber = 0;
  let totalRecords = 0;

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
      console.log('  🔋 Fetching Production data from EPİAŞ API...');
      const productionData = await getHistoricalGeneration(chunkStartStr, chunkEndStr);

      if (!productionData || productionData.length === 0) {
        console.log('  ⚠️  No Production data received');
      } else {
        console.log(`  📥 Received ${productionData.length} Production records`);
        const result = saveEnergyData(productionData);
        totalRecords += result.inserted + result.updated;
        console.log(`  ✅ Production saved: ${result.inserted} new, ${result.updated} updated`);
      }
    } catch (error: any) {
      console.error(`  ❌ Production fetch failed: ${error.message}`);
    }

    console.log(`  📊 Total Progress: ${totalRecords} records`);

    // Delay before next chunk
    if (chunkNumber < totalChunks) {
      console.log(`  ⏸️  Waiting ${DELAY_BETWEEN_CHUNKS_MS}ms before next chunk...`);
      await sleep(DELAY_BETWEEN_CHUNKS_MS);
    }

    // Move to next chunk
    currentDate.setDate(currentDate.getDate() + CHUNK_SIZE_DAYS);
  }

  // Summary
  console.log('\n\n✅ Backfill completed!');
  console.log(`🔋 Total Production records: ${totalRecords}`);
  console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

  // Calculate expected records (365 days * 24 hours)
  const expectedRecords = totalDays * 24;
  const completeness = ((totalRecords / expectedRecords) * 100).toFixed(2);

  console.log(`\n📈 Production Completeness: ${completeness}% (${totalRecords}/${expectedRecords} hours)`);

  console.log('\n🎯 Next Steps:');
  console.log('  1. Check database: SELECT COUNT(*) FROM energy_data;');
  console.log('  2. Verify latest data: SELECT * FROM energy_data ORDER BY date DESC LIMIT 5;\n');
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
