import { getSQLiteDb } from '../config/sqlite-database';

interface EnergyData {
  date: string;
  hour: string;
  total: number;
  naturalGas: number;
  dammedHydro: number;
  lignite: number;
  river: number;
  importCoal: number;
  wind: number;
  sun: number;
  fuelOil: number;
  geothermal: number;
  asphaltiteCoal: number;
  blackCoal: number;
  biomass: number;
  naphta: number;
  lng: number;
  importExport: number;
  wasteHeat: number;
}

export const saveEnergyData = (data: EnergyData[]): { inserted: number; updated: number } => {
  const db = getSQLiteDb();
  let inserted = 0;
  let updated = 0;

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO energy_data (
      date, hour, total, natural_gas, damned_hydro, lignite, river, import_coal,
      wind, sun, fuel_oil, geothermal, asphaltite_coal, black_coal, biomass,
      naphta, lng, import_export, waste_heat, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const checkStmt = db.prepare('SELECT id FROM energy_data WHERE date = ? AND hour = ?');

  const transaction = db.transaction(() => {
    for (const record of data) {
      const existing = checkStmt.get(record.date, record.hour);

      insertStmt.run(
        record.date,
        record.hour,
        record.total,
        record.naturalGas,
        record.dammedHydro,
        record.lignite,
        record.river,
        record.importCoal,
        record.wind,
        record.sun,
        record.fuelOil,
        record.geothermal,
        record.asphaltiteCoal,
        record.blackCoal,
        record.biomass,
        record.naphta,
        record.lng,
        record.importExport,
        record.wasteHeat
      );

      if (existing) {
        updated++;
      } else {
        inserted++;
      }
    }
  });

  transaction();
  return { inserted, updated };
};

export const getRecentEnergyData = (hours: number = 24): EnergyData[] => {
  const db = getSQLiteDb();

  const stmt = db.prepare(`
    SELECT * FROM energy_data
    ORDER BY date DESC, hour DESC
    LIMIT ?
  `);

  const rows = stmt.all(hours) as any[];

  return rows.map(row => ({
    date: row.date,
    hour: row.hour,
    total: row.total,
    naturalGas: row.natural_gas,
    dammedHydro: row.damned_hydro,
    lignite: row.lignite,
    river: row.river,
    importCoal: row.import_coal,
    wind: row.wind,
    sun: row.sun,
    fuelOil: row.fuel_oil,
    geothermal: row.geothermal,
    asphaltiteCoal: row.asphaltite_coal,
    blackCoal: row.black_coal,
    biomass: row.biomass,
    naphta: row.naphta,
    lng: row.lng,
    importExport: row.import_export,
    wasteHeat: row.waste_heat
  }));
};

export const getEnergyDataByDateRange = (startDate: string, endDate: string): EnergyData[] => {
  const db = getSQLiteDb();

  const stmt = db.prepare(`
    SELECT * FROM energy_data
    WHERE date BETWEEN ? AND ?
    ORDER BY date ASC, hour ASC
  `);

  const rows = stmt.all(startDate, endDate) as any[];

  return rows.map(row => ({
    date: row.date,
    hour: row.hour,
    total: row.total,
    naturalGas: row.natural_gas,
    dammedHydro: row.damned_hydro,
    lignite: row.lignite,
    river: row.river,
    importCoal: row.import_coal,
    wind: row.wind,
    sun: row.sun,
    fuelOil: row.fuel_oil,
    geothermal: row.geothermal,
    asphaltiteCoal: row.asphaltite_coal,
    blackCoal: row.black_coal,
    biomass: row.biomass,
    naphta: row.naphta,
    lng: row.lng,
    importExport: row.import_export,
    wasteHeat: row.waste_heat
  }));
};

// This is the FIXED version with enhanced functionality
export const getEnergyStats = (hours: number = 24) => {
  console.log('🔍 DEBUG: FINAL Enhanced getEnergyStats function called with hours:', hours);
  const db = getSQLiteDb();

  try {
    // Total records
    const totalRecords = db.prepare('SELECT COUNT(*) as count FROM energy_data').get() as { count: number };
    console.log('📊 DEBUG: Total records:', totalRecords.count);

    // Date range
    const dateRange = db.prepare(`
      SELECT
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM energy_data
    `).get() as { earliest_date: string; latest_date: string };
    console.log('📊 DEBUG: Date range:', dateRange);

    // Average for selected time range
    const timeRangeAvg = db.prepare(`
      SELECT AVG(total) as avg_total
      FROM (
        SELECT total FROM energy_data
        ORDER BY date DESC, hour DESC
        LIMIT ?
      )
    `).get(hours) as { avg_total: number };
    console.log('📊 DEBUG: Time range avg:', timeRangeAvg);

    // Max and min generation for selected time range
    const maxMinGeneration = db.prepare(`
      SELECT
        MAX(total) as max_generation,
        MIN(total) as min_generation
      FROM (
        SELECT total FROM energy_data
        ORDER BY date DESC, hour DESC
        LIMIT ?
      )
    `).get(hours) as { max_generation: number; min_generation: number };
    console.log('📊 DEBUG: Max/Min generation:', maxMinGeneration);

    // Renewable percentage (average for selected time range)
    const renewableStats = db.prepare(`
      SELECT
        AVG(total) as avg_total,
        AVG(wind + sun + damned_hydro + river + geothermal) as avg_renewable_total
      FROM (
        SELECT * FROM energy_data
        ORDER BY date DESC, hour DESC
        LIMIT ?
      )
    `).get(hours) as { avg_total: number; avg_renewable_total: number } | undefined;

    const renewablePercentage = renewableStats && renewableStats.avg_total > 0
      ? (renewableStats.avg_renewable_total / renewableStats.avg_total) * 100
      : 0;
    console.log('📊 DEBUG: Renewable percentage:', renewablePercentage);

    // Peak hours analysis (recent data)
    const peakHours = db.prepare(`
      SELECT hour, AVG(total) as avg_generation
      FROM energy_data
      GROUP BY hour
      ORDER BY avg_generation DESC
      LIMIT 3
    `).all() as Array<{ hour: string; avg_generation: number }>;

    // Source breakdown averages for selected time range
    const sourceAverages = db.prepare(`
      SELECT
        AVG(total) as avg_total,
        AVG(natural_gas) as avg_natural_gas,
        AVG(wind) as avg_wind,
        AVG(sun) as avg_sun,
        AVG(damned_hydro) as avg_hydro,
        AVG(import_coal) as avg_import_coal,
        AVG(lignite) as avg_lignite
      FROM (
        SELECT * FROM energy_data
        ORDER BY date DESC, hour DESC
        LIMIT ?
      )
    `).get(hours);

    const result = {
      totalRecords: totalRecords.count,
      dateRange,
      timeRangeAvg: timeRangeAvg?.avg_total || 0,
      maxGeneration: maxMinGeneration.max_generation || 0,
      minGeneration: maxMinGeneration.min_generation || 0,
      renewablePercentage,
      peakHours,
      sourceAverages,
      avgGeneration: sourceAverages,
      hours: hours  // Debug: hangi hours ile çağrıldığını göster
    };

    console.log('🔧 DEBUG: Final result object keys:', Object.keys(result));

    console.log('📊 DEBUG: Final result:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('❌ DEBUG: Error in getEnergyStats:', error);
    throw error;
  }
};

export const logDataCollection = (status: string, recordsInserted: number, recordsUpdated: number, errorMessage?: string, executionTimeMs?: number) => {
  const db = getSQLiteDb();

  const stmt = db.prepare(`
    INSERT INTO data_collection_logs (status, records_inserted, records_updated, error_message, execution_time_ms)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(status, recordsInserted, recordsUpdated, errorMessage || null, executionTimeMs || null);
};

// ========== PTF DATA FUNCTIONS ==========

interface PtfData {
  date: string;
  hour: string;
  price: number;
  priceUsd?: number;
  priceEur?: number;
}

export const savePtfData = (data: any[]): { inserted: number; updated: number } => {
  const db = getSQLiteDb();
  let inserted = 0;
  let updated = 0;

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO ptf_data (
      date, hour, price_try, price_usd, price_eur, updated_at
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const checkStmt = db.prepare('SELECT id FROM ptf_data WHERE date = ? AND hour = ?');

  const transaction = db.transaction(() => {
    for (const record of data) {
      const existing = checkStmt.get(record.date, record.hour);

      insertStmt.run(
        record.date,
        record.hour,
        record.price || 0,
        record.priceUsd || 0,
        record.priceEur || 0
      );

      if (existing) {
        updated++;
      } else {
        inserted++;
      }
    }
  });

  transaction();
  return { inserted, updated };
};

export const getRecentPtfData = (hours: number = 24): PtfData[] => {
  const db = getSQLiteDb();

  const stmt = db.prepare(`
    SELECT * FROM ptf_data
    ORDER BY date DESC, hour DESC
    LIMIT ?
  `);

  const rows = stmt.all(hours) as any[];

  return rows.map(row => ({
    date: row.date,
    hour: row.hour,
    price: row.price_try,
    priceUsd: row.price_usd,
    priceEur: row.price_eur
  }));
};

// ========== CONSUMPTION DATA FUNCTIONS ==========

interface ConsumptionData {
  date: string;
  hour: string;
  consumption: number;
}

export const saveConsumptionData = (data: any[]): { inserted: number; updated: number } => {
  const db = getSQLiteDb();
  let inserted = 0;
  let updated = 0;

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO consumption_data (
      date, hour, consumption, updated_at
    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const checkStmt = db.prepare('SELECT id FROM consumption_data WHERE date = ? AND hour = ?');

  const transaction = db.transaction(() => {
    for (const record of data) {
      // Parse hour from "time" field (response has "time": "00:00")
      const hour = record.time || record.hour;

      const existing = checkStmt.get(record.date, hour);

      insertStmt.run(
        record.date,
        hour,
        record.consumption || 0
      );

      if (existing) {
        updated++;
      } else {
        inserted++;
      }
    }
  });

  transaction();
  return { inserted, updated };
};

export const getRecentConsumptionData = (hours: number = 24): ConsumptionData[] => {
  const db = getSQLiteDb();

  const stmt = db.prepare(`
    SELECT * FROM consumption_data
    ORDER BY date DESC, hour DESC
    LIMIT ?
  `);

  const rows = stmt.all(hours) as any[];

  return rows.map(row => ({
    date: row.date,
    hour: row.hour,
    consumption: row.consumption
  }));
};

// ========== WEATHER DATA FUNCTIONS ==========

interface WeatherData {
  date: string;
  hour: string;
  temperature: number;
  windspeed: number;
  winddirection: number;
  direct_radiation: number;
  precipitation: number;
  cloudcover: number;
  humidity: number;
  city: string;
  latitude: number;
  longitude: number;
}

export const saveWeatherData = (data: WeatherData[]): { inserted: number; updated: number } => {
  const db = getSQLiteDb();
  let inserted = 0;
  let updated = 0;

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO weather_data (
      date, hour, temperature, windspeed, winddirection, direct_radiation,
      precipitation, cloudcover, humidity, city, latitude, longitude, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const checkStmt = db.prepare('SELECT id FROM weather_data WHERE date = ? AND hour = ? AND city = ?');

  const transaction = db.transaction(() => {
    for (const record of data) {
      const existing = checkStmt.get(record.date, record.hour, record.city);

      insertStmt.run(
        record.date,
        record.hour,
        record.temperature,
        record.windspeed,
        record.winddirection,
        record.direct_radiation,
        record.precipitation,
        record.cloudcover,
        record.humidity,
        record.city,
        record.latitude,
        record.longitude
      );

      if (existing) {
        updated++;
      } else {
        inserted++;
      }
    }
  });

  transaction();
  return { inserted, updated };
};

export const getRecentWeatherData = (hours: number = 24, city: string = 'Istanbul'): WeatherData[] => {
  const db = getSQLiteDb();

  const stmt = db.prepare(`
    SELECT * FROM weather_data
    WHERE city = ?
    ORDER BY date DESC, hour DESC
    LIMIT ?
  `);

  const rows = stmt.all(city, hours) as any[];

  return rows.map(row => ({
    date: row.date,
    hour: row.hour,
    temperature: row.temperature,
    windspeed: row.windspeed,
    winddirection: row.winddirection,
    direct_radiation: row.direct_radiation,
    precipitation: row.precipitation,
    cloudcover: row.cloudcover,
    humidity: row.humidity,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude
  }));
};