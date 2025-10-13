/**
 * Quick script to check Weather data in database
 */

import { getSQLiteDb, initializeSQLiteDatabase } from '../config/sqlite-database';
import dotenv from 'dotenv';

dotenv.config();

const checkData = () => {
  initializeSQLiteDatabase();
  const db = getSQLiteDb();

  console.log('📊 Database Stats:\n');

  const weatherCount = db.prepare('SELECT COUNT(*) as count FROM weather_data').get() as any;
  console.log('🌤️  Weather Records:', weatherCount.count);

  const ptfCount = db.prepare('SELECT COUNT(*) as count FROM ptf_data').get() as any;
  console.log('💰 PTF Records:', ptfCount.count);

  const consumptionCount = db.prepare('SELECT COUNT(*) as count FROM consumption_data').get() as any;
  console.log('⚡ Consumption Records:', consumptionCount.count);

  const energyCount = db.prepare('SELECT COUNT(*) as count FROM energy_data').get() as any;
  console.log('🔋 Energy Production Records:', energyCount.count);

  console.log('\n🌤️  Latest Weather Data (last 5 records):');
  const sampleWeather = db.prepare('SELECT * FROM weather_data ORDER BY date DESC, hour DESC LIMIT 5').all();
  sampleWeather.forEach((row: any) => {
    console.log(`  ${row.date} ${row.hour} - ${row.temperature.toFixed(1)}°C, Wind: ${row.windspeed.toFixed(1)} km/h, Solar: ${row.direct_radiation.toFixed(0)} W/m²`);
  });

  console.log('\n📈 Weather Statistics:');
  const weatherStats = db.prepare(`
    SELECT
      AVG(temperature) as avg_temp,
      MIN(temperature) as min_temp,
      MAX(temperature) as max_temp,
      AVG(windspeed) as avg_wind,
      MAX(windspeed) as max_wind,
      AVG(direct_radiation) as avg_solar,
      MAX(direct_radiation) as max_solar
    FROM weather_data
  `).get() as any;

  console.log(`  Average Temperature: ${weatherStats.avg_temp.toFixed(1)}°C`);
  console.log(`  Temperature Range: ${weatherStats.min_temp.toFixed(1)}°C to ${weatherStats.max_temp.toFixed(1)}°C`);
  console.log(`  Average Wind Speed: ${weatherStats.avg_wind.toFixed(1)} km/h`);
  console.log(`  Max Wind Speed: ${weatherStats.max_wind.toFixed(1)} km/h`);
  console.log(`  Average Solar Radiation: ${weatherStats.avg_solar.toFixed(0)} W/m²`);
  console.log(`  Max Solar Radiation: ${weatherStats.max_solar.toFixed(0)} W/m²`);

  console.log('\n✅ Database check completed!\n');
};

checkData();
