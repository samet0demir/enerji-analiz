"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanup = exports.triggerDataCollection = exports.getSchedulerStatus = exports.stopScheduler = exports.startScheduler = exports.startDataCollection = void 0;
const cron = __importStar(require("node-cron"));
const epias_service_1 = require("./epias.service");
const database_service_1 = require("./database.service");
const weather_service_1 = require("./weather.service");
let dataCollectionJob = null;
/**
 * Helper to format date for EPİAŞ API (YYYY-MM-DDTHH:mm:ss+03:00)
 */
const formatDateForEpias = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00+03:00`;
};
const startDataCollection = () => {
    // Her 1 saatte bir EPİAŞ verilerini kontrol et ve varsa database'e kaydet
    // (EPİAŞ verileri 3-4 saat gecikmeli yayınlanıyor, 15 dakika gereksiz)
    const job = cron.schedule('0 * * * *', async () => {
        const startTime = Date.now();
        console.log('🔄 Starting scheduled data collection...');
        try {
            // ========== 1. ENERGY PRODUCTION DATA ==========
            const data = await (0, epias_service_1.getRealTimeGeneration)();
            console.log(`📊 Fetched ${data.length} energy production records from EPİAŞ`);
            const saveResult = (0, database_service_1.saveEnergyData)(data);
            console.log(`💾 Energy data saved: ${saveResult.inserted} new, ${saveResult.updated} updated`);
            // ========== 2. PTF (PRICE) DATA ==========
            try {
                // Get last 24 hours of PTF data
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const ptfData = await (0, epias_service_1.getPtfData)(formatDateForEpias(yesterday), formatDateForEpias(today));
                console.log(`💰 Fetched ${ptfData.length} PTF records from EPİAŞ`);
                const ptfResult = (0, database_service_1.savePtfData)(ptfData);
                console.log(`💾 PTF data saved: ${ptfResult.inserted} new, ${ptfResult.updated} updated`);
            }
            catch (ptfError) {
                console.error('⚠️  PTF data collection failed:', ptfError.message);
            }
            // ========== 3. CONSUMPTION DATA ==========
            try {
                // Get last 24 hours of consumption data
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const consumptionData = await (0, epias_service_1.getConsumptionData)(formatDateForEpias(yesterday), formatDateForEpias(today));
                console.log(`⚡ Fetched ${consumptionData.length} consumption records from EPİAŞ`);
                const consumptionResult = (0, database_service_1.saveConsumptionData)(consumptionData);
                console.log(`💾 Consumption data saved: ${consumptionResult.inserted} new, ${consumptionResult.updated} updated`);
            }
            catch (consumptionError) {
                console.error('⚠️  Consumption data collection failed:', consumptionError.message);
            }
            // ========== 4. WEATHER DATA (ISTANBUL) ==========
            try {
                console.log('🌤️  Fetching current weather data for Istanbul...');
                const weatherData = await (0, weather_service_1.getCurrentWeather)('Istanbul');
                console.log(`🌤️  Fetched ${weatherData.length} weather records from Open-Meteo`);
                const weatherResult = (0, database_service_1.saveWeatherData)(weatherData);
                console.log(`💾 Weather data saved: ${weatherResult.inserted} new, ${weatherResult.updated} updated`);
            }
            catch (weatherError) {
                console.error('⚠️  Weather data collection failed:', weatherError.message);
            }
            const executionTime = Date.now() - startTime;
            console.log(`✅ Scheduled data collection completed (${executionTime}ms)`);
            // Log success
            (0, database_service_1.logDataCollection)('success', saveResult.inserted, saveResult.updated, undefined, executionTime);
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            console.error('❌ Scheduled data collection failed:', error.message);
            // Log error
            (0, database_service_1.logDataCollection)('error', 0, 0, error.message, executionTime);
        }
    }, {
        timezone: "Europe/Istanbul"
    });
    // Store and start the job immediately
    dataCollectionJob = job;
    job.start();
    console.log('⏰ Data collection scheduler initialized (every 1 hour)');
    console.log('📊 Collecting: Production, PTF (Prices), Consumption, and Weather data');
    console.log('💡 Note: EPİAŞ data has 3-4 hour delay, 1-hour interval is optimal');
    console.log('🌤️  Weather: Real-time data from Open-Meteo (Istanbul)');
    console.log('✅ Scheduler auto-started');
    return dataCollectionJob;
};
exports.startDataCollection = startDataCollection;
const startScheduler = () => {
    if (dataCollectionJob) {
        dataCollectionJob.start();
        console.log('✅ Data collection scheduler started');
    }
};
exports.startScheduler = startScheduler;
const stopScheduler = () => {
    if (dataCollectionJob) {
        dataCollectionJob.stop();
        console.log('⏸️ Data collection scheduler stopped');
    }
};
exports.stopScheduler = stopScheduler;
const getSchedulerStatus = () => {
    return {
        isRunning: dataCollectionJob?.running || false,
        nextRun: dataCollectionJob ? 'Every 15 minutes' : 'Not scheduled'
    };
};
exports.getSchedulerStatus = getSchedulerStatus;
// Manuel data collection trigger
const triggerDataCollection = async () => {
    const startTime = Date.now();
    console.log('🔄 Manual data collection triggered...');
    try {
        const data = await (0, epias_service_1.getRealTimeGeneration)();
        const saveResult = (0, database_service_1.saveEnergyData)(data);
        const executionTime = Date.now() - startTime;
        console.log(`💾 Manual collection completed: ${saveResult.inserted} new, ${saveResult.updated} updated (${executionTime}ms)`);
        (0, database_service_1.logDataCollection)('manual_success', saveResult.inserted, saveResult.updated, undefined, executionTime);
        return {
            success: true,
            inserted: saveResult.inserted,
            updated: saveResult.updated,
            executionTime
        };
    }
    catch (error) {
        const executionTime = Date.now() - startTime;
        console.error('❌ Manual data collection failed:', error.message);
        (0, database_service_1.logDataCollection)('manual_error', 0, 0, error.message, executionTime);
        throw error;
    }
};
exports.triggerDataCollection = triggerDataCollection;
// Cleanup function
const cleanup = () => {
    if (dataCollectionJob) {
        dataCollectionJob.destroy();
        dataCollectionJob = null;
        console.log('🧹 Data collection scheduler cleaned up');
    }
};
exports.cleanup = cleanup;
//# sourceMappingURL=scheduler.service.js.map