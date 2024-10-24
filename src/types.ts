// Type for response data from DefiLlama API
interface TVLResponse {
    currentChainTvls: { [chain: string]: number };
}

interface VolumeResponse {
    total24h: number;
    total48hto24h: number;
    total7d: number;
    totalAllTime: number;
}

// Type for the breakdown of daily volume per chain
interface DailyVolumeBreakdown {
    [chain: string]: { Raindex: number };
}

// Type for response data from DeFiLlama API for daily volume
interface DailyVolumeResponse {
    totalDataChartBreakdown: [number, { [chain: string]: DailyVolumeBreakdown }][];
    name: string;
}

export type {
    TVLResponse,
    VolumeResponse,
    DailyVolumeBreakdown,
    DailyVolumeResponse
};