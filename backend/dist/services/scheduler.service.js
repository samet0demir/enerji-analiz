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
let dataCollectionJob = null;
const startDataCollection = () => {
    // Her 15 dakikada bir EPİAŞ verilerini kontrol et ve varsa database'e kaydet
    dataCollectionJob = cron.schedule('*/15 * * * *', async () => {
        const startTime = Date.now();
        console.log('🔄 Starting scheduled data collection...');
        try {
            // EPİAŞ'tan real-time verileri çek
            const data = await (0, epias_service_1.getRealTimeGeneration)();
            console.log(`📊 Fetched ${data.length} energy records from EPİAŞ`);
            // Database'e kaydet
            const saveResult = (0, database_service_1.saveEnergyData)(data);
            const executionTime = Date.now() - startTime;
            console.log(`💾 Data collection completed: ${saveResult.inserted} new, ${saveResult.updated} updated (${executionTime}ms)`);
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
    console.log('⏰ Data collection scheduler initialized (every 15 minutes)');
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