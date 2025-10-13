import * as cron from 'node-cron';
import { getRealTimeGeneration, getPtfData, getConsumptionData } from './epias.service';
import { saveEnergyData, logDataCollection, savePtfData, saveConsumptionData, saveWeatherData } from './database.service';
import { getCurrentWeather } from './weather.service';

let dataCollectionJob: any = null;

/**
 * Helper to format date for EPİAŞ API (YYYY-MM-DDTHH:mm:ss+03:00)
 */
const formatDateForEpias = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00+03:00`;
};

export const startDataCollection = () => {
  // Her 1 saatte bir EPİAŞ verilerini kontrol et ve varsa database'e kaydet
  // (EPİAŞ verileri 3-4 saat gecikmeli yayınlanıyor, 15 dakika gereksiz)
  dataCollectionJob = cron.schedule('0 * * * *', async () => {
    const startTime = Date.now();
    console.log('🔄 Starting scheduled data collection...');

    try {
      // ========== 1. ENERGY PRODUCTION DATA ==========
      const data = await getRealTimeGeneration();
      console.log(`📊 Fetched ${data.length} energy production records from EPİAŞ`);

      const saveResult = saveEnergyData(data);
      console.log(`💾 Energy data saved: ${saveResult.inserted} new, ${saveResult.updated} updated`);

      // ========== 2. PTF (PRICE) DATA ==========
      try {
        // Get last 24 hours of PTF data
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const ptfData = await getPtfData(formatDateForEpias(yesterday), formatDateForEpias(today));
        console.log(`💰 Fetched ${ptfData.length} PTF records from EPİAŞ`);

        const ptfResult = savePtfData(ptfData);
        console.log(`💾 PTF data saved: ${ptfResult.inserted} new, ${ptfResult.updated} updated`);
      } catch (ptfError: any) {
        console.error('⚠️  PTF data collection failed:', ptfError.message);
      }

      // ========== 3. CONSUMPTION DATA ==========
      try {
        // Get last 24 hours of consumption data
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const consumptionData = await getConsumptionData(formatDateForEpias(yesterday), formatDateForEpias(today));
        console.log(`⚡ Fetched ${consumptionData.length} consumption records from EPİAŞ`);

        const consumptionResult = saveConsumptionData(consumptionData);
        console.log(`💾 Consumption data saved: ${consumptionResult.inserted} new, ${consumptionResult.updated} updated`);
      } catch (consumptionError: any) {
        console.error('⚠️  Consumption data collection failed:', consumptionError.message);
      }

      // ========== 4. WEATHER DATA (ISTANBUL) ==========
      try {
        console.log('🌤️  Fetching current weather data for Istanbul...');
        const weatherData = await getCurrentWeather('Istanbul');
        console.log(`🌤️  Fetched ${weatherData.length} weather records from Open-Meteo`);

        const weatherResult = saveWeatherData(weatherData);
        console.log(`💾 Weather data saved: ${weatherResult.inserted} new, ${weatherResult.updated} updated`);
      } catch (weatherError: any) {
        console.error('⚠️  Weather data collection failed:', weatherError.message);
      }

      const executionTime = Date.now() - startTime;
      console.log(`✅ Scheduled data collection completed (${executionTime}ms)`);

      // Log success
      logDataCollection('success', saveResult.inserted, saveResult.updated, undefined, executionTime);

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error('❌ Scheduled data collection failed:', error.message);

      // Log error
      logDataCollection('error', 0, 0, error.message, executionTime);
    }
  }, {
    timezone: "Europe/Istanbul"
  });

  console.log('⏰ Data collection scheduler initialized (every 1 hour)');
  console.log('📊 Collecting: Production, PTF (Prices), Consumption, and Weather data');
  console.log('💡 Note: EPİAŞ data has 3-4 hour delay, 1-hour interval is optimal');
  console.log('🌤️  Weather: Real-time data from Open-Meteo (Istanbul)');
  return dataCollectionJob;
};

export const startScheduler = () => {
  if (dataCollectionJob) {
    dataCollectionJob.start();
    console.log('✅ Data collection scheduler started');
  }
};

export const stopScheduler = () => {
  if (dataCollectionJob) {
    dataCollectionJob.stop();
    console.log('⏸️ Data collection scheduler stopped');
  }
};

export const getSchedulerStatus = () => {
  return {
    isRunning: dataCollectionJob?.running || false,
    nextRun: dataCollectionJob ? 'Every 15 minutes' : 'Not scheduled'
  };
};

// Manuel data collection trigger
export const triggerDataCollection = async () => {
  const startTime = Date.now();
  console.log('🔄 Manual data collection triggered...');

  try {
    const data = await getRealTimeGeneration();
    const saveResult = saveEnergyData(data);
    const executionTime = Date.now() - startTime;

    console.log(`💾 Manual collection completed: ${saveResult.inserted} new, ${saveResult.updated} updated (${executionTime}ms)`);

    logDataCollection('manual_success', saveResult.inserted, saveResult.updated, undefined, executionTime);

    return {
      success: true,
      inserted: saveResult.inserted,
      updated: saveResult.updated,
      executionTime
    };

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Manual data collection failed:', error.message);

    logDataCollection('manual_error', 0, 0, error.message, executionTime);

    throw error;
  }
};

// Cleanup function
export const cleanup = () => {
  if (dataCollectionJob) {
    dataCollectionJob.destroy();
    dataCollectionJob = null;
    console.log('🧹 Data collection scheduler cleaned up');
  }
};