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
    return response.data;
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