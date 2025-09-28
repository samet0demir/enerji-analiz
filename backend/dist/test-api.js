"use strict";
// backend/src/test-api.ts - DOĞRU SIRALAMA İLE GÜNCELLENDİ
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ÖNCE .env dosyasını oku
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// SONRA .env'i okuduğumuzdan emin olunca, .env'e ihtiyaç duyan dosyayı import et
const epias_service_1 = require("./services/epias.service");
console.log('--- epias.service.ts Testi Başlatılıyor ---');
const testService = async () => {
    try {
        const data = await (0, epias_service_1.getRealTimeGeneration)();
        console.log('--- BAŞARILI! Servis dosyasından veri alındı: ---');
        console.log(data[0]);
        console.log(`...ve ${data.length - 1} adet daha veri objesi.`);
    }
    catch (error) {
        console.error('--- TEST BAŞARISIZ ---');
        console.error(error);
    }
};
// Testi çalıştır
testService();
//# sourceMappingURL=test-api.js.map