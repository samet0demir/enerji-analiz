import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import PriceChart from './PriceChart';
import ConsumptionChart from './ConsumptionChart';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface EnergyData {
  date: string;
  hour: string;
  total: number;
  naturalGas: number;
  wind: number;
  importCoal: number;
  lignite: number;
  dammedHydro: number;
  river: number;
  sun: number;
  geothermal: number;
  biomass: number;
  blackCoal: number;
  asphaltiteCoal: number;
  fueloil: number;
  wasteheat: number;
  lng: number;
  naphta: number;
}

interface SummaryData {
  totalGeneration: number;
  currentHourTotal: number;
  dataPoints: number;
  latestHour: string;
  sourceBreakdown: { [key: string]: number };
}

interface StatsData {
  timeRangeAvg?: number;
  last24HoursAvg?: number; // Fallback for API compatibility
  maxGeneration?: number;
  renewablePercentage?: number;
  totalRecords?: number;
}

const EnergyDashboard: React.FC = () => {
  const [realtimeData, setRealtimeData] = useState<EnergyData[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [historicalData, setHistoricalData] = useState<EnergyData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [priceData, setPriceData] = useState<any[]>([]);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [priceDataLong, setPriceDataLong] = useState<any[]>([]);
  const [consumptionDataLong, setConsumptionDataLong] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('24');
  const [sourceChartMode, setSourceChartMode] = useState<'current' | 'timeRange'>('current');
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://enerji-analiz-production.up.railway.app/api/v1';

  const fetchData = useCallback(async (isTimeRangeChange = false) => {
    // Debounce for time range changes to prevent spam
    if (isTimeRangeChange) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    try {
      setLoading(true);
      const [
        realtimeResponse,
        summaryResponse,
        historyResponse,
        statsResponse,
        priceResponse,
        consumptionResponse,
        priceResponseLong,
        consumptionResponseLong
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/energy/realtime`),
        axios.get(`${API_BASE_URL}/energy/summary?hours=${timeRange}`),
        axios.get(`${API_BASE_URL}/energy/history?hours=${timeRange}`),
        axios.get(`${API_BASE_URL}/energy/stats?hours=${timeRange}`),
        axios.get(`${API_BASE_URL}/ptf/latest?hours=${timeRange}`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE_URL}/consumption/latest?hours=${timeRange}`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE_URL}/ptf/latest?hours=1000`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE_URL}/consumption/latest?hours=1000`).catch(() => ({ data: { data: [] } }))
      ]);

      setRealtimeData(realtimeResponse.data.data);
      setSummaryData(summaryResponse.data.summary);
      // Historical data'yı ters çevir - en eski solda, en yeni sağda olsun
      setHistoricalData(historyResponse.data.data.reverse());
      setStats(statsResponse.data.stats);
      setPriceData(priceResponse.data.data || []);
      setConsumptionData(consumptionResponse.data.data || []);
      setPriceDataLong(priceResponseLong.data.data || []);
      setConsumptionDataLong(consumptionResponseLong.data.data || []);

      // Son güncelleme zamanını hesapla ve formatla
      if (realtimeResponse.data.data && realtimeResponse.data.data.length > 0) {
        const latestData = realtimeResponse.data.data[realtimeResponse.data.data.length - 1];
        const dateStr = latestData.date; // "2025-10-13T22:00:00+03:00"
        const hourStr = latestData.hour; // "22:00"

        // Tarihi daha okunabilir formata çevir
        const dateObj = new Date(dateStr);
        const formattedDate = dateObj.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });

        setLastUpdateTime(`${formattedDate} - Saat ${hourStr}`);
      }

      setError(null);
    } catch (error: unknown) {
      setError('Veri yüklenirken hata oluştu: ' + (error instanceof Error ? error.message : String(error)));
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, API_BASE_URL]);

  useEffect(() => {
    fetchData(true); // Time range change için debounce
    // Otomatik yenileme KALDIRILDI - Kullanıcı deneyimini bozuyor
    // Enerji verileri saatlik güncelleniyor, sürekli yenilenmeye gerek yok
    // Kullanıcı manuel olarak yenileyebilir
  }, [timeRange, fetchData]);

  // Client-side time range calculations (like real energy sites)
  const getTimeRangeAverage = () => {
    if (!historicalData.length) return null;
    const total = historicalData.reduce((sum, item) => sum + item.total, 0);
    return total / historicalData.length;
  };

  const getTimeRangeMax = () => {
    if (!historicalData.length) return null;
    return Math.max(...historicalData.map(item => item.total));
  };

  const getRenewablePercentage = () => {
    if (!historicalData.length) return null;
    const totalGeneration = historicalData.reduce((sum, item) => sum + item.total, 0);
    const totalRenewable = historicalData.reduce((sum, item) =>
      sum + (item.wind + item.sun + item.dammedHydro + item.river + item.geothermal), 0);
    return (totalRenewable / totalGeneration) * 100;
  };

  const getSourceChartData = () => {
    if (sourceChartMode === 'current') {
      // Güncel saat verisi (mevcut)
      if (!summaryData) return null;
      const labels = Object.keys(summaryData.sourceBreakdown);
      const data = Object.values(summaryData.sourceBreakdown);

      return {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
              '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
              '#36A2EB', '#FFCE56', '#9966FF', '#FF9F40', '#C9CBCF'
            ],
            borderWidth: 2,
          },
        ],
      };
    } else {
      // Zaman aralığı ortalaması (yeni)
      if (!historicalData.length) return null;

      // Zaman aralığındaki ortalama değerleri hesapla
      const avgData = {
        'Doğal Gaz': historicalData.reduce((sum, d) => sum + d.naturalGas, 0) / historicalData.length,
        'Rüzgar': historicalData.reduce((sum, d) => sum + d.wind, 0) / historicalData.length,
        'İthal Kömür': historicalData.reduce((sum, d) => sum + d.importCoal, 0) / historicalData.length,
        'Linyit': historicalData.reduce((sum, d) => sum + d.lignite, 0) / historicalData.length,
        'Barajlı Hidro': historicalData.reduce((sum, d) => sum + d.dammedHydro, 0) / historicalData.length,
        'Akarsu': historicalData.reduce((sum, d) => sum + d.river, 0) / historicalData.length,
        'Güneş': historicalData.reduce((sum, d) => sum + d.sun, 0) / historicalData.length,
        'Jeotermal': historicalData.reduce((sum, d) => sum + d.geothermal, 0) / historicalData.length,
        'Biyokütle': historicalData.reduce((sum, d) => sum + d.biomass, 0) / historicalData.length,
        'Taş Kömürü': historicalData.reduce((sum, d) => sum + d.blackCoal, 0) / historicalData.length,
        'Asfaltit Kömürü': historicalData.reduce((sum, d) => sum + d.asphaltiteCoal, 0) / historicalData.length,
        'Fuel Oil': historicalData.reduce((sum, d) => sum + d.fueloil, 0) / historicalData.length,
        'Atık Isı': historicalData.reduce((sum, d) => sum + d.wasteheat, 0) / historicalData.length,
        'LNG': historicalData.reduce((sum, d) => sum + d.lng, 0) / historicalData.length,
        'Nafta': historicalData.reduce((sum, d) => sum + d.naphta, 0) / historicalData.length
      };

      const labels = Object.keys(avgData);
      const data = Object.values(avgData);

      return {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
              '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
              '#36A2EB', '#FFCE56', '#9966FF', '#FF9F40', '#C9CBCF'
            ],
            borderWidth: 2,
          },
        ],
      };
    }
  };

  const getHourlyChartData = () => {
    if (!historicalData.length) return null;

    // Seçilen zaman aralığındaki tüm verileri kullan
    const timeRangeHours = parseInt(timeRange);
    const selectedData = historicalData.slice(-timeRangeHours);

    return {
      labels: selectedData.map(d => d.hour),
      datasets: [
        {
          label: 'Toplam Üretim (MWh)',
          data: selectedData.map(d => d.total),
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderColor: 'rgba(53, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const getHistoricalTrendData = () => {
    if (!historicalData.length) return null;

    return {
      labels: historicalData.map(d => `${d.date.split('T')[0]} ${d.hour}`),
      datasets: [
        {
          label: 'Toplam Üretim',
          data: historicalData.map(d => d.total),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.1,
        },
        {
          label: 'Rüzgar',
          data: historicalData.map(d => d.wind),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.1,
        },
        {
          label: 'Güneş',
          data: historicalData.map(d => d.sun),
          borderColor: 'rgb(255, 205, 86)',
          backgroundColor: 'rgba(255, 205, 86, 0.1)',
          tension: 0.1,
        },
        {
          label: 'Doğal Gaz',
          data: historicalData.map(d => d.naturalGas),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          tension: 0.1,
        },
      ],
    };
  };

  const getSourceComparisonData = () => {
    if (!historicalData.length) return null;

    const sourceData = {
      renewable: historicalData.map(d => d.wind + d.sun + d.dammedHydro + d.river + d.geothermal),
      fossil: historicalData.map(d => d.naturalGas + d.importCoal + d.lignite + d.blackCoal + d.fueloil),
      other: historicalData.map(d => d.biomass + d.wasteheat + d.lng + d.naphta + d.asphaltiteCoal)
    };

    // Debug: Fosil enerji verilerini kontrol et
    console.log('🔍 DEBUG Fosil Enerji Verileri:', {
      renewableTotal: sourceData.renewable.reduce((a, b) => a + b, 0),
      fossilTotal: sourceData.fossil.reduce((a, b) => a + b, 0),
      otherTotal: sourceData.other.reduce((a, b) => a + b, 0),
      sampleData: historicalData[0]
    });

    return {
      labels: historicalData.map(d => d.hour),
      datasets: [
        {
          label: 'Yenilenebilir',
          data: sourceData.renewable,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1,
        },
        {
          label: 'Fosil',
          data: sourceData.fossil,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1,
        },
        {
          label: 'Diğer',
          data: sourceData.other,
          borderColor: 'rgb(156, 163, 175)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          tension: 0.1,
        },
      ],
    };
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Enerji verileri yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={() => fetchData(false)}>Tekrar Dene</button>
      </div>
    );
  }

  return (
    <div className="energy-dashboard">
      <div className="dashboard-content">
        {/* Data Freshness Banner */}
        <div className="data-freshness-banner">
          <div className="freshness-content">
            <span className="freshness-icon">🕐</span>
            <div className="freshness-info">
              <h4>SON VERİ GÜNCELLEMESİ</h4>
              <p className="freshness-time">{lastUpdateTime || 'Yükleniyor...'}</p>
              <p className="freshness-note">
                ⚠️ EPİAŞ API'si 2-4 saat gecikmeli veri yayınlar (tüm sistemlerde böyledir)
              </p>
            </div>
            <div className="freshness-stats">
              <div className="freshness-stat">
                <span className="stat-value">{priceDataLong.length}</span>
                <span className="stat-label">Fiyat Verisi</span>
                <span className="stat-sublabel">{priceDataLong.length > 0 ? `${Math.floor(priceDataLong.length / 24)} gün` : ''}</span>
              </div>
              <div className="freshness-stat">
                <span className="stat-value">{consumptionDataLong.length}</span>
                <span className="stat-label">Tüketim Verisi</span>
                <span className="stat-sublabel">{consumptionDataLong.length > 0 ? `${Math.floor(consumptionDataLong.length / 24)} gün` : ''}</span>
              </div>
              <div className="freshness-stat">
                <span className="stat-value">{stats?.totalRecords || 0}</span>
                <span className="stat-label">Üretim Verisi</span>
                <span className="stat-sublabel">{stats?.totalRecords ? `${Math.floor(stats.totalRecords / 24)} gün` : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
        <div className="card highlight">
          <h3>⚡ Şu Anki Saatlik Üretim</h3>
          <p className="big-number">{summaryData?.currentHourTotal} <span className="unit">MWh</span></p>
        </div>
        <div className="card">
          <h3>📊 Seçilen Dönem Ortalama</h3>
          <p className="big-number">{getTimeRangeAverage()?.toFixed(1) || 'N/A'} <span className="unit">MWh</span></p>
        </div>
        <div className="card">
          <h3>📈 Seçilen Dönem Max</h3>
          <p className="big-number">{getTimeRangeMax()?.toFixed(1) || 'N/A'} <span className="unit">MWh</span></p>
        </div>
        <div className="card success">
          <h3>🌱 Yenilenebilir Oranı</h3>
          <p className="big-number">{getRenewablePercentage()?.toFixed(1) || 'N/A'}<span className="unit">%</span></p>
        </div>
      </div>

      {/* Time Range Selector with Manual Refresh */}
      <div className="time-range-selector">
        <div className="time-controls">
          <div className="time-range-group">
            <h3>Zaman Aralığı:</h3>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="6">Son 6 Saat</option>
              <option value="12">Son 12 Saat</option>
              <option value="24">Son 24 Saat</option>
              <option value="48">Son 2 Gün</option>
              <option value="72">Son 3 Gün</option>
              <option value="168">Son 1 Hafta</option>
              <option value="360">Son 15 Gün</option>
              <option value="720">Son 30 Gün</option>
            </select>
          </div>
          <div className="manual-controls">
            <button onClick={() => fetchData(false)} className="refresh-btn" disabled={loading}>
              {loading ? '🔄 Yükleniyor...' : '🔄 Verileri Yenile'}
            </button>
            <span className="data-info">
              Otomatik yenilenme kapalı - İstediğinizde manuel olarak yenileyebilirsiniz
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-container">
        <div className="chart-section">
          <div className="chart-header">
            <h3>
              Enerji Kaynak Dağılımı
              {sourceChartMode === 'current' ? ' (Güncel Saat)' : ` (${timeRange} Saat Ortalaması)`}
            </h3>
            <div className="chart-controls">
              <button
                onClick={() => setSourceChartMode('current')}
                className={`chart-mode-btn ${sourceChartMode === 'current' ? 'active' : ''}`}
              >
                Güncel
              </button>
              <button
                onClick={() => setSourceChartMode('timeRange')}
                className={`chart-mode-btn ${sourceChartMode === 'timeRange' ? 'active' : ''}`}
              >
                Zaman Aralığı
              </button>
            </div>
          </div>
          <div className="chart-wrapper">
            {getSourceChartData() && (
              <Doughnut
                data={getSourceChartData()!}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        <div className="chart-section">
          <h3>Saatlik Enerji Üretimi ({timeRange} Saat)</h3>
          <div className="chart-wrapper">
            {getHourlyChartData() && (
              <Bar
                data={getHourlyChartData()!}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Saatlik Enerji Üretimi',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        <div className="chart-section wide">
          <h3>Enerji Kaynakları Trend Analizi ({timeRange} Saat)</h3>
          <div className="chart-wrapper">
            {getHistoricalTrendData() && (
              <Line
                data={getHistoricalTrendData()!}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Enerji Kaynakları Trend Analizi',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                    x: {
                      display: false, // Hide x-axis labels for cleaner look
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        <div className="chart-section wide">
          <h3>Enerji Türleri Karşılaştırması: Yenilenebilir vs Fosil ({timeRange} Saat)</h3>
          <div className="chart-wrapper">
            {getSourceComparisonData() && (
              <Line
                data={getSourceComparisonData()!}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Enerji Kaynak Türleri Karşılaştırması',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      stacked: false,
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* NEW: Price and Consumption Section */}
        <div className="chart-section wide">
          <h3>💰 Elektrik Fiyatı (PTF) - Son {timeRange} Saat</h3>
          <PriceChart data={priceData} />
        </div>

        <div className="chart-section wide">
          <h3>⚡ Enerji Tüketimi - Son {timeRange} Saat</h3>
          <ConsumptionChart data={consumptionData} />
        </div>

        {/* Long-term Trends */}
        {priceDataLong.length > 0 && (
          <div className="chart-section wide">
            <h3>📈 Elektrik Fiyatı Uzun Dönem Trendi - {Math.floor(priceDataLong.length / 24)} Gün ({priceDataLong.length} saat)</h3>
            <div className="chart-wrapper" style={{ height: '400px' }}>
              <Line
                data={{
                  labels: priceDataLong.map((_, i) => i % 24 === 0 ? `Gün ${Math.floor(i / 24) + 1}` : ''),
                  datasets: [{
                    label: 'PTF (TL/MWh)',
                    data: priceDataLong.map(d => d.price),
                    borderColor: 'rgb(234, 88, 12)',
                    backgroundColor: 'rgba(234, 88, 12, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 2,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true },
                    title: {
                      display: true,
                      text: `${priceDataLong.length} saatlik veri (${Math.floor(priceDataLong.length / 24)} gün)`
                    }
                  },
                  scales: {
                    y: { beginAtZero: false },
                    x: { display: true, ticks: { maxRotation: 0 } }
                  }
                }}
              />
            </div>
          </div>
        )}

        {consumptionDataLong.length > 0 && (
          <div className="chart-section wide">
            <h3>📉 Enerji Tüketimi Uzun Dönem Trendi - {Math.floor(consumptionDataLong.length / 24)} Gün ({consumptionDataLong.length} saat)</h3>
            <div className="chart-wrapper" style={{ height: '400px' }}>
              <Line
                data={{
                  labels: consumptionDataLong.map((_, i) => i % 24 === 0 ? `Gün ${Math.floor(i / 24) + 1}` : ''),
                  datasets: [{
                    label: 'Tüketim (MW)',
                    data: consumptionDataLong.map(d => d.consumption),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 2,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true },
                    title: {
                      display: true,
                      text: `${consumptionDataLong.length} saatlik veri (${Math.floor(consumptionDataLong.length / 24)} gün)`
                    }
                  },
                  scales: {
                    y: { beginAtZero: true },
                    x: { display: true, ticks: { maxRotation: 0 } }
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Real-time Data Table */}
      <div className="data-table-section">
        <h3>Son 10 Saatlik Veri</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Saat</th>
                <th>Toplam</th>
                <th>Doğal Gaz</th>
                <th>Rüzgar</th>
                <th>Güneş</th>
                <th>Hidro</th>
                <th>Kömür</th>
              </tr>
            </thead>
            <tbody>
              {realtimeData.slice(-10).reverse().map((data, index) => (
                <tr key={index}>
                  <td>{data.hour}</td>
                  <td>{data.total}</td>
                  <td>{data.naturalGas}</td>
                  <td>{data.wind}</td>
                  <td>{data.sun}</td>
                  <td>{data.dammedHydro}</td>
                  <td>{data.importCoal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="last-update">
        <p>Son güncelleme: {new Date().toLocaleString('tr-TR')}</p>
        <button onClick={() => fetchData(false)} className="refresh-btn">🔄 Yenile</button>
        </div>
      </div>
    </div>
  );
};

export default EnergyDashboard;