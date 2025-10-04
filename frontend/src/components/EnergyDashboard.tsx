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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('24');
  const [sourceChartMode, setSourceChartMode] = useState<'current' | 'timeRange'>('current');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://enerji-analiz-production.up.railway.app/api/v1';

  const fetchData = useCallback(async (isTimeRangeChange = false) => {
    // Debounce for time range changes to prevent spam
    if (isTimeRangeChange) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    try {
      setLoading(true);
      const [realtimeResponse, summaryResponse, historyResponse, statsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/energy/realtime`),
        axios.get(`${API_BASE_URL}/energy/summary?hours=${timeRange}`),
        axios.get(`${API_BASE_URL}/energy/history?hours=${timeRange}`),
        axios.get(`${API_BASE_URL}/energy/stats?hours=${timeRange}`)
      ]);

      setRealtimeData(realtimeResponse.data.data);
      setSummaryData(summaryResponse.data.summary);
      // Historical data'yı ters çevir - en eski solda, en yeni sağda olsun
      setHistoricalData(historyResponse.data.data.reverse());
      setStats(statsResponse.data.stats);
      setError(null);
    } catch (error: unknown) {
      setError('Veri yüklenirken hata oluştu: ' + (error instanceof Error ? error.message : String(error)));
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

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
        {/* Summary Cards */}
        <div className="summary-cards">
        <div className="card">
          <h3>Şu Anki Saatlik Üretim</h3>
          <p className="big-number">{summaryData?.currentHourTotal} MWh</p>
        </div>
        <div className="card">
          <h3>Seçilen Dönem Ortalama</h3>
          <p className="big-number">{getTimeRangeAverage()?.toFixed(1) || 'N/A'} MWh</p>
        </div>
        <div className="card">
          <h3>Seçilen Dönem Max</h3>
          <p className="big-number">{getTimeRangeMax()?.toFixed(1) || 'N/A'} MWh</p>
        </div>
        <div className="card">
          <h3>Yenilenebilir Oranı</h3>
          <p className="big-number">{getRenewablePercentage()?.toFixed(1) || 'N/A'}%</p>
        </div>
        <div className="card">
          <h3>Son Güncelleme</h3>
          <p className="big-number">{summaryData?.latestHour}</p>
        </div>
        <div className="card">
          <h3>Toplam Kayıt</h3>
          <p className="big-number">{stats?.totalRecords || summaryData?.dataPoints}</p>
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