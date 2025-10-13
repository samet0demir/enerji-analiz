/**
 * Backfill Script - 1 Year Weather Data from Open-Meteo
 *
 * Purpose: Fetch 1 year of historical weather data for Istanbul
 * Source: Open-Meteo API (free, no API key required)
 * Strategy: Chunk-based fetching (30 days at a time to avoid timeouts)
 *
 * Usage: npm run backfill:weather
 */

import { getHistoricalWeather } from '../services/weather.service';
import { saveWeatherData } from '../services/database.service';
import { initializeSQLiteDatabase } from '../config/sqlite-database';
import { runSQLiteMigrations } from '../config/sqlite-migrations';
import dotenv from 'dotenv';

dotenv.config();

const CHUNK_SIZE_DAYS = 30; // Fetch 1 month at a time
const DELAY_BETWEEN_CHUNKS_MS = 2000; // 2 seconds delay

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
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Main backfill execution
 */
const runBackfill = async (): Promise<void> => {
  console.log('🌤️  Starting 1-year Weather Data backfill from Open-Meteo...\n');

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
  console.log(`⏱️  Delay Between Chunks: ${DELAY_BETWEEN_CHUNKS_MS}ms`);
  console.log(`🌍 Location: Istanbul (41.01°N, 28.94°E)\n`);

  // Calculate total chunks
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalChunks = Math.ceil(totalDays / CHUNK_SIZE_DAYS);

  console.log(`📊 Total Days: ${totalDays}`);
  console.log(`📦 Total Chunks: ${totalChunks}\n`);

  let currentDate = new Date(startDate);
  let chunkNumber = 0;
  let totalRecords = 0;
  let totalErrors = 0;

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
      console.log('  🌤️  Fetching weather data from Open-Meteo API...');
      const weatherData = await getHistoricalWeather(chunkStartStr, chunkEndStr, 'Istanbul');

      if (!weatherData || weatherData.length === 0) {
        console.log('  ⚠️  No weather data received');
        totalErrors++;
      } else {
        console.log(`  📥 Received ${weatherData.length} weather records`);
        const result = saveWeatherData(weatherData);
        totalRecords += result.inserted + result.updated;
        console.log(`  ✅ Weather saved: ${result.inserted} new, ${result.updated} updated`);
      }
    } catch (error: any) {
      console.error(`  ❌ Weather fetch failed: ${error.message}`);
      totalErrors++;
    }

    console.log(`  📊 Total Progress: ${totalRecords} records, ${totalErrors} errors`);

    // Delay before next chunk (be nice to Open-Meteo's free API)
    if (chunkNumber < totalChunks) {
      console.log(`  ⏸️  Waiting ${DELAY_BETWEEN_CHUNKS_MS}ms before next chunk...`);
      await sleep(DELAY_BETWEEN_CHUNKS_MS);
    }

    // Move to next chunk
    currentDate.setDate(currentDate.getDate() + CHUNK_SIZE_DAYS);
  }

  // Summary
  console.log('\n\n✅ Weather backfill completed!');
  console.log(`🌤️  Total weather records: ${totalRecords}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

  // Calculate expected records (365 days * 24 hours)
  const expectedRecords = totalDays * 24;
  const completeness = ((totalRecords / expectedRecords) * 100).toFixed(2);

  console.log(`\n📈 Weather Completeness: ${completeness}% (${totalRecords}/${expectedRecords} hours)`);

  console.log('\n📊 Weather Data Collected:');
  console.log('  • Temperature (°C)');
  console.log('  • Wind speed (km/h)');
  console.log('  • Wind direction (degrees)');
  console.log('  • Direct solar radiation (W/m²)');
  console.log('  • Precipitation (mm)');
  console.log('  • Cloud cover (%)');
  console.log('  • Relative humidity (%)');

  console.log('\n🎯 Next Steps:');
  console.log('  1. Check database: SELECT COUNT(*) FROM weather_data;');
  console.log('  2. Verify latest data: SELECT * FROM weather_data ORDER BY date DESC LIMIT 5;');
  console.log('  3. Use weather data for Prophet model features\n');
};

// Execute backfill
runBackfill()
  .then(() => {
    console.log('✅ Weather backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Weather backfill script failed:', error);
    process.exit(1);
  });
