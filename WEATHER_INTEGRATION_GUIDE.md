# Hava Durumu Entegrasyonu Kılavuzu

## Genel Bakış

Bu proje artık **Open-Meteo API** kullanarak İstanbul için gerçek zamanlı hava durumu verilerini topluyor. Hava durumu verileri enerji üretim verilerini ile ilişkilendirilerek analiz edilebilir.

## 🌤️ Özellikler

### Toplanan Hava Durumu Verileri:
- **Sıcaklık** (°C) - 2 metre yükseklikte
- **Rüzgar Hızı** (km/h) - 10 metre yükseklikte
- **Rüzgar Yönü** (derece) - 0-360°
- **Doğrudan Güneş Işınımı** (W/m²) - Güneş panelleri için önemli
- **Yağış** (mm)
- **Bulut Kaplama** (%) - 0-100%
- **Nem** (%) - Bağıl nem

### Veri Kaynağı:
- **API**: Open-Meteo (https://open-meteo.com)
- **API Key Gereksinimi**: Yok (ücretsiz, açık kaynak)
- **Güncelleme Sıklığı**: Saatlik
- **Lokasyon**: İstanbul (41.01°N, 28.94°E)

## 📊 API Endpoints

### 1. Hava Durumu Verilerini Getir

```bash
GET /api/v1/weather/latest?hours=24&city=Istanbul
```

**Query Parametreleri:**
- `hours` (optional): Kaç saatlik veri getirileceği (default: 24)
- `city` (optional): Şehir adı (şu an sadece Istanbul destekleniyor)

**Örnek Response:**
```json
{
  "success": true,
  "timestamp": "2025-10-12T22:00:00.000Z",
  "city": "Istanbul",
  "count": 24,
  "data": [
    {
      "date": "2025-10-12T00:00:00+03:00",
      "hour": "00:00",
      "temperature": 14.8,
      "windspeed": 1.9,
      "winddirection": 338,
      "direct_radiation": 0,
      "precipitation": 0,
      "cloudcover": 43,
      "humidity": 79,
      "city": "Istanbul",
      "latitude": 41.01,
      "longitude": 28.94
    }
  ]
}
```

## 🔄 Otomatik Veri Toplama

Hava durumu verileri **her 1 saatte bir** otomatik olarak toplanır ve database'e kaydedilir.

### Scheduler Yapılandırması:

Scheduler aşağıdaki verileri sırayla toplar:
1. **Enerji Üretim Verisi** (EPİAŞ API)
2. **PTF/Fiyat Verisi** (EPİAŞ API) - şu an çalışmıyor
3. **Tüketim Verisi** (EPİAŞ API) - şu an çalışmıyor
4. **Hava Durumu Verisi** (Open-Meteo API) ✅

### Scheduler'ı Kontrol Etme:

```bash
# Durum kontrolü
GET /api/v1/scheduler/status

# Manuel tetikleme
POST /api/v1/scheduler/trigger

# Durdurma
POST /api/v1/scheduler/stop

# Başlatma
POST /api/v1/scheduler/start
```

## 💾 Database Yapısı

### Weather Data Tablosu:

```sql
CREATE TABLE weather_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                  -- YYYY-MM-DDTHH:mm:ss+03:00 formatı
  hour TEXT NOT NULL,                  -- HH:mm formatı (ör: "14:00")
  temperature REAL NOT NULL,           -- Sıcaklık (°C)
  windspeed REAL DEFAULT 0,            -- Rüzgar hızı (km/h)
  winddirection REAL DEFAULT 0,        -- Rüzgar yönü (derece)
  direct_radiation REAL DEFAULT 0,     -- Güneş ışınımı (W/m²)
  precipitation REAL DEFAULT 0,        -- Yağış (mm)
  cloudcover REAL DEFAULT 0,           -- Bulut kaplama (%)
  humidity REAL DEFAULT 0,             -- Nem (%)
  city TEXT DEFAULT 'Istanbul',        -- Şehir
  latitude REAL DEFAULT 41.01,         -- Enlem
  longitude REAL DEFAULT 28.94,        -- Boylam
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 📈 Analiz İmkanları

### Enerji ve Hava Durumu İlişkileri:

1. **Güneş Enerjisi vs. Güneş Işınımı**
   - `direct_radiation` değeri ile `sun` (güneş enerjisi üretimi) karşılaştırması
   - Bulut kaplama oranı etkisi

2. **Rüzgar Enerjisi vs. Rüzgar Hızı**
   - `windspeed` değeri ile `wind` (rüzgar enerjisi üretimi) korelasyonu
   - Rüzgar yönü analizi

3. **Sıcaklık vs. Enerji Tüketimi**
   - Yüksek/düşük sıcaklıklarda klima/ısıtma kullanımı
   - Tüketim patternleri

4. **Hidroelektrik vs. Yağış**
   - Yağış miktarı ile hidroelektrik üretimi ilişkisi
   - Baraj doluluk oranları (gelecekte eklenebilir)

## 🔧 Manuel Veri Toplama

### Geçmiş Hava Durumu Verilerini Toplamak:

```bash
cd backend
npm run backfill:weather
```

Bu script [backfill-weather.ts](backend/src/scripts/backfill-weather.ts) dosyasını çalıştırır ve geçmiş hava durumu verilerini toplar.

**Konfigürasyon:**
- Varsayılan tarih aralığı: Son 90 gün
- Chunk boyutu: 30 gün
- API gecikme: 2 saniye

### Test Script'i:

```bash
cd backend
npx ts-node src/scripts/check-weather-data.ts
```

Bu script database'deki hava durumu verilerinin durumunu gösterir.

## 🌍 Gelecek Geliştirmeler

### Çoklu Şehir Desteği:
```typescript
// Diğer şehirler için koordinatlar eklenebilir
const CITIES = {
  'Istanbul': { lat: 41.01, lon: 28.94 },
  'Ankara': { lat: 39.93, lon: 32.85 },
  'Izmir': { lat: 38.42, lon: 27.14 }
};
```

### Ek Hava Durumu Parametreleri:
- UV index
- Visibility (görüş mesafesi)
- Pressure (basınç)
- Dew point (çiy noktası)

### Tahmin Verileri:
- 7 günlük hava tahmini
- Enerji üretim tahmini

## 🚨 Önemli Notlar

1. **API Limitleri**: Open-Meteo API ücretsiz kullanımda sınırlaması yoktur, ancak makul kullanım beklenir.

2. **Veri Gecikmesi**: Hava durumu verileri neredeyse gerçek zamanlıdır (1-2 saat gecikme).

3. **Veri Bütünlüğü**: Her saat için bir kayıt saklanır. Eksik veriler `0` olarak kaydedilir.

4. **Koordinatlar**: İstanbul için merkez koordinatlar kullanılır (41.01°N, 28.94°E - Avrupa yakası).

## 📞 API Dokümantasyonu

Daha fazla bilgi için Open-Meteo API dokümantasyonuna bakın:
- https://open-meteo.com/en/docs
- https://archive-api.open-meteo.com/v1/archive (geçmiş veriler)
- https://api.open-meteo.com/v1/forecast (tahmin verileri)

## ✅ Entegrasyon Tamamlandı

- [x] Weather service oluşturuldu
- [x] Database migration eklendi
- [x] Scheduler'a entegre edildi
- [x] API endpoint'leri eklendi
- [x] Test script'leri yazıldı
- [x] Backfill script'i oluşturuldu
- [ ] Frontend'e hava durumu widget'ı (gelecek)
- [ ] Hava-enerji korelasyon grafikleri (gelecek)

## 🎯 Sonuç

Hava durumu verileri başarıyla entegre edildi ve her saat otomatik olarak toplanıyor. Bu veriler, enerji üretim patternlerini anlamak ve tahminlerde bulunmak için kullanılabilir.
