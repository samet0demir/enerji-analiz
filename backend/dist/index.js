"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const epias_service_1 = require("./services/epias.service");
const sqlite_database_1 = require("./config/sqlite-database");
const sqlite_migrations_1 = require("./config/sqlite-migrations");
const database_service_1 = require("./services/database.service");
const scheduler_service_1 = require("./services/scheduler.service");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
const security_1 = require("./middleware/security");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Security middleware
app.use(security_1.securityHeaders);
app.use(security_1.responseCompression);
app.use((0, cors_1.default)(security_1.corsOptions));
// General rate limiting
app.use(security_1.generalLimiter);
// Request logging
app.use(logger_1.requestLogger);
// Body parsing middleware
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
// Basic routes
app.get('/health', async (req, res) => {
    try {
        const dbHealthy = (0, sqlite_database_1.checkSQLiteHealth)();
        res.json({
            status: dbHealthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: dbHealthy ? 'healthy' : 'unhealthy'
            }
        });
    }
    catch (error) {
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
app.get('/api/v1/energy/realtime', security_1.apiLimiter, async (req, res) => {
    try {
        const data = await (0, epias_service_1.getRealTimeGeneration)();
        // Save fresh data to database
        try {
            const saveResult = (0, database_service_1.saveEnergyData)(data);
            console.log(`💾 Data saved: ${saveResult.inserted} new, ${saveResult.updated} updated`);
        }
        catch (dbError) {
            console.warn('Database save failed:', dbError);
        }
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            count: data.length,
            data: data
        });
    }
    catch (error) {
        console.error('Error in /realtime endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch real-time generation data',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});
app.get('/api/v1/energy/summary', security_1.apiLimiter, async (req, res) => {
    try {
        const { hours = '24' } = req.query;
        const hoursNumber = parseInt(hours) || 24;
        // Get data based on time range from database instead of just EPİAŞ API
        const data = (0, database_service_1.getRecentEnergyData)(hoursNumber);
        // Toplam üretim hesapla (total field'ını kullan)
        const totalGeneration = data.reduce((sum, item) => {
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
    }
    catch (error) {
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
            data = (0, database_service_1.getEnergyDataByDateRange)(startDate, endDate);
        }
        else {
            data = (0, database_service_1.getRecentEnergyData)(parseInt(hours));
        }
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            count: data.length,
            filters: { hours, startDate, endDate },
            data: data
        });
    }
    catch (error) {
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
        const hoursNumber = parseInt(hours) || 24;
        console.log('🔍 DEBUG: /api/v1/energy/stats-enhanced endpoint called with hours:', hoursNumber);
        const stats = (0, database_service_1.getEnergyStats)(hoursNumber);
        console.log('🔍 DEBUG: Enhanced getEnergyStats returned:', JSON.stringify(stats, null, 2));
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            stats: stats
        });
    }
    catch (error) {
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
        const hoursNumber = parseInt(hours) || 24;
        console.log('🔍 DEBUG: /api/v1/energy/stats endpoint called with hours:', hoursNumber);
        const statsResult = (0, database_service_1.getEnergyStats)(hoursNumber);
        console.log('🔍 DEBUG: getEnergyStats returned:', JSON.stringify(statsResult, null, 2));
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            stats: statsResult
        });
    }
    catch (error) {
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
        const hoursNumber = parseInt(hours) || 24;
        console.log('🧪 TEST: Received hours parameter:', hours, '-> parsed:', hoursNumber);
        const testStats = (0, database_service_1.getEnergyStats)(hoursNumber);
        res.json({
            success: true,
            receivedHours: hours,
            parsedHours: hoursNumber,
            testResult: testStats.timeRangeAvg,
            debug: true
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Scheduler management endpoints
app.get('/api/v1/scheduler/status', (req, res) => {
    try {
        const status = (0, scheduler_service_1.getSchedulerStatus)();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            scheduler: status
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get scheduler status',
            message: error.message
        });
    }
});
app.post('/api/v1/scheduler/start', security_1.strictLimiter, (req, res) => {
    try {
        (0, scheduler_service_1.startScheduler)();
        res.json({
            success: true,
            message: 'Data collection scheduler started',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to start scheduler',
            message: error.message
        });
    }
});
app.post('/api/v1/scheduler/stop', security_1.strictLimiter, (req, res) => {
    try {
        (0, scheduler_service_1.stopScheduler)();
        res.json({
            success: true,
            message: 'Data collection scheduler stopped',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to stop scheduler',
            message: error.message
        });
    }
});
app.post('/api/v1/scheduler/trigger', security_1.strictLimiter, async (req, res) => {
    try {
        const result = await (0, scheduler_service_1.triggerDataCollection)();
        res.json({
            success: true,
            message: 'Manual data collection completed',
            timestamp: new Date().toISOString(),
            result: result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Manual data collection failed',
            message: error.message
        });
    }
});
// Historical data collection endpoint - REAL DATA ONLY
app.post('/api/v1/data/collect-historical', security_1.strictLimiter, async (req, res) => {
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
        const historicalData = await (0, epias_service_1.getHistoricalGeneration)(startDate, endDate);
        if (!historicalData.length) {
            return res.json({
                success: true,
                message: 'No historical data found for the specified date range',
                inserted: 0,
                updated: 0
            });
        }
        // Database'e kaydet
        const saveResult = (0, database_service_1.saveEnergyData)(historicalData);
        res.json({
            success: true,
            message: `Historical data collection completed for ${startDate} to ${endDate}`,
            timestamp: new Date().toISOString(),
            dateRange: { startDate, endDate },
            totalRecords: historicalData.length,
            inserted: saveResult.inserted,
            updated: saveResult.updated
        });
    }
    catch (error) {
        console.error('Error collecting historical data:', error);
        res.status(500).json({
            success: false,
            error: 'Historical data collection failed',
            message: error.message
        });
    }
});
// Error handling middleware (must be last)
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
// Initialize database and start server
try {
    logger_1.dbLogger.info('Initializing SQLite database...');
    (0, sqlite_database_1.initializeSQLiteDatabase)();
    (0, sqlite_migrations_1.runSQLiteMigrations)();
    logger_1.dbLogger.info('Database initialized successfully');
}
catch (error) {
    logger_1.dbLogger.error('Database initialization failed', error);
    process.exit(1);
}
// Initialize scheduler
try {
    logger_1.schedulerLogger.info('Initializing data collection scheduler...');
    (0, scheduler_service_1.startDataCollection)();
    (0, scheduler_service_1.startScheduler)();
    logger_1.schedulerLogger.info('Data collection scheduler started');
}
catch (error) {
    logger_1.schedulerLogger.error('Scheduler initialization failed', error);
}
app.listen(PORT, () => {
    logger_1.logger.info(`🚀 Energy Analytics Turkey API running on port ${PORT}`);
    logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.logger.info(`Health check: http://localhost:${PORT}/health`);
    logger_1.epiasLogger.info('EPİAŞ API: Connected and working');
    logger_1.dbLogger.info('SQLite database: Initialized');
    logger_1.schedulerLogger.info('15-minute data collection: Running');
});
//# sourceMappingURL=index.js.map