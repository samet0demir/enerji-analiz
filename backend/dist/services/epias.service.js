"use strict";
// backend/src/services/epias.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistoricalGeneration = exports.getRealTimeGeneration = void 0;
const axios_1 = __importDefault(require("axios"));
const url_1 = require("url");
// .env dosyasındaki değişkenleri kullanmak için process.env kullanılır.
// Bu dosyanın çalıştığı ana sunucu dosyasında (index.ts) dotenv.config() çağrılmış olmalı.
// Çalıştığını kanıtladığımız doğru URL'ler
const AUTH_URL = 'https://giris.epias.com.tr/cas/v1/tickets';
const DATA_URL = 'https://seffaflik.epias.com.tr/electricity-service/v1/dashboard/realtime-generation';
/**
 * EPİAŞ'tan kimlik doğrulaması için bir TGT (Ticket Granting Ticket) alır.
 * Bu fonksiyonu dışarıya export etmiyoruz çünkü sadece bu dosya içinde kullanılacak.
 */
const getTgtTicket = async () => {
    const USERNAME = process.env.EPIAS_USERNAME;
    const PASSWORD = process.env.EPIAS_PASSWORD;
    if (!USERNAME || !PASSWORD) {
        console.error('EPIAS_USERNAME or EPIAS_PASSWORD is not defined in .env file.');
        throw new Error('Missing API credentials.');
    }
    const body = new url_1.URLSearchParams();
    body.append('username', USERNAME);
    body.append('password', PASSWORD);
    try {
        const response = await axios_1.default.post(AUTH_URL, body, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching TGT ticket:', error);
        throw new Error('Authentication failed.');
    }
};
/**
 * Gerçek zamanlı üretim verilerini TGT bileti kullanarak çeker.
 * Projenin diğer kısımları bu fonksiyonu çağırarak veriye ulaşacak.
 */
const getRealTimeGeneration = async () => {
    try {
        const tgt = await getTgtTicket();
        const response = await axios_1.default.get(DATA_URL, {
            headers: {
                'TGT': tgt,
            },
        });
        return response.data.items; // Sadece "items" dizisini döndürerek temiz veri sağlıyoruz.
    }
    catch (error) {
        console.error('Error fetching real-time generation data:', error);
        throw new Error('Failed to fetch real-time generation data.');
    }
};
exports.getRealTimeGeneration = getRealTimeGeneration;
/**
 * EPİAŞ'tan geçmiş üretim verilerini çeker (gerçek veriler)
 * @param startDate YYYY-MM-DD formatında başlangıç tarihi
 * @param endDate YYYY-MM-DD formatında bitiş tarihi
 */
const getHistoricalGeneration = async (startDate, endDate) => {
    try {
        const tgt = await getTgtTicket();
        // EPİAŞ historical data endpoint (saatlik üretim verileri)
        const HISTORICAL_URL = 'https://seffaflik.epias.com.tr/electricity-service/v1/generation/data/realtime-generation';
        const response = await axios_1.default.get(HISTORICAL_URL, {
            headers: {
                'TGT': tgt,
            },
            params: {
                startDate: startDate,
                endDate: endDate
            }
        });
        console.log(`📊 Historical data fetched: ${startDate} to ${endDate}`);
        return response.data.items || [];
    }
    catch (error) {
        console.error('Error fetching historical generation data:', error);
        throw new Error(`Failed to fetch historical data for ${startDate} to ${endDate}`);
    }
};
exports.getHistoricalGeneration = getHistoricalGeneration;
//# sourceMappingURL=epias.service.js.map