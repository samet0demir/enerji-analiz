"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDataCollection = exports.getEnergyStats = exports.getEnergyDataByDateRange = exports.getRecentEnergyData = exports.saveEnergyData = void 0;
const sqlite_database_1 = require("../config/sqlite-database");
const saveEnergyData = (data) => {
    const db = (0, sqlite_database_1.getSQLiteDb)();
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
            insertStmt.run(record.date, record.hour, record.total, record.naturalGas, record.dammedHydro, record.lignite, record.river, record.importCoal, record.wind, record.sun, record.fuelOil, record.geothermal, record.asphaltiteCoal, record.blackCoal, record.biomass, record.naphta, record.lng, record.importExport, record.wasteHeat);
            if (existing) {
                updated++;
            }
            else {
                inserted++;
            }
        }
    });
    transaction();
    return { inserted, updated };
};
exports.saveEnergyData = saveEnergyData;
const getRecentEnergyData = (hours = 24) => {
    const db = (0, sqlite_database_1.getSQLiteDb)();
    const stmt = db.prepare(`
    SELECT * FROM energy_data
    ORDER BY date DESC, hour DESC
    LIMIT ?
  `);
    const rows = stmt.all(hours);
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
exports.getRecentEnergyData = getRecentEnergyData;
const getEnergyDataByDateRange = (startDate, endDate) => {
    const db = (0, sqlite_database_1.getSQLiteDb)();
    const stmt = db.prepare(`
    SELECT * FROM energy_data
    WHERE date BETWEEN ? AND ?
    ORDER BY date ASC, hour ASC
  `);
    const rows = stmt.all(startDate, endDate);
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
exports.getEnergyDataByDateRange = getEnergyDataByDateRange;
// This is the FIXED version with enhanced functionality
const getEnergyStats = (hours = 24) => {
    console.log('🔍 DEBUG: FINAL Enhanced getEnergyStats function called with hours:', hours);
    const db = (0, sqlite_database_1.getSQLiteDb)();
    try {
        // Total records
        const totalRecords = db.prepare('SELECT COUNT(*) as count FROM energy_data').get();
        console.log('📊 DEBUG: Total records:', totalRecords.count);
        // Date range
        const dateRange = db.prepare(`
      SELECT
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM energy_data
    `).get();
        console.log('📊 DEBUG: Date range:', dateRange);
        // Average for selected time range
        const timeRangeAvg = db.prepare(`
      SELECT AVG(total) as avg_total
      FROM (
        SELECT total FROM energy_data
        ORDER BY date DESC, hour DESC
        LIMIT ?
      )
    `).get(hours);
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
    `).get(hours);
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
    `).get(hours);
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
    `).all();
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
            hours: hours // Debug: hangi hours ile çağrıldığını göster
        };
        console.log('🔧 DEBUG: Final result object keys:', Object.keys(result));
        console.log('📊 DEBUG: Final result:', JSON.stringify(result, null, 2));
        return result;
    }
    catch (error) {
        console.error('❌ DEBUG: Error in getEnergyStats:', error);
        throw error;
    }
};
exports.getEnergyStats = getEnergyStats;
const logDataCollection = (status, recordsInserted, recordsUpdated, errorMessage, executionTimeMs) => {
    const db = (0, sqlite_database_1.getSQLiteDb)();
    const stmt = db.prepare(`
    INSERT INTO data_collection_logs (status, records_inserted, records_updated, error_message, execution_time_ms)
    VALUES (?, ?, ?, ?, ?)
  `);
    stmt.run(status, recordsInserted, recordsUpdated, errorMessage || null, executionTimeMs || null);
};
exports.logDataCollection = logDataCollection;
//# sourceMappingURL=database.service.js.map