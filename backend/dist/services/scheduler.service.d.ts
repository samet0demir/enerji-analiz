export declare const startDataCollection: () => any;
export declare const startScheduler: () => void;
export declare const stopScheduler: () => void;
export declare const getSchedulerStatus: () => {
    isRunning: any;
    nextRun: string;
};
export declare const triggerDataCollection: () => Promise<{
    success: boolean;
    inserted: number;
    updated: number;
    executionTime: number;
}>;
export declare const cleanup: () => void;
