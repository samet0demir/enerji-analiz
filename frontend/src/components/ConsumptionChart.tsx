import React from 'react';
import { Bar } from 'react-chartjs-2';

interface ConsumptionData {
  date: string;
  hour: string;
  consumption: number;
}

interface ConsumptionChartProps {
  data: ConsumptionData[];
}

const ConsumptionChart: React.FC<ConsumptionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>⚡ Tüketim verileri yükleniyor...</p>
      </div>
    );
  }

  // Son 24 saatlik veriler
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  const chartData = {
    labels: sortedData.map(d => d.hour),
    datasets: [
      {
        label: 'Tüketim (MW)',
        data: sortedData.map(d => d.consumption),
        backgroundColor: sortedData.map(d => {
          // Peak hours (18:00-22:00) farklı renk
          const hour = parseInt(d.hour.split(':')[0]);
          return hour >= 18 && hour <= 22
            ? 'rgba(239, 68, 68, 0.7)'
            : 'rgba(59, 130, 246, 0.7)';
        }),
        borderColor: sortedData.map(d => {
          const hour = parseInt(d.hour.split(':')[0]);
          return hour >= 18 && hour <= 22
            ? 'rgb(239, 68, 68)'
            : 'rgb(59, 130, 246)';
        }),
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context: any) {
            return `Tüketim: ${context.parsed.y.toFixed(2)} MW`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
          callback: function(value: any) {
            return value.toLocaleString();
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 10,
          },
          maxRotation: 45,
          minRotation: 45,
        }
      },
    },
  };

  // İstatistikler
  const avgConsumption = sortedData.reduce((sum, d) => sum + d.consumption, 0) / sortedData.length;
  const maxConsumption = Math.max(...sortedData.map(d => d.consumption));
  const minConsumption = Math.min(...sortedData.map(d => d.consumption));
  const latestConsumption = sortedData[sortedData.length - 1];

  // Peak hours consumption (18:00-22:00)
  const peakData = sortedData.filter(d => {
    const hour = parseInt(d.hour.split(':')[0]);
    return hour >= 18 && hour <= 22;
  });
  const peakAvg = peakData.length > 0
    ? peakData.reduce((sum, d) => sum + d.consumption, 0) / peakData.length
    : 0;

  return (
    <div className="consumption-chart-container">
      <div className="consumption-stats">
        <div className="consumption-stat-card current">
          <span className="stat-label">Güncel Tüketim</span>
          <span className="stat-value">{latestConsumption.consumption.toFixed(0)} <span className="unit">MW</span></span>
          <span className="stat-sublabel">{latestConsumption.hour}</span>
        </div>
        <div className="consumption-stat-card">
          <span className="stat-label">Ortalama</span>
          <span className="stat-value">{avgConsumption.toFixed(0)} <span className="unit">MW</span></span>
        </div>
        <div className="consumption-stat-card">
          <span className="stat-label">Peak Saat Ort.</span>
          <span className="stat-value high">{peakAvg.toFixed(0)} <span className="unit">MW</span></span>
          <span className="stat-sublabel">18:00-22:00</span>
        </div>
        <div className="consumption-stat-card">
          <span className="stat-label">En Düşük</span>
          <span className="stat-value low">{minConsumption.toFixed(0)} <span className="unit">MW</span></span>
        </div>
      </div>

      <div className="chart-wrapper" style={{ height: '350px' }}>
        <Bar data={chartData} options={options} />
      </div>

      <div className="consumption-legend">
        <span className="legend-item">
          <span className="legend-color" style={{ backgroundColor: 'rgb(59, 130, 246)' }}></span>
          Normal Saatler
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ backgroundColor: 'rgb(239, 68, 68)' }}></span>
          Peak Saatler (18:00-22:00)
        </span>
      </div>
    </div>
  );
};

export default ConsumptionChart;
