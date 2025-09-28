"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const express_1 = __importDefault(require("express"));
const epias_service_1 = require("../services/epias.service");
const router = express_1.default.Router();
// GET /api/v1/energy/realtime - Gerçek zamanlı enerji üretim verilerini getir
router.get('/realtime', async (req, res) => {
    try {
        const data = await (0, epias_service_1.getRealTimeGeneration)();
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
// GET /api/v1/energy/summary - Özet bilgiler
router.get('/summary', async (req, res) => {
    try {
        const data = await (0, epias_service_1.getRealTimeGeneration)();
        // Toplam üretim hesapla
        const totalGeneration = data.reduce((sum, item) => {
            return sum + (parseFloat(item.quantity) || 0);
        }, 0);
        // Kaynak türlerine göre grupla
        const bySource = data.reduce((acc, item) => {
            const source = item.powerPlantType || 'Unknown';
            if (!acc[source]) {
                acc[source] = {
                    count: 0,
                    totalQuantity: 0
                };
            }
            acc[source].count++;
            acc[source].totalQuantity += parseFloat(item.quantity) || 0;
            return acc;
        }, {});
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                totalGeneration: Math.round(totalGeneration * 100) / 100,
                totalPlants: data.length,
                bySource: bySource
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
module.exports = router;
//# sourceMappingURL=energy.routes.js.map