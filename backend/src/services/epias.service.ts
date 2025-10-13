    // backend/src/services/epias.service.ts

import axios from 'axios';
import { URLSearchParams } from 'url';

// .env dosyasındaki değişkenleri kullanmak için process.env kullanılır.
// Bu dosyanın çalıştığı ana sunucu dosyasında (index.ts) dotenv.config() çağrılmış olmalı.

// Çalıştığını kanıtladığımız doğru URL'ler
const AUTH_URL = 'https://giris.epias.com.tr/cas/v1/tickets';
const DATA_URL = 'https://seffaflik.epias.com.tr/electricity-service/v1/dashboard/realtime-generation';

/**
 * EPİAŞ'tan kimlik doğrulaması için bir TGT (Ticket Granting Ticket) alır.
 * Bu fonksiyonu dışarıya export etmiyoruz çünkü sadece bu dosya içinde kullanılacak.
 */
const getTgtTicket = async (): Promise<string> => {
  const USERNAME = process.env.EPIAS_USERNAME;
  const PASSWORD = process.env.EPIAS_PASSWORD;


  if (!USERNAME || !PASSWORD) {
    console.error('EPIAS_USERNAME or EPIAS_PASSWORD is not defined in .env file.');
    throw new Error('Missing API credentials.');
  }

  const body = new URLSearchParams();
  body.append('username', USERNAME);
  body.append('password', PASSWORD);

  try {
    const response = await axios.post(AUTH_URL, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // EPİAŞ returns an object with { tgt: "...", created: "...", code: 201 }
    // We need to extract the actual TGT string
    if (typeof response.data === 'object' && response.data.tgt) {
      return response.data.tgt;
    }

    // Fallback: if it's already a string, return it
    if (typeof response.data === 'string') {
      return response.data;
    }

    throw new Error('Invalid TGT response format');
  } catch (error) {
    console.error('Error fetching TGT ticket:', error);
    throw new Error('Authentication failed.');
  }
};

/**
 * Gerçek zamanlı üretim verilerini TGT bileti kullanarak çeker.
 * Projenin diğer kısımları bu fonksiyonu çağırarak veriye ulaşacak.
 */
export const getRealTimeGeneration = async () => {
  try {
    const tgt = await getTgtTicket();

    const response = await axios.get(DATA_URL, {
      headers: {
        'TGT': tgt,
      },
    });

    return response.data.items; // Sadece "items" dizisini döndürerek temiz veri sağlıyoruz.

  } catch (error) {
    console.error('Error fetching real-time generation data:', error);
    throw new Error('Failed to fetch real-time generation data.');
  }
};

/**
 * EPİAŞ'tan geçmiş üretim verilerini çeker (gerçek veriler)
 * @param startDate YYYY-MM-DD formatında başlangıç tarihi
 * @param endDate YYYY-MM-DD formatında bitiş tarihi
 */
export const getHistoricalGeneration = async (startDate: string, endDate: string) => {
  try {
    const tgt = await getTgtTicket();

    // EPİAŞ historical data endpoint (saatlik üretim verileri)
    const HISTORICAL_URL = 'https://seffaflik.epias.com.tr/electricity-service/v1/generation/data/realtime-generation';

    const response = await axios.get(HISTORICAL_URL, {
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

  } catch (error) {
    console.error('Error fetching historical generation data:', error);
    throw new Error(`Failed to fetch historical data for ${startDate} to ${endDate}`);
  }
};

/**
 * EPİAŞ'tan PTF (Piyasa Takas Fiyatı) verilerini çeker
 * @param startDate YYYY-MM-DD formatında başlangıç tarihi
 * @param endDate YYYY-MM-DD formatında bitiş tarihi
 */
export const getPtfData = async (startDate: string, endDate: string) => {
  try {
    const tgt = await getTgtTicket();

    // EPİAŞ PTF (Market Clearing Price) endpoint - GET method with params
    const PTF_URL = 'https://seffaflik.epias.com.tr/electricity-service/v1/markets/dam/data/mcp';

    const response = await axios.get(PTF_URL, {
      headers: {
        'TGT': tgt
      },
      params: {
        startDate: startDate,
        endDate: endDate
      }
    });

    console.log(`💰 PTF data fetched: ${startDate} to ${endDate} - ${response.data.items?.length || 0} records`);
    return response.data.items || [];

  } catch (error: any) {
    console.error('Error fetching PTF data:', error.response?.data || error.message);
    throw new Error(`Failed to fetch PTF data for ${startDate} to ${endDate}`);
  }
};

/**
 * EPİAŞ'tan gerçek zamanlı tüketim verilerini çeker
 * @param startDate YYYY-MM-DD formatında başlangıç tarihi
 * @param endDate YYYY-MM-DD formatında bitiş tarihi
 */
export const getConsumptionData = async (startDate: string, endDate: string) => {
  try {
    const tgt = await getTgtTicket();

    // EPİAŞ Consumption endpoint - GET method with params
    const CONSUMPTION_URL = 'https://seffaflik.epias.com.tr/electricity-service/v1/consumption/data/realtime-consumption';

    const response = await axios.get(CONSUMPTION_URL, {
      headers: {
        'TGT': tgt
      },
      params: {
        startDate: startDate,
        endDate: endDate
      }
    });

    console.log(`⚡ Consumption data fetched: ${startDate} to ${endDate} - ${response.data.items?.length || 0} records`);
    return response.data.items || [];

  } catch (error: any) {
    console.error('Error fetching consumption data:', error.response?.data || error.message);
    throw new Error(`Failed to fetch consumption data for ${startDate} to ${endDate}`);
  }
};