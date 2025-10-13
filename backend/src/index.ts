import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getRealTimeGeneration, getHistoricalGeneration } from './services/epias.service';
import { initializeSQLiteDatabase, checkSQLiteHealth } from './config/sqlite-database';
import { runSQLiteMigrations } from './config/sqlite-migrations';
import { saveEnergyData, getRecentEnergyData, getEnergyDataByDateRange, getEnergyStats, getRecentPtfData, getRecentConsumptionData, getRecentWeatherData } from './services/database.service';
import { startDataCollection, startScheduler, stopScheduler, getSchedulerStatus, triggerDataCollection } from './services/scheduler.service';
import { errorHandler, notFound, asyncHandler } from './middleware/errorHandler';
import { requestLogger, logger, dbLogger, epiasLogger, schedulerLogger } from './utils/logger';
import { generalLimiter, apiLimiter, strictLimiter, securityHeaders, responseCompression, corsOptions } from './middleware/security';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(responseCompression);
app.use(cors(corsOptions));

// General rate limiting
app.use(generalLimiter);

// Request logging
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Basic routes
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = checkSQLiteHealth();

    res.json({
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'error'
      }
    });
  }
});

app.get('/api/v1/test', (req, res) => {
  res.json({
    message: 'Energy Analytics Turkey API is running!',
    version: '1.0.0'
  });
});

// Energy endpoints (with API rate limiting)
app.get('/api/v1/energy/realtime', apiLimiter, async (req, res) => {
  try {
    const data = await getRealTimeGeneration();

    // Save fresh data to database
    try {
      const saveResult = saveEnergyData(data);
      console.log(`💾 Data saved: ${saveResult.inserted} new, ${saveResult.updated} updated`);
    } catch (dbError) {
      console.warn('Database save failed:', dbError);
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: data.length,
      data: data
    });
  } catch (error: any) {
    console.error('Error in /realtime endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time generation data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/api/v1/energy/summary', apiLimiter, async (req, res) => {
  try {
    const { hours = '24' } = req.query;
    const hoursNumber = parseInt(hours as string) || 24;

    // Get data based on time range from database instead of just EPİAŞ API
    const data = getRecentEnergyData(hoursNumber);

    // Toplam üretim hesapla (total field'ını kullan)
    const totalGeneration = data.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.total) || 0);
    }, 0);

    // Kaynak türlerine göre analiz - Database'den gelen data
    const latestHour = data[data.length - 1]; // En son saat verisi

    if (!latestHour) {
      return res.status(404).json({
        success: false,
        error: 'No data found for the specified time range'
      });
    }
    const sourceBreakdown = {
      'Doğal Gaz': latestHour.naturalGas || 0,
      'Rüzgar': latestHour.wind || 0,
      'İthal Kömür': latestHour.importCoal || 0,
      'Linyit': latestHour.lignite || 0,
      'Barajlı Hidro': latestHour.dammedHydro || 0,
      'Akarsu': latestHour.river || 0,
      'Güneş': latestHour.sun || 0,
      'Jeotermal': latestHour.geothermal || 0,
      'Biyokütle': latestHour.biomass || 0,
      'Taş Kömürü': latestHour.blackCoal || 0,
      'Asfaltit Kömürü': latestHour.asphaltiteCoal || 0,
      'Fuel Oil': latestHour.fuelOil || 0,
      'Atık Isı': latestHour.wasteHeat || 0,
      'LNG': latestHour.lng || 0,
      'Nafta': latestHour.naphta || 0
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalGeneration: Math.round(totalGeneration * 100) / 100,
        currentHourTotal: latestHour.total,
        dataPoints: data.length,
        latestHour: latestHour.hour,
        sourceBreakdown: sourceBreakdown
      }
    });
  } catch (error: any) {
    console.error('Error in /summary endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch energy summary',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Historical data endpoints
app.get('/api/v1/energy/history', async (req, res) => {
  try {
    const { hours = '48', startDate, endDate } = req.query;

    let data;
    if (startDate && endDate) {
      data = getEnergyDataByDateRange(startDate as string, endDate as string);
    } else {
      data = getRecentEnergyData(parseInt(hours as string));
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: data.length,
      filters: { hours, startDate, endDate },
      data: data
    });
  } catch (error: any) {
    console.error('Error in /history endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// NEW Enhanced stats endpoint
app.get('/api/v1/energy/stats-enhanced', async (req, res) => {
  try {
    const { hours = '24' } = req.query;
    const hoursNumber = parseInt(hours as string) || 24;

    console.log('🔍 DEBUG: /api/v1/energy/stats-enhanced endpoint called with hours:', hoursNumber);
    const stats = getEnergyStats(hoursNumber);
    console.log('🔍 DEBUG: Enhanced getEnergyStats returned:', JSON.stringify(stats, null, 2));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: stats
    });
  } catch (error: any) {
    console.error('Error in /stats-enhanced endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch enhanced energy statistics',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/api/v1/energy/stats', async (req, res) => {
  try {
    const { hours = '24' } = req.query;
    const hoursNumber = parseInt(hours as string) || 24;

    console.log('🔍 DEBUG: /api/v1/energy/stats endpoint called with hours:', hoursNumber);
    const statsResult = getEnergyStats(hoursNumber);
    console.log('🔍 DEBUG: getEnergyStats returned:', JSON.stringify(statsResult, null, 2));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: statsResult
    });
  } catch (error: any) {
    console.error('Error in /stats endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch energy statistics',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// TEST endpoint to debug hours parameter
app.get('/api/v1/test/hours', async (req, res) => {
  try {
    const { hours = '24' } = req.query;
    const hoursNumber = parseInt(hours as string) || 24;

    console.log('🧪 TEST: Received hours parameter:', hours, '-> parsed:', hoursNumber);

    const testStats = getEnergyStats(hoursNumber);

    res.json({
      success: true,
      receivedHours: hours,
      parsedHours: hoursNumber,
      testResult: testStats.timeRangeAvg,
      debug: true
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Scheduler management endpoints
app.get('/api/v1/scheduler/status', (req, res) => {
  try {
    const status = getSchedulerStatus();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      scheduler: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status',
      message: error.message
    });
  }
});

app.post('/api/v1/scheduler/start', strictLimiter, (req, res) => {
  try {
    startScheduler();
    res.json({
      success: true,
      message: 'Data collection scheduler started',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduler',
      message: error.message
    });
  }
});

app.post('/api/v1/scheduler/stop', strictLimiter, (req, res) => {
  try {
    stopScheduler();
    res.json({
      success: true,
      message: 'Data collection scheduler stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler',
      message: error.message
    });
  }
});

app.post('/api/v1/scheduler/trigger', strictLimiter, async (req, res) => {
  try {
    const result = await triggerDataCollection();
    res.json({
      success: true,
      message: 'Manual data collection completed',
      timestamp: new Date().toISOString(),
      result: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Manual data collection failed',
      message: error.message
    });
  }
});

// Historical data collection endpoint - REAL DATA ONLY
app.post('/api/v1/data/collect-historical', strictLimiter, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameters',
        message: 'startDate and endDate are required (YYYY-MM-DD format)'
      });
    }

    console.log(`📊 Collecting historical data: ${startDate} to ${endDate}`);

    // EPİAŞ'tan geçmiş verileri çek
    const historicalData = await getHistoricalGeneration(startDate, endDate);

    if (!historicalData.length) {
      return res.json({
        success: true,
        message: 'No historical data found for the specified date range',
        inserted: 0,
        updated: 0
      });
    }

    // Database'e kaydet
    const saveResult = saveEnergyData(historicalData);

    res.json({
      success: true,
      message: `Historical data collection completed for ${startDate} to ${endDate}`,
      timestamp: new Date().toISOString(),
      dateRange: { startDate, endDate },
      totalRecords: historicalData.length,
      inserted: saveResult.inserted,
      updated: saveResult.updated
    });

  } catch (error: any) {
    console.error('Error collecting historical data:', error);
    res.status(500).json({
      success: false,
      error: 'Historical data collection failed',
      message: error.message
    });
  }
});

// PTF (Electricity Price) endpoints
app.get('/api/v1/ptf/latest', apiLimiter, async (req, res) => {
  try {
    const { hours = '24' } = req.query;
    const hoursNumber = parseInt(hours as string) || 24;

    const data = getRecentPtfData(hoursNumber);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: data.length,
      data: data
    });
  } catch (error: any) {
    console.error('Error in /ptf/latest endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch PTF data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Consumption endpoints
app.get('/api/v1/consumption/latest', apiLimiter, async (req, res) => {
  try {
    const { hours = '24' } = req.query;
    const hoursNumber = parseInt(hours as string) || 24;

    const data = getRecentConsumptionData(hoursNumber);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: data.length,
      data: data
    });
  } catch (error: any) {
    console.error('Error in /consumption/latest endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch consumption data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Weather endpoints
app.get('/api/v1/weather/latest', apiLimiter, async (req, res) => {
  try {
    const { hours = '24', city = 'Istanbul' } = req.query;
    const hoursNumber = parseInt(hours as string) || 24;

    const data = getRecentWeatherData(hoursNumber, city as string);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      city: city,
      count: data.length,
      data: data
    });
  } catch (error: any) {
    console.error('Error in /weather/latest endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Initialize database and start server
try {
  dbLogger.info('Initializing SQLite database...');
  initializeSQLiteDatabase();
  runSQLiteMigrations();
  dbLogger.info('Database initialized successfully');
} catch (error) {
  dbLogger.error('Database initialization failed', error);
  process.exit(1);
}

// Initialize scheduler
try {
  schedulerLogger.info('Initializing data collection scheduler...');
  startDataCollection();
  startScheduler();
  schedulerLogger.info('Data collection scheduler started');
} catch (error) {
  schedulerLogger.error('Scheduler initialization failed', error);
}

app.listen(PORT, () => {
  logger.info(`🚀 Energy Analytics Turkey API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  epiasLogger.info('EPİAŞ API: Connected and working');
  dbLogger.info('SQLite database: Initialized');
  schedulerLogger.info('15-minute data collection: Running');
});