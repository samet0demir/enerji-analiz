import React from 'react';

interface WeatherData {
  date: string;
  hour: string;
  temperature: number;
  windspeed: number;
  winddirection: number;
  direct_radiation: number;
  precipitation: number;
  cloudcover: number;
  humidity: number;
  city: string;
}

interface WeatherWidgetProps {
  data: WeatherData[];
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="weather-widget placeholder">
        <p>🌤️ Hava durumu yükleniyor...</p>
      </div>
    );
  }

  // En güncel veri
  const latest = data[0];

  // Son 24 saat ortalama
  const avgTemp = data.reduce((sum, d) => sum + d.temperature, 0) / data.length;
  const avgWind = data.reduce((sum, d) => sum + d.windspeed, 0) / data.length;
  const avgRadiation = data.reduce((sum, d) => sum + d.direct_radiation, 0) / data.length;

  // Rüzgar yönü açıklaması
  const getWindDirection = (degrees: number): string => {
    const directions = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  // Hava durumu ikonu
  const getWeatherIcon = () => {
    if (latest.precipitation > 0) return '🌧️';
    if (latest.cloudcover > 70) return '☁️';
    if (latest.cloudcover > 30) return '⛅';
    if (latest.direct_radiation > 300) return '☀️';
    return '🌤️';
  };

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <div className="weather-title">
          <span className="weather-icon-big">{getWeatherIcon()}</span>
          <div>
            <h3>{latest.city}</h3>
            <p className="weather-time">{latest.hour}</p>
          </div>
        </div>
        <div className="weather-temp-main">
          <span className="temp-value">{latest.temperature.toFixed(1)}</span>
          <span className="temp-unit">°C</span>
        </div>
      </div>

      <div className="weather-details">
        <div className="weather-detail-item">
          <span className="detail-icon">💨</span>
          <div className="detail-content">
            <span className="detail-label">Rüzgar</span>
            <span className="detail-value">{latest.windspeed.toFixed(1)} km/h {getWindDirection(latest.winddirection)}</span>
          </div>
        </div>

        <div className="weather-detail-item">
          <span className="detail-icon">☀️</span>
          <div className="detail-content">
            <span className="detail-label">Güneş Işınımı</span>
            <span className="detail-value">{latest.direct_radiation.toFixed(0)} W/m²</span>
          </div>
        </div>

        <div className="weather-detail-item">
          <span className="detail-icon">💧</span>
          <div className="detail-content">
            <span className="detail-label">Nem</span>
            <span className="detail-value">{latest.humidity}%</span>
          </div>
        </div>

        <div className="weather-detail-item">
          <span className="detail-icon">☁️</span>
          <div className="detail-content">
            <span className="detail-label">Bulutluluk</span>
            <span className="detail-value">{latest.cloudcover}%</span>
          </div>
        </div>

        {latest.precipitation > 0 && (
          <div className="weather-detail-item">
            <span className="detail-icon">🌧️</span>
            <div className="detail-content">
              <span className="detail-label">Yağış</span>
              <span className="detail-value">{latest.precipitation} mm</span>
            </div>
          </div>
        )}
      </div>

      <div className="weather-averages">
        <div className="weather-avg-item">
          <span className="avg-label">24s Ort. Sıcaklık</span>
          <span className="avg-value">{avgTemp.toFixed(1)}°C</span>
        </div>
        <div className="weather-avg-item">
          <span className="avg-label">24s Ort. Rüzgar</span>
          <span className="avg-value">{avgWind.toFixed(1)} km/h</span>
        </div>
        <div className="weather-avg-item">
          <span className="avg-label">24s Ort. Işınım</span>
          <span className="avg-value">{avgRadiation.toFixed(0)} W/m²</span>
        </div>
      </div>

      <div className="weather-correlation-hint">
        <p>💡 <strong>Enerji İlişkisi:</strong> Yüksek güneş ışınımı güneş enerjisi üretimini, rüzgar hızı rüzgar enerjisi üretimini etkiler.</p>
      </div>
    </div>
  );
};

export default WeatherWidget;
