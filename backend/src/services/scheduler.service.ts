import * as cron from 'node-cron';
import { getRealTimeGeneration } from './epias.service';
import { saveEnergyData, logDataCollection } from './database.service';

let dataCollectionJob: any = null;

export const startDataCollection = () => {
  // Her 15 dakikada bir EPİAŞ verilerini kontrol et ve varsa database'e kaydet
  dataCollectionJob = cron.schedule('*/15 * * * *', async () => {
    const startTime = Date.now();
    console.log('🔄 Starting scheduled data collection...');

    try {
      // EPİAŞ'tan real-time verileri çek
      const data = await getRealTimeGeneration();
      console.log(`📊 Fetched ${data.length} energy records from EPİAŞ`);

      // Database'e kaydet
      const saveResult = saveEnergyData(data);
      const executionTime = Date.now() - startTime;

      console.log(`💾 Data collection completed: ${saveResult.inserted} new, ${saveResult.updated} updated (${executionTime}ms)`);

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

  console.log('⏰ Data collection scheduler initialized (every 15 minutes)');
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