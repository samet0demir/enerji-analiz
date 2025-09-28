interface EnergyData {
    date: string;
    hour: string;
    total: number;
    naturalGas: number;
    dammedHydro: number;
    lignite: number;
    river: number;
    importCoal: number;
    wind: number;
    sun: number;
    fuelOil: number;
    geothermal: number;
    asphaltiteCoal: number;
    blackCoal: number;
    biomass: number;
    naphta: number;
    lng: number;
    importExport: number;
    wasteHeat: number;
}
export declare const saveEnergyData: (data: EnergyData[]) => {
    inserted: number;
    updated: number;
};
export declare const getRecentEnergyData: (hours?: number) => EnergyData[];
export declare const getEnergyDataByDateRange: (startDate: string, endDate: string) => EnergyData[];
export declare const getEnergyStats: (hours?: number) => {
    totalRecords: number;
    dateRange: {
        earliest_date: string;
        latest_date: string;
    };
    timeRangeAvg: number;
    maxGeneration: number;
    minGeneration: number;
    renewablePercentage: number;
    peakHours: {
        hour: string;
        avg_generation: number;
    }[];
    sourceAverages: unknown;
    avgGeneration: unknown;
    hours: number;
};
export declare const logDataCollection: (status: string, recordsInserted: number, recordsUpdated: number, errorMessage?: string, executionTimeMs?: number) => void;
export {};
