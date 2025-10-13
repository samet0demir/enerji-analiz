# Railway Deployment Kılavuzu

Bu kılavuz projenin Railway'e deployment sürecini adım adım açıklar.

## 🏗️ Proje Yapısı

Projemiz 2 ayrı Railway servisi olarak deploy edilir:
1. **Backend** - Node.js/Express API
2. **Frontend** - React/Vite SPA

---

## 🚀 Backend Deployment (✅ Tamamlandı)

### Railway Projesi Bilgileri:
- **Service Name**: `backend`
- **Production URL**: `enerji-analiz-production.up.railway.app`
- **Runtime**: Node.js 18+
- **Database**: SQLite (local file)

### Environment Variables:
```bash
# EPİAŞ API Credentials
EPIAS_USERNAME=your_username
EPIAS_PASSWORD=your_password

# Node Environment
NODE_ENV=production
PORT=5001
```

### Build & Start Commands:
```bash
# Build Command
npm install && npm run build

# Start Command
npm start
```

### Önemli Dosyalar:
- [package.json](backend/package.json) - `"start": "node dist/index.js"`
- [tsconfig.json](backend/tsconfig.json) - TypeScript config
- `.env` - Environment variables (local)

---

## 🎨 Frontend Deployment (ŞİMDİ YAPILACAK)

### Adım 1: Railway'de Yeni Service Oluştur

1. Railway Dashboard'a git: https://railway.app
2. Projeye tıkla
3. **"+ New Service"** butonuna bas
4. **"GitHub Repo"** seç
5. Repository'i seç: `energy`
6. **Root Directory**: `frontend` olarak ayarla

### Adım 2: Environment Variables Ekle

Railway Dashboard'da service settings'e git ve şu variable'ı ekle:

```bash
VITE_API_URL=https://enerji-analiz-production.up.railway.app/api/v1
```

### Adım 3: Build Settings (Otomatik Algılanacak)

Railway otomatik olarak şu ayarları kullanacak:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

Port otomatik olarak Railway tarafından `$PORT` environment variable ile sağlanacak.

### Adım 4: Deploy Et

1. Settings'leri kaydet
2. Railway otomatik olarak deploy başlatacak
3. Deploy loglarını izle
4. Deploy başarılı olunca public URL'i kopyala

---

## 🔧 Manuel Deployment (Alternatif)

### Railway CLI ile:

```bash
# Railway CLI'yı yükle
npm install -g @railway/cli

# Railway'e login ol
railway login

# Backend için
cd backend
railway link
railway up

# Frontend için
cd frontend
railway link
railway up
```

---

## 📝 Post-Deployment Checklist

### Backend Kontrolü:
- [ ] Health endpoint çalışıyor: `/health`
- [ ] API endpoints erişilebilir: `/api/v1/energy/stats`
- [ ] EPİAŞ API connection başarılı
- [ ] Database migrations uygulandı
- [ ] Scheduler çalışıyor (saatlik veri toplama)
- [ ] Weather API çalışıyor

### Frontend Kontrolü:
- [ ] Site açılıyor
- [ ] Backend API'ye bağlanıyor
- [ ] Grafik render oluyor
- [ ] Real-time veri güncelleniyor
- [ ] Responsive design çalışıyor

---

## 🌐 Production URLs

Deployment sonrası URL'ler:

```bash
# Backend API
https://enerji-analiz-production.up.railway.app/health
https://enerji-analiz-production.up.railway.app/api/v1/test

# Frontend (Railway tarafından atanacak)
https://energy-frontend-production.up.railway.app
```

---

## 🔒 Güvenlik Ayarları

### Backend'de Aktif Güvenlik:
- ✅ CORS (sadece frontend domain'e izin ver)
- ✅ Rate Limiting (API abuse koruması)
- ✅ Helmet.js (security headers)
- ✅ Trust Proxy (Railway reverse proxy)
- ✅ Environment Variables (credentials gizli)

### Frontend'de:
- ✅ Environment variables (.env.production)
- ✅ API URL validation
- ✅ Error handling

---

## 🐛 Troubleshooting

### Problem: Backend 500 hatası veriyor

**Çözüm:**
```bash
# Railway loglarını kontrol et
railway logs

# Database migrations kontrol et
railway run npm run migrate

# Environment variables kontrol et
railway variables
```

### Problem: Frontend backend'e bağlanamıyor

**Çözüm:**
1. `VITE_API_URL` environment variable'ı kontrol et
2. Backend CORS ayarlarını kontrol et
3. Backend health endpoint test et: `curl https://enerji-analiz-production.up.railway.app/health`

### Problem: Scheduler çalışmıyor

**Çözüm:**
```bash
# Manuel tetikle
curl -X POST https://enerji-analiz-production.up.railway.app/api/v1/scheduler/trigger

# Durum kontrol et
curl https://enerji-analiz-production.up.railway.app/api/v1/scheduler/status
```

---

## 📊 Monitoring

### Railway Dashboard:
- CPU/Memory kullanımı
- Request logs
- Build logs
- Deploy history

### Custom Monitoring Endpoints:

```bash
# Health check
GET /health

# Scheduler status
GET /api/v1/scheduler/status

# Energy stats
GET /api/v1/energy/stats?hours=24

# Weather data
GET /api/v1/weather/latest?hours=24
```

---

## 🔄 Continuous Deployment

Railway otomatik olarak:
- ✅ GitHub push üzerine deploy yapar
- ✅ Build başarısız olursa rollback yapar
- ✅ Zero-downtime deployment sağlar
- ✅ Environment variables güvenli tutar

### Branch Strategy:
```bash
main branch → production deployment (otomatik)
```

---

## 💰 Railway Pricing

### Current Plan:
- **Hobby Plan**: $5/month per service
- Backend: ~$5/month
- Frontend: ~$5/month
- **Total**: ~$10/month

### Resource Limits:
- Memory: 512 MB - 8 GB (auto-scaling)
- CPU: Shared vCPU
- Network: Unlimited bandwidth
- Build time: 20 minutes max

---

## 🎯 Next Steps

1. ✅ Backend deployment tamamlandı
2. ⏳ Frontend deployment (ŞİMDİ)
3. ⏳ Custom domain bağla (optional)
4. ⏳ GitHub Actions CI/CD ekle
5. ⏳ Monitoring/alerting ekle

---

## 📚 Kaynaklar

- Railway Docs: https://docs.railway.app
- Railway Templates: https://railway.app/templates
- Railway Discord: https://discord.gg/railway
- Vite Deployment Guide: https://vitejs.dev/guide/static-deploy.html

---

## ✅ Deployment Komutu Özeti

```bash
# Backend (zaten çalışıyor)
cd backend
npm install
npm run build
npm start

# Frontend (şimdi yapılacak)
cd frontend
npm install
npm run build
npm start
```

---

**NOT**: Railway'e push yaptığınızda otomatik olarak deploy edilecek. Manuel komutlara gerek yok!
