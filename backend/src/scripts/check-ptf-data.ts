/**
 * Quick script to check PTF and Consumption data in database
 */

import { getSQLiteDb, initializeSQLiteDatabase } from '../config/sqlite-database';
import dotenv from 'dotenv';

dotenv.config();

const checkData = () => {
  initializeSQLiteDatabase();
  const db = getSQLiteDb();

  console.log('📊 Database Stats:\n');

  const ptfCount = db.prepare('SELECT COUNT(*) as count FROM ptf_data').get() as any;
  console.log('💰 PTF Records:', ptfCount.count);

  const consumptionCount = db.prepare('SELECT COUNT(*) as count FROM consumption_data').get() as any;
  console.log('⚡ Consumption Records:', consumptionCount.count);

  const energyCount = db.prepare('SELECT COUNT(*) as count FROM energy_data').get() as any;
  console.log('🔋 Energy Production Records:', energyCount.count);

  console.log('\n📅 Latest PTF Data (last 5 records):');
  const samplePtf = db.prepare('SELECT * FROM ptf_data ORDER BY date DESC, hour DESC LIMIT 5').all();
  samplePtf.forEach((row: any) => {
    console.log(`  ${row.date} ${row.hour} - ${row.price_try.toFixed(2)} TRY`);
  });

  console.log('\n⚡ Latest Consumption Data (last 5 records):');
  const sampleConsumption = db.prepare('SELECT * FROM consumption_data ORDER BY date DESC, hour DESC LIMIT 5').all();
  sampleConsumption.forEach((row: any) => {
    console.log(`  ${row.date} ${row.hour} - ${row.consumption.toFixed(2)} MWh`);
  });

  console.log('\n✅ Database check completed!\n');
};

checkData();
