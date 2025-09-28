// backend/src/test-api.ts - DOĞRU SIRALAMA İLE GÜNCELLENDİ

// ÖNCE .env dosyasını oku
import dotenv from 'dotenv';
dotenv.config();

// SONRA .env'i okuduğumuzdan emin olunca, .env'e ihtiyaç duyan dosyayı import et
import { getRealTimeGeneration } from './services/epias.service';

console.log('--- epias.service.ts Testi Başlatılıyor ---');

const testService = async () => {
  try {
    const data = await getRealTimeGeneration();
    console.log('--- BAŞARILI! Servis dosyasından veri alındı: ---');
    console.log(data[0]);
    console.log(`...ve ${data.length - 1} adet daha veri objesi.`);
  } catch (error) {
    console.error('--- TEST BAŞARISIZ ---');
    console.error(error);
  }
};

// Testi çalıştır
testService();