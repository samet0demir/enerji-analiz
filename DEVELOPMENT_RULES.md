# GELİŞTİRME KURALLARI / DEVELOPMENT RULES

## ❌ ASLA YAPILMAYACAKLAR

### 1. Test Verisi Oluşturma
- **ASLA** kullanıcıya sormadan test verisi oluşturulmayacak
- **ASLA** yapay/sahte veri üretilmeyecek
- **SADECE** gerçek EPİAŞ API'sinden gelen veriler kullanılacak
- Veritabanına sadece gerçek API çağrılarından elde edilen veriler kaydedilecek

### 2. Veri Manipülasyonu
- Mevcut gerçek veriler değiştirilmeyecek
- Geçmiş veriler üzerinde değişiklik yapılmayacak
- API'den gelen orijinal veriler korunacak

## ✅ YAPILMASI GEREKENLER

### 1. Veri Toplama
- Sadece EPİAŞ API'sinden gerçek veriler çekilecek
- 15 dakikada bir otomatik veri toplama yapılacak
- API hatalarında veri üretmek yerine hata logu tutulacak

### 2. Test Durumları
- Eğer test verisi gerekirse kullanıcıdan açık izin alınacak
- Test verileri geçici olacak ve işlem sonrası silinecek
- Üretim ortamında sadece gerçek veriler kullanılacak

### 3. Kod Değişiklikleri
- Kullanıcıya sormadan büyük değişiklikler yapılmayacak
- Veri silme/temizleme işlemleri için kullanıcı onayı alınacak
- Otomatik işlemler kullanıcı deneyimini bozmayacak şekilde ayarlanacak

## 📋 PROJE YÖNETİMİ

### 1. Veri Politikası
- Bu proje gerçek Türkiye enerji verilerini analiz eder
- Tüm veriler EPİAŞ (Enerji Piyasaları İşletme A.Ş.) API'sinden gelir
- Veri bütünlüğü ve gerçekliği en önemli önceliktir

### 2. Kullanıcı Deneyimi
- Otomatik yenilenme minimum seviyede tutulacak
- Kullanıcı etkileşimi sırasında sayfayı yenileyen işlemler engellenecek
- Manual kontrol seçenekleri sunulacak

Bu kurallar her zaman geçerlidir ve istisna kabul etmez.