/**
 * Complete database status report
 */

import { getSQLiteDb, initializeSQLiteDatabase } from '../config/sqlite-database';
import dotenv from 'dotenv';

dotenv.config();

const checkStatus = () => {
  initializeSQLiteDatabase();
  const db = getSQLiteDb();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TURKEY ENERGY ANALYTICS - DATABASE STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Count records
  const energyCount = db.prepare('SELECT COUNT(*) as count FROM energy_data').get() as any;
  const ptfCount = db.prepare('SELECT COUNT(*) as count FROM ptf_data').get() as any;
  const consumptionCount = db.prepare('SELECT COUNT(*) as count FROM consumption_data').get() as any;
  const weatherCount = db.prepare('SELECT COUNT(*) as count FROM weather_data').get() as any;

  const expectedRecords = 365 * 24; // 1 year = 8760 hours

  console.log('📈 DATA COMPLETENESS (Target: 8760 hours for 1 year)\n');

  // Energy Production
  const energyPercent = ((energyCount.count / expectedRecords) * 100).toFixed(1);
  const energyStatus = energyCount.count >= 8000 ? '✅' : energyCount.count > 500 ? '⚠️' : '❌';
  console.log(`${energyStatus} Energy Production:   ${energyCount.count.toString().padStart(5)} / 8760 records (${energyPercent}%)`);

  // PTF (Prices)
  const ptfPercent = ((ptfCount.count / expectedRecords) * 100).toFixed(1);
  const ptfStatus = ptfCount.count >= 8000 ? '✅' : ptfCount.count > 500 ? '⚠️' : '❌';
  console.log(`${ptfStatus} PTF (Prices):         ${ptfCount.count.toString().padStart(5)} / 8760 records (${ptfPercent}%)`);

  // Consumption
  const consumptionPercent = ((consumptionCount.count / expectedRecords) * 100).toFixed(1);
  const consumptionStatus = consumptionCount.count >= 8000 ? '✅' : consumptionCount.count > 500 ? '⚠️' : '❌';
  console.log(`${consumptionStatus} Consumption:          ${consumptionCount.count.toString().padStart(5)} / 8760 records (${consumptionPercent}%)`);

  // Weather
  const weatherPercent = ((weatherCount.count / expectedRecords) * 100).toFixed(1);
  const weatherStatus = weatherCount.count >= 8000 ? '✅' : weatherCount.count > 500 ? '⚠️' : '❌';
  console.log(`${weatherStatus} Weather Data:         ${weatherCount.count.toString().padStart(5)} / 8760 records (${weatherPercent}%)\n`);

  // Overall status
  const allComplete = energyCount.count >= 8000 && ptfCount.count >= 8000 &&
                     consumptionCount.count >= 8000 && weatherCount.count >= 8000;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (allComplete) {
    console.log('🎉 STATUS: READY FOR DEPLOYMENT');
    console.log('   All datasets are complete (>90% coverage)\n');
  } else {
    console.log('⚠️  STATUS: INCOMPLETE DATA');
    console.log('   Some datasets need backfilling:\n');

    if (energyCount.count < 8000) {
      console.log('   📌 Run: npm run backfill:production');
    }
    if (ptfCount.count < 8000) {
      console.log('   📌 Run: npm run backfill:ptf');
    }
    if (weatherCount.count < 8000) {
      console.log('   📌 Run: npm run backfill:weather');
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Date ranges
  console.log('📅 DATA DATE RANGES\n');

  const energyRange = db.prepare('SELECT MIN(date) as start, MAX(date) as end FROM energy_data').get() as any;
  console.log(`🔋 Energy:      ${energyRange.start || 'N/A'} → ${energyRange.end || 'N/A'}`);

  const ptfRange = db.prepare('SELECT MIN(date) as start, MAX(date) as end FROM ptf_data').get() as any;
  console.log(`💰 PTF:         ${ptfRange.start || 'N/A'} → ${ptfRange.end || 'N/A'}`);

  const consumptionRange = db.prepare('SELECT MIN(date) as start, MAX(date) as end FROM consumption_data').get() as any;
  console.log(`⚡ Consumption: ${consumptionRange.start || 'N/A'} → ${consumptionRange.end || 'N/A'}`);

  const weatherRange = db.prepare('SELECT MIN(date) as start, MAX(date) as end FROM weather_data').get() as any;
  console.log(`🌤️  Weather:     ${weatherRange.start || 'N/A'} → ${weatherRange.end || 'N/A'}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Prophet readiness
  console.log('🤖 PROPHET MODEL READINESS\n');

  const minRecordsForProphet = 365 * 24; // 1 year minimum
  const hasEnoughData = energyCount.count >= minRecordsForProphet &&
                        ptfCount.count >= minRecordsForProphet &&
                        consumptionCount.count >= minRecordsForProphet &&
                        weatherCount.count >= minRecordsForProphet;

  if (hasEnoughData) {
    console.log('✅ Prophet Model: READY');
    console.log('   • 1 year of historical data available');
    console.log('   • All features present (energy, prices, weather)');
    console.log('   • Can train accurate forecasting models\n');
  } else {
    console.log('❌ Prophet Model: NOT READY');
    console.log('   • Insufficient historical data');
    console.log('   • Need at least 1 year (8760 hours) per dataset');
    console.log('   • Complete backfill before training models\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

checkStatus();
