/**
 * Gerçek zamanlı üretim verilerini TGT bileti kullanarak çeker.
 * Projenin diğer kısımları bu fonksiyonu çağırarak veriye ulaşacak.
 */
export declare const getRealTimeGeneration: () => Promise<any>;
/**
 * EPİAŞ'tan geçmiş üretim verilerini çeker (gerçek veriler)
 * @param startDate YYYY-MM-DD formatında başlangıç tarihi
 * @param endDate YYYY-MM-DD formatında bitiş tarihi
 */
export declare const getHistoricalGeneration: (startDate: string, endDate: string) => Promise<any>;
