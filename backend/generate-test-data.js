// Test verisi üretici - Gerçekçi enerji verileri
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'energy.db');
const db = new Database(dbPath);

// Sezonsal ve günlük paternleri taklit eden gerçekçi veri üretici
function generateEnergyData(date, hour) {
  const hourNum = parseInt(hour.split(':')[0]);
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

  // Temel yük (base load) - gün içi değişimi
  let baseMultiplier = 1.0;
  if (hourNum >= 6 && hourNum <= 22) {
    // Gündüz saatleri - daha yüksek tüketim
    baseMultiplier = 1.2 + 0.3 * Math.sin((hourNum - 6) * Math.PI / 16);
  } else {
    // Gece saatleri - düşük tüketim
    baseMultiplier = 0.7;
  }

  // Sezonsal değişim (kış daha yüksek)
  const seasonalMultiplier = 1.0 + 0.3 * Math.cos(dayOfYear * 2 * Math.PI / 365);

  // Hafta sonu etkisi
  const dayOfWeek = date.getDay();
  const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.85 : 1.0;

  const totalMultiplier = baseMultiplier * seasonalMultiplier * weekendMultiplier;

  // Rastgele varyasyon (%5)
  const randomFactor = 0.95 + Math.random() * 0.1;

  // Kaynak bazlı gerçekçi dağılım
  const sources = {
    // Doğal gaz - temel yük + peak hours
    naturalGas: Math.round((8000 + 4000 * totalMultiplier + Math.random() * 1000) * randomFactor),

    // Kömür türleri - sabit yük
    lignite: Math.round((4000 + 1000 * seasonalMultiplier + Math.random() * 500) * randomFactor),
    importCoal: Math.round((6000 + 2000 * totalMultiplier + Math.random() * 800) * randomFactor),
    blackCoal: Math.round((400 + Math.random() * 200) * randomFactor),
    asphaltiteCoal: Math.round((300 + Math.random() * 100) * randomFactor),

    // Yenilenebilir - doğal paternler
    wind: Math.round((3000 + 4000 * Math.random()) * randomFactor), // Değişken
    sun: hourNum >= 6 && hourNum <= 18 ?
         Math.round((2000 * Math.sin((hourNum - 6) * Math.PI / 12) + Math.random() * 500) * randomFactor) :
         Math.round(Math.random() * 50), // Gece minimal

    // Hidro - mevsimsel
    dammedHydro: Math.round((1500 + 1000 * seasonalMultiplier + Math.random() * 500) * randomFactor),
    river: Math.round((800 + 600 * seasonalMultiplier + Math.random() * 200) * randomFactor),

    // Diğer sabit kaynaklar
    geothermal: Math.round((1200 + Math.random() * 200) * randomFactor),
    biomass: Math.round((800 + Math.random() * 100) * randomFactor),
    fueloil: Math.round((50 + Math.random() * 100) * randomFactor),
    wasteheat: Math.round((80 + Math.random() * 20) * randomFactor),
    lng: Math.round(Math.random() * 100),
    naphta: Math.round(Math.random() * 50)
  };

  const total = Object.values(sources).reduce((sum, val) => sum + val, 0);

  return {
    date: date.toISOString().split('T')[0],
    hour: hour,
    total,
    ...sources
  };
}

// Son 30 günlük veri oluştur (720 saat)
console.log('📊 Generating 30 days of realistic energy data...');

// Mevcut verileri temizle
db.exec('DELETE FROM energy_data');

const stmt = db.prepare(`
  INSERT INTO energy_data (
    date, hour, total, natural_gas, damned_hydro, lignite, river, import_coal,
    wind, sun, fuel_oil, geothermal, asphaltite_coal, black_coal, biomass,
    naphta, lng, import_export, waste_heat
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let insertedCount = 0;
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30); // 30 gün öncesinden başla

for (let day = 0; day < 30; day++) {
  const currentDate = new Date(startDate);
  currentDate.setDate(startDate.getDate() + day);

  for (let hour = 0; hour < 24; hour++) {
    const hourStr = hour.toString().padStart(2, '0') + ':00';
    const data = generateEnergyData(currentDate, hourStr);

    try {
      stmt.run(
        data.date, data.hour, data.total, data.naturalGas, data.dammedHydro,
        data.lignite, data.river, data.importCoal, data.wind, data.sun,
        data.fueloil, data.geothermal, data.asphaltiteCoal, data.blackCoal,
        data.biomass, data.naphta, data.lng, 0, data.wasteheat
      );
      insertedCount++;
    } catch (error) {
      console.error('Error inserting data:', error);
    }
  }
}

console.log(`✅ Generated ${insertedCount} hours of energy data`);

// İstatistikleri göster
const stats = db.prepare(`
  SELECT
    COUNT(*) as total_records,
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    AVG(total) as avg_generation,
    MIN(total) as min_generation,
    MAX(total) as max_generation
  FROM energy_data
`).get();

console.log('📊 Database Statistics:');
console.log(`   Total Records: ${stats.total_records}`);
console.log(`   Date Range: ${stats.earliest_date} to ${stats.latest_date}`);
console.log(`   Avg Generation: ${Math.round(stats.avg_generation)} MWh`);
console.log(`   Min Generation: ${Math.round(stats.min_generation)} MWh`);
console.log(`   Max Generation: ${Math.round(stats.max_generation)} MWh`);

db.close();
console.log('🎉 Test data generation completed!');