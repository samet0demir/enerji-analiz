/**
 * Backfill Script - 1 Year PTF and Consumption Data
 *
 * Purpose: Fetch 1 year of PTF and Consumption data from EPİAŞ API
 * Strategy: Chunk-based fetching (1 month at a time)
 *
 * Usage: ts-node src/scripts/backfill-ptf-consumption.ts
 */

import { getPtfData, getConsumptionData } from '../services/epias.service';
import { savePtfData, saveConsumptionData } from '../services/database.service';
import { getSQLiteDb, initializeSQLiteDatabase } from '../config/sqlite-database';
import { runSQLiteMigrations } from '../config/sqlite-migrations';
import dotenv from 'dotenv';

dotenv.config();

const CHUNK_SIZE_DAYS = 30; // Fetch 1 month at a time
const DELAY_BETWEEN_CHUNKS_MS = 3000; // 3 seconds delay

/**
 * Format date to YYYY-MM-DDTHH:mm:ss+03:00 (EPİAŞ format)
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00+03:00`;
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
  console.log('🚀 Starting 1-year PTF and Consumption backfill...\n');

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
  let totalPtfRecords = 0;
  let totalConsumptionRecords = 0;

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

    // ========== FETCH PTF DATA ==========
    try {
      console.log('  💰 Fetching PTF data from EPİAŞ API...');
      const ptfData = await getPtfData(chunkStartStr, chunkEndStr);

      if (!ptfData || ptfData.length === 0) {
        console.log('  ⚠️  No PTF data received');
      } else {
        console.log(`  📥 Received ${ptfData.length} PTF records`);
        const ptfResult = savePtfData(ptfData);
        totalPtfRecords += ptfResult.inserted + ptfResult.updated;
        console.log(`  ✅ PTF saved: ${ptfResult.inserted} new, ${ptfResult.updated} updated`);
      }
    } catch (error: any) {
      console.error(`  ❌ PTF fetch failed: ${error.message}`);
    }

    // Delay between PTF and Consumption
    await sleep(1000);

    // ========== FETCH CONSUMPTION DATA ==========
    try {
      console.log('  ⚡ Fetching Consumption data from EPİAŞ API...');
      const consumptionData = await getConsumptionData(chunkStartStr, chunkEndStr);

      if (!consumptionData || consumptionData.length === 0) {
        console.log('  ⚠️  No Consumption data received');
      } else {
        console.log(`  📥 Received ${consumptionData.length} Consumption records`);
        const consumptionResult = saveConsumptionData(consumptionData);
        totalConsumptionRecords += consumptionResult.inserted + consumptionResult.updated;
        console.log(`  ✅ Consumption saved: ${consumptionResult.inserted} new, ${consumptionResult.updated} updated`);
      }
    } catch (error: any) {
      console.error(`  ❌ Consumption fetch failed: ${error.message}`);
    }

    console.log(`  📊 Chunk Progress: PTF=${totalPtfRecords}, Consumption=${totalConsumptionRecords}`);

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
  console.log(`💰 Total PTF records: ${totalPtfRecords}`);
  console.log(`⚡ Total Consumption records: ${totalConsumptionRecords}`);
  console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

  // Calculate expected records (365 days * 24 hours)
  const expectedRecords = totalDays * 24;
  const ptfCompleteness = ((totalPtfRecords / expectedRecords) * 100).toFixed(2);
  const consumptionCompleteness = ((totalConsumptionRecords / expectedRecords) * 100).toFixed(2);

  console.log(`\n📈 PTF Completeness: ${ptfCompleteness}% (${totalPtfRecords}/${expectedRecords} hours)`);
  console.log(`📈 Consumption Completeness: ${consumptionCompleteness}% (${totalConsumptionRecords}/${expectedRecords} hours)`);

  console.log('\n🎯 Next Steps:');
  console.log('  1. Check database: SELECT COUNT(*) FROM ptf_data;');
  console.log('  2. Check database: SELECT COUNT(*) FROM consumption_data;');
  console.log('  3. Test API: npm run test:ptf\n');
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
