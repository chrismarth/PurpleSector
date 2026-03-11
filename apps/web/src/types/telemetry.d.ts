import type { TelemetryFrame as CoreTelemetryFrame } from '@purplesector/core';
import type { LapSuggestion as BaseLapSuggestion } from '@purplesector/lap-analysis-base';
export type TelemetryFrame = CoreTelemetryFrame;
export interface LapData {
    lapNumber: number;
    lapTime: number | null;
    frames: TelemetryFrame[];
}
export interface TelemetrySource {
    id: string;
    name: string;
    type: 'live' | 'demo';
    status: 'connected' | 'disconnected' | 'error';
}
export interface SessionStatus {
    id: string;
    name: string;
    source: TelemetrySource;
    status: 'active' | 'paused' | 'archived';
    currentLap: number;
    totalLaps: number;
    createdAt: Date;
}
export type LapSuggestion = BaseLapSuggestion;
export interface AnalyzedLap {
    id: string;
    sessionId: string;
    lapNumber: number;
    lapTime: number;
    telemetryData: LapData;
    analyzed: boolean;
    suggestions: LapSuggestion[];
    createdAt: Date;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
}
//# sourceMappingURL=telemetry.d.ts.map