// Quick test of the enhanced getEnergyStats function
const { getSQLiteDb } = require('./dist/config/sqlite-database');

console.log('🔍 Testing enhanced getEnergyStats function...');

const getEnergyStats = () => {
  console.log('🔍 DEBUG: DIRECT Enhanced getEnergyStats function called!');
  const db = getSQLiteDb();

  try {
    // Total records
    const totalRecords = db.prepare('SELECT COUNT(*) as count FROM energy_data').get();
    console.log('📊 DEBUG: Total records:', totalRecords.count);

    // Last 24 hours average
    const last24HoursAvg = db.prepare(`
      SELECT AVG(total) as avg_total
      FROM (
        SELECT total FROM energy_data
        ORDER BY date DESC, hour DESC
        LIMIT 24
      )
    `).get();
    console.log('📊 DEBUG: Last 24 hours avg:', last24HoursAvg);

    // Max and min generation
    const maxMinGeneration = db.prepare(`
      SELECT
        MAX(total) as max_generation,
        MIN(total) as min_generation
      FROM energy_data
    `).get();
    console.log('📊 DEBUG: Max/Min generation:', maxMinGeneration);

    // Renewable percentage (latest data)
    const renewableStats = db.prepare(`
      SELECT
        total,
        (wind + sun + damned_hydro + river + geothermal) as renewable_total
      FROM energy_data
      ORDER BY date DESC, hour DESC
      LIMIT 1
    `).get();

    const renewablePercentage = renewableStats && renewableStats.total > 0
      ? (renewableStats.renewable_total / renewableStats.total) * 100
      : 0;
    console.log('📊 DEBUG: Renewable percentage:', renewablePercentage);

    const result = {
      totalRecords: totalRecords.count,
      last24HoursAvg: last24HoursAvg?.avg_total || 0,
      maxGeneration: maxMinGeneration.max_generation || 0,
      minGeneration: maxMinGeneration.min_generation || 0,
      renewablePercentage,
    };

    console.log('📊 DEBUG: Enhanced result:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('❌ DEBUG: Error in getEnergyStats:', error);
    throw error;
  }
};

// Test the function
try {
  const stats = getEnergyStats();
  console.log('✅ Enhanced stats working:', stats);
} catch (error) {
  console.error('❌ Test failed:', error);
}