import React from 'react';
import { Line } from 'react-chartjs-2';

interface PriceData {
  date: string;
  hour: string;
  price: number;
  priceUsd: number;
  priceEur: number;
}

interface PriceChartProps {
  data: PriceData[];
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>💰 Fiyat verileri yükleniyor...</p>
      </div>
    );
  }

  // Son 24 saatlik veriler (ters sırada geliyorsa düzelt)
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  const chartData = {
    labels: sortedData.map(d => d.hour),
    datasets: [
      {
        label: 'PTF (TL/MWh)',
        data: sortedData.map(d => d.price),
        borderColor: 'rgb(234, 88, 12)',
        backgroundColor: 'rgba(234, 88, 12, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'PTF (USD/MWh)',
        data: sortedData.map(d => d.priceUsd),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
            weight: '500' as const,
          },
          padding: 15,
          usePointStyle: true,
        },
      },
      title: {
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
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const currency = label.includes('TL') ? 'TL' : 'USD';
            return `${label}: ${value.toFixed(2)} ${currency}/MWh`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
          callback: function(value: any) {
            return value.toFixed(0);
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
  const avgPrice = sortedData.reduce((sum, d) => sum + d.price, 0) / sortedData.length;
  const maxPrice = Math.max(...sortedData.map(d => d.price));
  const minPrice = Math.min(...sortedData.map(d => d.price));
  const latestPrice = sortedData[sortedData.length - 1];

  return (
    <div className="price-chart-container">
      <div className="price-stats">
        <div className="price-stat-card current">
          <span className="stat-label">Güncel Fiyat</span>
          <span className="stat-value">{latestPrice.price.toFixed(2)} <span className="unit">TL/MWh</span></span>
          <span className="stat-sublabel">{latestPrice.hour}</span>
        </div>
        <div className="price-stat-card">
          <span className="stat-label">Ortalama</span>
          <span className="stat-value">{avgPrice.toFixed(2)} <span className="unit">TL</span></span>
        </div>
        <div className="price-stat-card">
          <span className="stat-label">En Yüksek</span>
          <span className="stat-value high">{maxPrice.toFixed(2)} <span className="unit">TL</span></span>
        </div>
        <div className="price-stat-card">
          <span className="stat-label">En Düşük</span>
          <span className="stat-value low">{minPrice.toFixed(2)} <span className="unit">TL</span></span>
        </div>
      </div>

      <div className="chart-wrapper" style={{ height: '350px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default PriceChart;
