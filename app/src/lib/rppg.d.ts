export interface PulseSample { t: number; r: number; g: number; b: number }
export function estimate(samples: PulseSample[]): { bpm: number; quality: number; fps: number; signal: number[] } | null;
