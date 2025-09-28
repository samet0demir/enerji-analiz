import express from 'express';
import { getRealTimeGeneration } from '../services/epias.service';

const router = express.Router();

// GET /api/v1/energy/realtime - Gerçek zamanlı enerji üretim verilerini getir
router.get('/realtime', async (req, res) => {
  try {
    const data = await getRealTimeGeneration();

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

// GET /api/v1/energy/summary - Özet bilgiler
router.get('/summary', async (req, res) => {
  try {
    const data = await getRealTimeGeneration();

    // Toplam üretim hesapla
    const totalGeneration = data.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.quantity) || 0);
    }, 0);

    // Kaynak türlerine göre grupla
    const bySource = data.reduce((acc: any, item: any) => {
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
  } catch (error: any) {
    console.error('Error in /summary endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch energy summary',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export = router;